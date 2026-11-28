# E-ZERO Android signing continuity — staging release gate

Status: planning only. No signing key is generated, imported, stored, or configured by this change.

## Verified build facts

- Android application ID / namespace: `com.ezero.connect`
- Current staging version: `0.1.0-staging`, versionCode `1`
- Current CI artifact is produced by Gradle `:app:assembleDebug`.
- CI log shows `:app:validateSigningDebug` and `:app:packageDebug` succeeded.
- This does not identify the certificate fingerprint and does not prove compatibility with any APK already installed on a tester's device.

## Required continuity design

1. Keep the existing installed app untouched until its package ID, versionCode, and signing certificate SHA-256 fingerprint are recorded.
2. Create one dedicated E-ZERO Android staging upload key outside the repository, under the project owner's control. Never commit the keystore, passwords, private key, or encoded keystore.
3. Store the keystore and credentials only as restricted GitHub Actions secrets:
   - `EZERO_ANDROID_STAGING_KEYSTORE_BASE64`
   - `EZERO_ANDROID_STAGING_STORE_PASSWORD`
   - `EZERO_ANDROID_STAGING_KEY_ALIAS`
   - `EZERO_ANDROID_STAGING_KEY_PASSWORD`
4. Configure a separate Gradle release/staging signing config that reads only those secrets. Do not reuse the ephemeral CI debug key for upgrade continuity.
5. Make the signed artifact job fail closed if any required secret is absent or the keystore cannot be loaded. Never silently fall back to debug signing.
6. Publish the certificate SHA-256 fingerprint as non-secret build metadata; never publish private key material.
7. Before any installation, compare the candidate APK's package ID and certificate fingerprint with the installed app. Also verify versionCode is an allowed upgrade. If any comparison is missing or mismatched, stop and preserve the installed app.
8. Physical upgrade testing must confirm existing local data and app launch remain intact. Do not uninstall as a workaround.

## Explicit non-goals

- No production signing key or Play App Signing changes.
- No Firebase credentials or project changes.
- No production deployment, public website changes, app installation, uninstall, or data migration.
- No claim that this staging key matches the user's already-installed APK.

## Release gate

A signed staging APK may be offered for installation only after the owner has supplied/configured the dedicated signing secrets, CI has emitted and independently checked the certificate fingerprint, and the installed app's certificate fingerprint has been compared successfully.
