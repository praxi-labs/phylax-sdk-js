/**
 * Analysing supplied bytes, rather than looking up a name.
 *
 * `verify` answers from what the network has already recorded, so an artifact
 * nobody has attested returns coverage `none` and a verdict of ALLOW. That is
 * safe for a catalogue and wrong for a gate. These pin the distinction, and
 * that a consumer can tell a champion-backed verdict from a regex pass.
 */

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

const FILES = {
  'package.json': '{"name":"demo"}',
  'src/index.ts': 'export const x = 1\n',
}

const CHAMPION = {
  artifact: 'demo',
  artifact_type: 'package',
  verdict: 'BLOCK',
  confidence: 0.9,
  coverage: 'champion',
  engine: { version: 'abc123', analysers: 3, dissent: true },
  identity: 'sha256:' + 'a'.repeat(64),
  findings: [{ signal: 'shell_execution', severity: 'medium', file: 'src/index.ts' }],
  reasons: ['shell_execution in src/index.ts: spawns a shell'],
}

describe('artifacts.analyse', () => {
  it('posts the files to the analyse endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(CHAMPION))
    await sdkWith(fetchImpl).artifacts.analyse(FILES, {
      artifactType: 'package',
      coordinate: 'npm:demo@1.0.0',
    })

    const { url, init } = call(fetchImpl)
    expect(url.pathname).toBe('/v1/artifacts/analyse')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      files: FILES,
      artifact_type: 'package',
      coordinate: 'npm:demo@1.0.0',
    })
  })

  it('omits a type or coordinate that was not given', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(CHAMPION))
    await sdkWith(fetchImpl).artifacts.analyse(FILES)
    expect(JSON.parse(call(fetchImpl).init.body as string)).toEqual({ files: FILES })
  })

  it('surfaces the champion verdict and engine detail', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok(CHAMPION))
    const res = await sdkWith(fetchImpl).artifacts.analyse(FILES)

    expect(res.success).toBe(true)
    if (!res.success) return
    expect(res.data.verdict).toBe('BLOCK')
    expect(res.data.coverage).toBe('champion')
    expect(res.data.engine.analysers).toBe(3)
    expect(res.data.engine.dissent).toBe(true)
    expect(res.data.identity).toMatch(/^sha256:/)
  })

  it('lets a caller tell a champion run from a static pass', async () => {
    /**
     * The whole reason coverage is on the result. A WARN from three champions
     * and a WARN from a regex pass are identical if you only read `verdict`.
     */
    const fetchImpl = vi.fn().mockResolvedValue(
      ok({
        ...CHAMPION,
        verdict: 'WARN',
        coverage: 'static',
        engine: { version: 'none', analysers: 0, dissent: false },
      }),
    )
    const res = await sdkWith(fetchImpl).artifacts.analyse(FILES)

    expect(res.success).toBe(true)
    if (!res.success) return
    expect(res.data.coverage).toBe('static')
    expect(res.data.engine.analysers).toBe(0)
  })

  it('reports a failure rather than a verdict when the call fails', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(ok({ error: 'quota spent', code: 'quota_exceeded' }, 429))
    const res = await sdkWith(fetchImpl).artifacts.analyse(FILES)
    expect(res.success).toBe(false)
  })
})

describe('the gap analyse closes', () => {
  it('verify answers about a name and can report no coverage at all', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      ok({
        artifact: 'npm:unseen',
        verdict: 'ALLOW',
        coverage: 'none',
        reason: 'This artifact has not been evaluated by the network.',
      }),
    )
    const res = await sdkWith(fetchImpl).artifacts.verify('pkg:npm/unseen@1.0.0')

    expect(call(fetchImpl).url.pathname).toBe('/v1/artifacts/verify')
    expect(res.success).toBe(true)
    if (!res.success) return

    // ALLOW with no coverage is the fail-open default a gate must not trust.
    expect(res.data.verdict).toBe('ALLOW')
    expect(res.data.coverage).toBe('none')
  })
})
