import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { verifySignature } from '../../src/utils/signature.js'

const SECRET = 'whsec_test'
const BODY = JSON.stringify({ event: 'artifact.verified', verdict: 'ALLOW' })
const TS = 1_786_240_895
const NOW = () => TS * 1000

const sign = (ts: number, body: string, secret = SECRET) =>
  'sha256=' + createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex')

describe('verifySignature', () => {
  it('accepts a correctly signed delivery', () => {
    const res = verifySignature({
      rawBody: BODY,
      signature: sign(TS, BODY),
      timestamp: TS,
      secret: SECRET,
      now: NOW,
    })
    expect(res.valid).toBe(true)
  })

  it('accepts a raw Buffer body identically to a string', () => {
    const res = verifySignature({
      rawBody: Buffer.from(BODY, 'utf8'),
      signature: sign(TS, BODY),
      timestamp: TS,
      secret: SECRET,
      now: NOW,
    })
    expect(res.valid).toBe(true)
  })

  it('rejects a body that was reserialised', () => {
    // This is the real-world failure: middleware parsed and re-stringified the
    // JSON, reordering keys. Same meaning, different bytes, invalid signature.
    const reordered = JSON.stringify({ verdict: 'ALLOW', event: 'artifact.verified' })
    const res = verifySignature({
      rawBody: reordered,
      signature: sign(TS, BODY),
      timestamp: TS,
      secret: SECRET,
      now: NOW,
    })
    expect(res.valid).toBe(false)
  })

  it('rejects a delivery signed with the wrong secret', () => {
    const res = verifySignature({
      rawBody: BODY,
      signature: sign(TS, BODY, 'whsec_wrong'),
      timestamp: TS,
      secret: SECRET,
      now: NOW,
    })
    expect(res).toEqual({ valid: false, reason: 'Signature mismatch' })
  })

  it('rejects a replayed delivery outside the tolerance window', () => {
    const res = verifySignature({
      rawBody: BODY,
      signature: sign(TS, BODY),
      timestamp: TS,
      secret: SECRET,
      now: () => (TS + 600) * 1000, // ten minutes later
    })
    expect(res.valid).toBe(false)
    expect(res.valid === false && res.reason).toMatch(/tolerance/)
  })

  it('accepts a delivery inside the tolerance window', () => {
    const res = verifySignature({
      rawBody: BODY,
      signature: sign(TS, BODY),
      timestamp: TS,
      secret: SECRET,
      now: () => (TS + 120) * 1000,
    })
    expect(res.valid).toBe(true)
  })

  it('tolerates clock skew in both directions', () => {
    const res = verifySignature({
      rawBody: BODY,
      signature: sign(TS, BODY),
      timestamp: TS,
      secret: SECRET,
      now: () => (TS - 120) * 1000, // receiver clock behind sender
    })
    expect(res.valid).toBe(true)
  })

  it('reports missing headers distinctly rather than as a mismatch', () => {
    expect(
      verifySignature({ rawBody: BODY, signature: undefined, timestamp: TS, secret: SECRET }),
    ).toEqual({ valid: false, reason: 'Missing signature header' })

    expect(
      verifySignature({
        rawBody: BODY,
        signature: sign(TS, BODY),
        timestamp: undefined,
        secret: SECRET,
      }),
    ).toEqual({ valid: false, reason: 'Missing timestamp header' })
  })

  it('does not throw on a truncated signature of a different length', () => {
    // timingSafeEqual throws on length mismatch; the guard must catch it.
    const res = verifySignature({
      rawBody: BODY,
      signature: 'sha256=deadbeef',
      timestamp: TS,
      secret: SECRET,
      now: NOW,
    })
    expect(res).toEqual({ valid: false, reason: 'Signature mismatch' })
  })
})
