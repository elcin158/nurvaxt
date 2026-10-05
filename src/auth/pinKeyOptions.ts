// These parameters are part of the existing v1 vault format.
export const PIN_KEY_ITERATIONS = 210_000;
export const PIN_KEY_LENGTH = 32;
export type DerivePinKey = (password: Uint8Array, salt: Uint8Array) => Promise<Uint8Array>;
