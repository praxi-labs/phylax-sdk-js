import { describe, expect, it, vi } from 'vitest'

import { HttpClient } from '../../src/client/http-client.js'
import type { HttpClientConfig } from '../../src/client/http-client.js'
import { isRetryable, retryDelayMs } from '../../src/client/retry.js'

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

function client(
  fetchImpl: typeof globalThis.fetch,
  overrides: Partial<HttpClientConfig> = {},
): HttpClient {
  return new HttpClient({
    baseUrl: 'https://api.example.test',
    apiToken: 'phx_live_token',
    timeoutMs: 1_000,
    maxRetries: 3,
    userAgent: 'test/1.0',
    fetchImpl,
    ...overrides,
  })
}

describe('retryDelayMs', () => {
  it('honours a numeric Retry-After over computed backoff', () => {
    expect(retryDelayMs(0, '5')).toBe(5_000)
  })

  it('honours Retry-After given as an HTTP date', () => {
    const when = new Date(Date.now() + 4_000).toUTCString()
    const delay = retryDelayMs(0, when)
    expect(delay).toBeGreaterThan(2_000)
    expect(delay).toBeLessThanOrEqual(5_000)
  })

  it('caps Retry-After so a hostile value cannot hang the process', () => {
    expect(retryDelayMs(0, '99999')).toBe(30_000)
  })

  it('applies full jitter rather than a fixed doubling', () => {
    expect(retryDelayMs(3, null, () => 1)).toBe(8_000)
    expect(retryDelayMs(3, null, () => 0)).toBe(0)
  })

  it('caps computed backoff at the ceiling', () => {
    expect(retryDelayMs(20, null, () => 1)).toBe(30_000)
  })
})

describe('isRetryable', () => {
  it('retries idempotent verbs on transient failures', () => {
    expect(isRetryable('GET', 503)).toBe(true)
    expect(isRetryable('PUT', 500)).toBe(true)
  })

  it('refuses to replay a write on an ambiguous 5xx', () => {
    expect(isRetryable('POST', 502)).toBe(false)
    expect(isRetryable('DELETE', 500)).toBe(false)
    expect(isRetryable('PATCH', 503)).toBe(false)
  })

  it('replays a write on 429, which never reached the handler', () => {
    expect(isRetryable('POST', 429)).toBe(true)
    expect(isRetryable('DELETE', 408)).toBe(true)
  })

  it('never retries a plain client error', () => {
    expect(isRetryable('GET', 404)).toBe(false)
    expect(isRetryable('POST', 400)).toBe(false)
  })
})

describe('HttpClient.request', () => {
  it('returns a success result with parsed data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({ status: 'ok' }))
    const res = await client(fetchImpl as never).get<{ status: string }>('/v1/health')

    expect(res.success).toBe(true)
    expect(res.status).toBe(200)
    expect(res.data).toEqual({ status: 'ok' })
  })

  it('always sends the bearer token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json({}))
    await client(fetchImpl as never).get('/v1/health')

    const headers = fetchImpl.mock.calls[0]![1].headers as Record<string, string>
    expect(headers['authorization']).toBe('Bearer phx_live_token')
  })

  it('classifies a payment required response as plan_required', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response('upgrade', { status: 402 }))
    const res = await client(fetchImpl as never).get('/v1/policies')

    expect(res.success).toBe(false)
    expect(res.code).toBe('plan_required')
  })

  it('classifies auth and quota failures distinctly', async () => {
    const cases: Array<[number, string]> = [
      [401, 'unauthenticated'],
      [403, 'forbidden'],
      [404, 'not_found'],
      [429, 'rate_limited'],
      [500, 'server_error'],
    ]
    for (const [status, code] of cases) {
      const fetchImpl = vi
        .fn()
        .mockResolvedValue(new Response('x', { status }))
      const res = await client(fetchImpl as never, { maxRetries: 1 }).get('/v1/x')
      expect(res.success).toBe(false)
      expect(res.code).toBe(code)
    }
  })

  it('does not throw on a 404, it returns a failure result', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response('nope', { status: 404, statusText: 'Not Found' }))
    const res = await client(fetchImpl as never).get('/v1/artifacts/missing')

    expect(res.success).toBe(false)
    expect(res.status).toBe(404)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('retries a 429 and succeeds on a later attempt', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('slow down', { status: 429, headers: { 'retry-after': '0' } }),
      )
      .mockResolvedValueOnce(json({ status: 'ok' }))

    const res = await client(fetchImpl as never).get('/v1/health')

    expect(res.success).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('never leaks the token into an error body', async () => {
    const token = 'phx_live_supersecret'
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(`bad token ${token} rejected`, { status: 401 }))

    const res = await client(fetchImpl as never, { apiToken: token }).get('/v1/account/me')

    expect(res.success).toBe(false)
    expect(res.cause).toBeDefined()
    expect(res.cause).not.toContain(token)
    expect(res.cause).toContain('***')
  })

  it('serialises query params and drops undefined ones', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json([]))
    await client(fetchImpl as never).get('/v1/artifacts', {
      query: { limit: 5, ecosystem: undefined, verified: true },
    })

    const url = new URL(fetchImpl.mock.calls[0]![0] as string)
    expect(url.searchParams.get('limit')).toBe('5')
    expect(url.searchParams.get('verified')).toBe('true')
    expect(url.searchParams.has('ecosystem')).toBe(false)
  })

  it('reports a caller abort without retrying', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn().mockImplementation(() => {
      controller.abort()
      const err = new Error('aborted')
      err.name = 'AbortError'
      return Promise.reject(err)
    })

    const res = await client(fetchImpl as never).get('/v1/health', {
      signal: controller.signal,
    })

    expect(res.success).toBe(false)
    expect(res.code).toBe('aborted')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})
