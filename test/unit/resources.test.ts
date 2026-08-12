import { describe, expect, it, vi } from 'vitest'

import { PhylaxSdk } from '../../src/phylax-sdk.js'

function ok(body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const sdkWith = (fetchImpl: ReturnType<typeof vi.fn>) =>
  new PhylaxSdk({
    apiToken: 'phx_live_test',
    fetch: fetchImpl as never,
    maxRetries: 1,
  })

const call = (fetchImpl: ReturnType<typeof vi.fn>, i = 0) => ({
  url: new URL(fetchImpl.mock.calls[i]![0] as string),
  init: fetchImpl.mock.calls[i]![1] as RequestInit,
})

describe('artifacts', () => {
  it('posts a verify with the artifact in the body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ verdict: 'ALLOW' }))
    const res = await sdkWith(fetchImpl).artifacts.verify('pkg:npm/express@4.18.2')

    const { url, init } = call(fetchImpl)
    expect(url.pathname).toBe('/v1/artifacts/verify')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      artifact: 'pkg:npm/express@4.18.2',
    })
    expect(res.success && res.data.verdict).toBe('ALLOW')
  })

  it('includes policy and include options only when given', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({}))
    await sdkWith(fetchImpl).artifacts.verify('pkg:npm/x@1', {
      policy: 'prod',
      include: ['licenses'],
    })

    expect(JSON.parse(call(fetchImpl).init.body as string)).toEqual({
      artifact: 'pkg:npm/x@1',
      policy: 'prod',
      include: ['licenses'],
    })
  })

  it('batches many artifacts into one request', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok([]))
    await sdkWith(fetchImpl).artifacts.verifyMany(['pkg:npm/a@1', 'pkg:pypi/b@2'])

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(JSON.parse(call(fetchImpl).init.body as string).artifacts).toHaveLength(2)
  })

  it('sets content-type only when there is a body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({}))
    const sdk = sdkWith(fetchImpl)

    await sdk.health()
    expect(
      (call(fetchImpl, 0).init.headers as Record<string, string>)['content-type'],
    ).toBeUndefined()

    await sdk.artifacts.verify('pkg:npm/x@1')
    expect(
      (call(fetchImpl, 1).init.headers as Record<string, string>)['content-type'],
    ).toBe('application/json')
  })

  it('encodes the artifact reference in the path', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({}))
    await sdkWith(fetchImpl).artifacts.get('pkg:npm/@scope/pkg@1.0.0')

    expect(call(fetchImpl).url.pathname).toBe(
      '/v1/artifacts/pkg%3Anpm%2F%40scope%2Fpkg%401.0.0',
    )
  })

  it('searches with a query and optional ecosystem filter', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ items: [] }))
    await sdkWith(fetchImpl).artifacts.search('express', { ecosystem: 'npm' })

    const { url } = call(fetchImpl)
    expect(url.pathname).toBe('/v1/search')
    expect(url.searchParams.get('q')).toBe('express')
    expect(url.searchParams.get('ecosystem')).toBe('npm')
  })
})

describe('attestations', () => {
  it('lists attestations for an artifact', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ items: [] }))
    await sdkWith(fetchImpl).attestations.list('pkg:npm/express@4.18.2')

    const { url } = call(fetchImpl)
    expect(url.pathname).toBe('/v1/attestations')
    expect(url.searchParams.get('artifact')).toBe('pkg:npm/express@4.18.2')
  })
})

describe('policies', () => {
  it('evaluates against a named policy', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ verdict: 'allow', score: 92 }))
    const res = await sdkWith(fetchImpl).policies.evaluate({
      artifact: 'pkg:npm/express@4.18.2',
      policy: 'prod-runtime-policy',
      include: ['vulnerabilities'],
    })

    const { url, init } = call(fetchImpl)
    expect(url.pathname).toBe('/v1/policies/evaluate')
    expect(init.method).toBe('POST')
    expect(res.success && res.data.score).toBe(92)
  })

  it('uses patch for an update', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({}))
    await sdkWith(fetchImpl).policies.update('p1', { name: 'renamed' })

    expect(call(fetchImpl).init.method).toBe('PATCH')
  })
})

describe('webhooks and repositories', () => {
  it('handles a 204 with an empty body on delete', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(null, 204))
    const res = await sdkWith(fetchImpl).webhooks.delete('wh_1')

    expect(res.success).toBe(true)
    expect(call(fetchImpl).init.method).toBe('DELETE')
  })

  it('registers a repository', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ id: 'r1' }))
    await sdkWith(fetchImpl).repositories.add({
      url: 'https://github.com/acme/service-api',
      provider: 'github',
    })

    const { url, init } = call(fetchImpl)
    expect(url.pathname).toBe('/v1/repositories')
    expect(JSON.parse(init.body as string).provider).toBe('github')
  })

  it('verifies a repository without registering it', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ verdict: 'ALLOW' }))
    await sdkWith(fetchImpl).repositories.verify('https://github.com/acme/api')

    expect(call(fetchImpl).url.pathname).toBe('/v1/repositories/verify')
  })
})

describe('entitlements', () => {
  it('reads the caller plan and quota from the account endpoint', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        ok({ plan: 'marketplace', permissions: [], quota_remaining: 500 }),
      )
    const res = await sdkWith(fetchImpl).quota.entitlements()

    expect(call(fetchImpl).url.pathname).toBe('/v1/account/entitlements')
    expect(res.success && res.data.plan).toBe('marketplace')
  })
})
