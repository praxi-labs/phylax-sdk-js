import { describe, expect, it, vi } from 'vitest'

import { PhylaxSdk } from '../../src/phylax-sdk.js'

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function sdkWith(fetchImpl: ReturnType<typeof vi.fn>) {
  return new PhylaxSdk({
    apiToken: 'phx_live_test',
    fetch: fetchImpl as never,
    maxRetries: 1,
  })
}

const urlOf = (fetchImpl: ReturnType<typeof vi.fn>, call = 0) =>
  new URL(fetchImpl.mock.calls[call]![0] as string)

describe('PhylaxSdk construction', () => {
  it('requires an API token', () => {
    expect(() => new PhylaxSdk({ apiToken: '' })).toThrow(TypeError)
    expect(() => new PhylaxSdk({ apiToken: '   ' })).toThrow(/token is required/)
  })

  it('rejects a non-callable fetch', () => {
    expect(
      () => new PhylaxSdk({ apiToken: 'x', fetch: 42 as never }),
    ).toThrow(TypeError)
  })
})

describe('PhylaxSdk routing', () => {
  it('targets versioned paths', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({}))
    const sdk = sdkWith(fetchImpl)

    await sdk.health()
    expect(urlOf(fetchImpl, 0).pathname).toBe('/v1/health')

    await sdk.serverIdentity()
    expect(urlOf(fetchImpl, 1).pathname).toBe('/v1/server-identity')

    await sdk.me()
    expect(urlOf(fetchImpl, 2).pathname).toBe('/v1/account/me')
  })

  it('identifies itself and lets a caller prepend its own agent', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({}))
    await new PhylaxSdk({
      apiToken: 'x',
      fetch: fetchImpl as never,
      userAgent: 'phylax-vscode/1.2.3',
    }).health()

    const headers = fetchImpl.mock.calls[0]![1].headers as Record<string, string>
    expect(headers['user-agent']).toMatch(/^phylax-vscode\/1\.2\.3 @phylax\/sdk\//)
  })

  it('surfaces a transport failure as a result rather than a rejection', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const res = await sdkWith(fetchImpl).health()

    expect(res.success).toBe(false)
    expect(res.code).toBe('network_error')
    expect(res.error).toContain('ECONNREFUSED')
  })
})
