/* Cloudflare Durable Object class export.
 * Deliberately not referenced by wrangler config or any Worker entrypoint.
 */
import { DurableObject } from "cloudflare:workers";
import { createAndroidBindingLedgerClass } from "./android_binding_durable_object_adapter_v1.mjs";

export class AndroidBindingLedger extends createAndroidBindingLedgerClass(DurableObject) {}
