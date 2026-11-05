/*
 * Shared non-handler constants for E-ZERO's experimental Cloudflare Worker.
 * Worker entrypoint modules may export ONLY functions/handlers/DO classes.
 * Keep integer constants in an imported module, not as named exports of the
 * Worker entrypoint; real workerd rejects primitive named exports at startup.
 */
export const ROOM_LIFETIME_MS=10*60*1000;
export const MAX_PILOT_ACTIVE_ROOMS=8;
