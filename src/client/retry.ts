import { MAX_BACKOFF_MS } from '../constants.js'

export const IDEMPOTENT_METHODS: ReadonlySet<string> = new Set([
  'GET',
  'HEAD',
  'PUT',
])

const RETRYABLE_IDEMPOTENT: ReadonlySet<number> = new Set([
  408, 429, 500, 502, 503, 504,
])

const RETRYABLE_UNSAFE: ReadonlySet<number> = new Set([408, 429])

export function isRetryable(method: string, status: number): boolean {
  return IDEMPOTENT_METHODS.has(method)
    ? RETRYABLE_IDEMPOTENT.has(status)
    : RETRYABLE_UNSAFE.has(status)
}

export function retryDelayMs(
  attempt: number,
  retryAfterHeader: string | null,
  random: () => number = Math.random,
): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader)
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_BACKOFF_MS)
    }
    const at = Date.parse(retryAfterHeader)
    if (!Number.isNaN(at)) {
      return Math.min(Math.max(at - Date.now(), 0), MAX_BACKOFF_MS)
    }
  }
  const ceiling = Math.min(2 ** attempt * 1000, MAX_BACKOFF_MS)
  return Math.floor(random() * ceiling)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
