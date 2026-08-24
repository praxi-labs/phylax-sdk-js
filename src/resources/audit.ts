import { PATHS } from '../constants.js'
import type { HttpClient } from '../client/http-client.js'
import type { RequestOptions } from '../types/options.js'
import type { PhylaxResult } from '../types/result.js'
import type { AuditArtifact, AuditEvent, AuditScan, AuditSummary } from '../types/domain.js'

export interface AuditOptions extends RequestOptions {
  /** A name for the project, echoed back on the scan. */
  coordinate?: string | undefined
}

export interface RunAuditOptions extends AuditOptions {
  /** How often to ask whether the scan has finished. */
  pollIntervalMs?: number | undefined
  /** Give up after this long. The scan keeps running server side. */
  timeoutMs?: number | undefined
  /** Called on each poll, for progress reporting. */
  onProgress?: ((scan: AuditScan) => void) | undefined
}

export interface AuditRun {
  scan: AuditScan
  artifacts: AuditArtifact[]
  summary: AuditSummary | undefined
}

const TERMINAL = new Set(['complete', 'failed'])

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class AuditResource {
  readonly #http: HttpClient

  constructor(http: HttpClient) {
    this.#http = http
  }

  /**
   * Audit everything a project installs.
   *
   * Send the manifests and lockfiles; the server resolves the transitive tree,
   * consults the index, fetches whatever is new from its registry and runs the
   * engine over it. Resolution deliberately does not happen here: a lockfile
   * parser and a registry client in every SDK is the same code written five
   * times and wrong in five different ways.
   *
   * Returns as soon as the work is accepted, not when it is done. A tree of a
   * few thousand packages takes minutes. Poll {@link get}, read {@link stream},
   * or use {@link run} to wait.
   */
  async create(
    files: Record<string, string>,
    options: AuditOptions = {},
  ): Promise<PhylaxResult<AuditScan>> {
    const { coordinate, ...rest } = options
    return this.#http.post<AuditScan>(
      PATHS.audit,
      { files, ...(coordinate ? { coordinate } : {}) },
      rest,
    )
  }

  /** Where a scan has got to. */
  async get(
    scanId: string,
    options?: RequestOptions,
  ): Promise<PhylaxResult<AuditScan>> {
    return this.#http.get<AuditScan>(PATHS.auditScan(scanId), options)
  }

  /**
   * Every artifact, one at a time, as the server sends them.
   *
   * The endpoint answers newline-delimited JSON, so a caller can render a large
   * tree progressively instead of holding all of it before showing anything.
   * The first event is the scan, then one per artifact, then a summary.
   */
  async *stream(
    scanId: string,
    options: RequestOptions = {},
  ): AsyncGenerator<AuditEvent, void, undefined> {
    const response = await this.#http.raw(
      'GET',
      PATHS.auditStream(scanId),
      options,
    )
    if (!response.body) {
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let newline = buffer.indexOf('\n')
        while (newline !== -1) {
          const line = buffer.slice(0, newline).trim()
          buffer = buffer.slice(newline + 1)
          if (line) {
            yield JSON.parse(line) as AuditEvent
          }
          newline = buffer.indexOf('\n')
        }
      }
      // A final line with no trailing newline is still a whole event.
      const tail = buffer.trim()
      if (tail) {
        yield JSON.parse(tail) as AuditEvent
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Start an audit and wait for it, collecting everything.
   *
   * The convenience path for a CI job or a script, where holding the process
   * open is the point. A timeout here abandons the wait, not the scan: it keeps
   * running server side and can still be read by id.
   */
  async run(
    files: Record<string, string>,
    options: RunAuditOptions = {},
  ): Promise<PhylaxResult<AuditRun>> {
    const {
      pollIntervalMs = 5_000,
      timeoutMs = 15 * 60_000,
      onProgress,
      ...rest
    } = options

    const created = await this.create(files, rest)
    if (!created.success) {
      return created
    }

    const scanId = created.data.id
    const deadline = Date.now() + timeoutMs
    let scan = created.data

    while (!TERMINAL.has(String(scan.state))) {
      if (Date.now() > deadline) {
        return {
          success: false,
          status: 0,
          code: 'timeout',
          error: `Audit ${scanId} did not finish within ${timeoutMs}ms. It is still running; read it by id.`,
        }
      }
      await sleep(pollIntervalMs)
      const polled = await this.get(scanId, rest)
      if (!polled.success) {
        return polled
      }
      scan = polled.data
      onProgress?.(scan)
    }

    const artifacts: AuditArtifact[] = []
    let summary: AuditSummary | undefined

    for await (const event of this.stream(scanId, rest)) {
      if (event.type === 'artifact') {
        artifacts.push(event)
      } else if (event.type === 'summary') {
        summary = event
      } else if (event.type === 'scan') {
        scan = event
      }
    }

    return { success: true, status: 200, data: { scan, artifacts, summary } }
  }
}
