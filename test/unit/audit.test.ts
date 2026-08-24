/**
 * Auditing a whole tree from one call.
 *
 * Resolution deliberately does not happen in the SDK. A lockfile parser and a
 * registry client in every client is the same code written five times and
 * wrong in five different ways, so the SDK sends manifests and the server
 * answers with the graph.
 *
 * The streaming half is what these mostly pin: newline-delimited JSON has to
 * survive being split across chunk boundaries, which is the bug every hand
 * rolled NDJSON reader has.
 */

import { describe, expect, it, vi } from 'vitest'

import { PhylaxSdk } from '../../src/phylax-sdk.js'

const MANIFESTS = {
  'package-lock.json': '{"lockfileVersion":3}',
  'package.json': '{"name":"demo"}',
}

const SCAN = {
  id: 'scan123456789012',
  state: 'pending',
  stream: '/v1/audit/scan123456789012/stream',
}

const NDJSON = [
  JSON.stringify({ type: 'scan', id: SCAN.id, state: 'complete', verdict: 'BLOCK' }),
  JSON.stringify({
    type: 'artifact',
    purl: 'pkg:npm/express@4.18.2',
    name: 'express',
    version: '4.18.2',
    verdict: 'ALLOW',
    direct: true,
    ancestors: [],
  }),
  JSON.stringify({
    type: 'artifact',
    purl: 'pkg:npm/debug@2.6.9',
    name: 'debug',
    version: '2.6.9',
    verdict: 'BLOCK',
    direct: false,
    ancestors: ['express'],
    declared_in: 'package-lock.json',
    declared_line: 42,
  }),
  JSON.stringify({
    type: 'summary',
    verdict: 'BLOCK',
    packages: 2,
    by_verdict: { ALLOW: 1, BLOCK: 1 },
  }),
].join('\n')

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** A body delivered in arbitrary chunks, as a real socket would. */
function ndjson(text: string, chunkSize: number): Response {
  const bytes = new TextEncoder().encode(text)
  let offset = 0
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset >= bytes.length) {
        controller.close()
        return
      }
      controller.enqueue(bytes.slice(offset, offset + chunkSize))
      offset += chunkSize
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'application/x-ndjson' },
  })
}

const sdkWith = (fetchImpl: ReturnType<typeof vi.fn>) =>
  new PhylaxSdk({
    apiToken: 'phx_live_test',
    fetch: fetchImpl as never,
    maxRetries: 1,
  })

describe('audit.create', () => {
  it('sends manifests, not source', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(SCAN, 202))
    await sdkWith(fetchImpl).audit.create(MANIFESTS, { coordinate: 'demo' })

    const [url, init] = fetchImpl.mock.calls[0]!
    expect(new URL(url as string).pathname).toBe('/v1/audit')
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      files: MANIFESTS,
      coordinate: 'demo',
    })
  })

  it('returns the scan id without waiting for the work', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(SCAN, 202))
    const res = await sdkWith(fetchImpl).audit.create(MANIFESTS)

    expect(res.success).toBe(true)
    if (!res.success) return
    expect(res.data.id).toBe(SCAN.id)
    expect(res.data.state).toBe('pending')
  })
})

describe('audit.stream', () => {
  it('yields one event per line', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ndjson(NDJSON, 4096))
    const events = []
    for await (const event of sdkWith(fetchImpl).audit.stream(SCAN.id)) {
      events.push(event)
    }

    expect(events.map(e => e.type)).toEqual(['scan', 'artifact', 'artifact', 'summary'])
  })

  it('reassembles events split across chunk boundaries', async () => {
    /**
     * The bug every hand rolled NDJSON reader has. A socket does not respect
     * line boundaries, so a 7 byte chunk size must produce the same events as
     * one large one.
     */
    const fetchImpl = vi.fn().mockResolvedValue(ndjson(NDJSON, 7))
    const events = []
    for await (const event of sdkWith(fetchImpl).audit.stream(SCAN.id)) {
      events.push(event)
    }

    expect(events).toHaveLength(4)
    expect(events[3]).toMatchObject({ type: 'summary', packages: 2 })
  })

  it('yields a final line that has no trailing newline', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ndjson(NDJSON, 13))
    const events = []
    for await (const event of sdkWith(fetchImpl).audit.stream(SCAN.id)) {
      events.push(event)
    }
    expect(events.at(-1)).toMatchObject({ type: 'summary' })
  })

  it('carries each package position in the graph', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ndjson(NDJSON, 4096))
    const events = []
    for await (const event of sdkWith(fetchImpl).audit.stream(SCAN.id)) {
      events.push(event)
    }

    const debug = events.find(
      e => e.type === 'artifact' && e.name === 'debug',
    ) as { ancestors: string[]; declared_line: number; direct: boolean }

    expect(debug.ancestors).toEqual(['express'])
    expect(debug.declared_line).toBe(42)
    expect(debug.direct).toBe(false)
  })
})

describe('audit.run', () => {
  it('polls until terminal, then collects the stream', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      const path = new URL(url).pathname
      if (path === '/v1/audit') return ok(SCAN, 202)
      if (path.endsWith('/stream')) return ndjson(NDJSON, 64)
      return ok({ ...SCAN, state: 'complete', verdict: 'BLOCK' })
    })

    const res = await sdkWith(fetchImpl as never).audit.run(MANIFESTS, {
      pollIntervalMs: 1,
    })

    expect(res.success).toBe(true)
    if (!res.success) return
    expect(res.data.artifacts).toHaveLength(2)
    expect(res.data.summary?.by_verdict).toEqual({ ALLOW: 1, BLOCK: 1 })
    expect(res.data.scan.verdict).toBe('BLOCK')
  })

  it('reports a timeout without pretending the scan died', async () => {
    /**
     * The wait is abandoned, not the audit. It keeps running server side and
     * can still be read by id, so the message must not imply otherwise.
     */
    const fetchImpl = vi.fn(async (url: string) => {
      const path = new URL(url).pathname
      if (path === '/v1/audit') return ok(SCAN, 202)
      return ok({ ...SCAN, state: 'scan' })
    })

    const res = await sdkWith(fetchImpl as never).audit.run(MANIFESTS, {
      pollIntervalMs: 1,
      timeoutMs: 5,
    })

    expect(res.success).toBe(false)
    if (res.success) return
    expect(res.code).toBe('timeout')
    expect(res.error).toContain('still running')
  })

  it('surfaces a failed create rather than polling forever', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(ok({ error: 'no manifest recognised' }, 400))
    const res = await sdkWith(fetchImpl).audit.run(MANIFESTS, { pollIntervalMs: 1 })
    expect(res.success).toBe(false)
  })
})
