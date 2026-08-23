/**
 * Node-only helpers. Kept out of the root entry point so a browser bundle
 * never has to resolve `node:fs`.
 */

export { collectFiles, MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES } from './collect.js'
export type { CollectResult } from './collect.js'
