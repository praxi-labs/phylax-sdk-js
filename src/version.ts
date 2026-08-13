/**
 * Kept as a literal rather than read from package.json, so the built ESM has
 * no JSON import assertion and works identically in Node, a bundler and a
 * browser extension.
 *
 * Bump alongside package.json.
 */
export const SDK_NAME = '@phyi/sdk'
export const SDK_VERSION = '0.1.0'
