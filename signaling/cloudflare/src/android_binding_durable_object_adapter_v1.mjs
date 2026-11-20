/* Durable Object adapter for Android binding ledger V1.
 * Exported as a factory so the adapter contract can be unit-tested in Node.
 * No Worker route, namespace binding, migration, or deployment is added here.
 */
import ledger from "./android_binding_ledger_core_v1.cjs";
import cryptoChecks from "./android_binding_crypto_v1.cjs";

const ORIGIN = cryptoChecks.ORIGIN;
const FP = /^[0-9a-f]{64}$/;
const REVOCATION_NONCE = /^[A-Za-z0-9_-]{32}$/;
const rejection = error => ({status:"rejected", code: typeof error?.message === "string" ? error.message : "BINDING_OPERATION_FAILED", ...(Number.isSafeInteger(error?.retryAfterEpochSeconds) ? {retryAfterEpochSeconds:error.retryAfterEpochSeconds} : {})});

export function createAndroidBindingLedgerClass(DurableObjectBase) {
  return class AndroidBindingLedgerV1 extends DurableObjectBase {
    constructor(ctx, env) {
      super(ctx, env);
      this.ctx = ctx;
      this.env = env;
    }

    storageAdapter() {
      return {
        get: key => this.ctx.storage.get(key),
        transaction: fn => this.ctx.storage.transaction(tx => fn(tx))
      };
    }

    async verifiedOwner(input) {
      if (!input || input.origin !== ORIGIN) throw new Error("OWNER_ORIGIN_REQUIRED");
      const identity = await cryptoChecks.verifyPermanentOwnerProof({
        origin: input.origin,
        ownerSpkiBase64Url: input.ownerSpkiBase64Url,
        ownerFingerprint: input.ownerFingerprint,
        permanentProofBase64Url: input.permanentProofBase64Url
      });
      return identity;
    }

    // RPC method only; it is not reachable over HTTP until a separately
    // reviewed Worker route and namespace binding are deliberately added.
    async issueChallenge(input) {
      try {
        const owner = await this.verifiedOwner(input);
        const challenge = await ledger.issueChallenge({
          storage: this.storageAdapter(),
          ownerFingerprint: owner.ownerFingerprint,
          androidPublicKeySpkiBase64Url: input.androidPublicKeySpkiBase64Url,
          androidFingerprint: input.androidFingerprint,
          nowEpochSeconds: Math.floor(Date.now() / 1000)
        });
        return Object.freeze({status:"issued", ...challenge});
      } catch (error) {
        return rejection(error);
      }
    }

    async consumeApproval(input) {
      try {
        const owner = await this.verifiedOwner(input);
        if (input.request?.ownerFingerprint !== owner.ownerFingerprint)
          throw new Error("OWNER_REQUEST_MISMATCH");
        return await ledger.consumeApproval({
          storage: this.storageAdapter(),
          request: input.request,
          signatureBase64Url: input.signatureBase64Url,
          nowEpochSeconds: Math.floor(Date.now() / 1000),
          verifyOwnerApproval: async ({canonical}) =>
            cryptoChecks.verifyOwnerApprovalBundle({
              origin: ORIGIN,
              ownerSpkiBase64Url: input.ownerSpkiBase64Url,
              ownerFingerprint: owner.ownerFingerprint,
              permanentProofBase64Url: input.permanentProofBase64Url,
              canonicalRequest: canonical,
              signatureBase64Url: input.signatureBase64Url
            })
        });
      } catch (error) {
        return rejection(error);
      }
    }

    async revokeBinding(input) {
      try {
        const owner = await this.verifiedOwner(input);
        if (!FP.test(input.androidFingerprint || "") ||
            !REVOCATION_NONCE.test(input.nonce || ""))
          throw new Error("INVALID_REVOCATION_FIELDS");
        const now = Math.floor(Date.now() / 1000);
        const replayKey = "android-bind:v1:revocation:" +
          owner.ownerFingerprint + ":" + input.androidFingerprint + ":" + input.nonce;
        return await ledger.revokeBinding({
          storage: this.storageAdapter(),
          ownerFingerprint: owner.ownerFingerprint,
          androidFingerprint: input.androidFingerprint,
          nowEpochSeconds: now,
          authorizeOwner: async tx => {
            await cryptoChecks.verifyOwnerRevocation({
              ownerIdentity: owner,
              androidFingerprint: input.androidFingerprint,
              nonce: input.nonce,
              issuedAtEpochSeconds: input.issuedAtEpochSeconds,
              signatureBase64Url: input.signatureBase64Url,
              nowEpochSeconds: now
            });
            // A replay is rejected before quota accounting. Only a fresh,
            // cryptographically valid owner action consumes a revocation slot.
            if (await tx.get(replayKey)) return false;
            const {fixedUtcWindow, quotaCounterKey} =
              await import("./android_binding_stage4_primitives_v1.cjs");
            const window = fixedUtcWindow(now, 600);
            const quotaKey = quotaCounterKey(owner.ownerFingerprint, "revocation-10m", window);
            const quota = await tx.get(quotaKey) || {count:0};
            if (quota.count >= 5) {
              const error = new Error("RATE_LIMITED");
              error.retryAfterEpochSeconds = window.retryAfterEpochSeconds;
              throw error;
            }
            await tx.put(quotaKey, {count:quota.count + 1,
              windowEndsAtEpochSeconds:window.endEpochSeconds});
            await tx.put(replayKey, {status:"consumed", consumedAtEpochSeconds:now});
            return true;
          }
        });
      } catch (error) {
        return rejection(error);
      }
    }

    async isBindingActive(input) {
      return ledger.isBindingActive({
        storage: this.storageAdapter(),
        ownerFingerprint: input.ownerFingerprint,
        androidFingerprint: input.androidFingerprint
      });
    }
  };
}
