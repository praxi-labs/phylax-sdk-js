import { createHmac, timingSafeEqual } from 'node:crypto'

export interface VerifySignatureInput {
  rawBody: string | Uint8Array
  signature: string | undefined
  timestamp: string | number | undefined
  secret: string
  toleranceSeconds?: number | undefined
  now?: (() => number) | undefined
}

export type VerifySignatureResult =
  | { valid: true }
  | { valid: false; reason: string }

export function verifySignature(
  input: VerifySignatureInput,
): VerifySignatureResult {
  const {
    rawBody,
    signature,
    timestamp,
    secret,
    toleranceSeconds = 300,
    now = Date.now,
  } = input

  if (!signature) {
    return { valid: false, reason: 'Missing signature header' }
  }
  if (timestamp === undefined || timestamp === '') {
    return { valid: false, reason: 'Missing timestamp header' }
  }

  const ts = Number(timestamp)
  if (!Number.isFinite(ts)) {
    return { valid: false, reason: 'Malformed timestamp header' }
  }

  const skew = Math.abs(now() / 1000 - ts)
  if (skew > toleranceSeconds) {
    return {
      valid: false,
      reason: `Timestamp outside tolerance (${Math.round(skew)}s > ${toleranceSeconds}s)`,
    }
  }

  const body =
    typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8')

  const expected =
    'sha256=' + createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')

  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: 'Signature mismatch' }
  }

  return { valid: true }
}
