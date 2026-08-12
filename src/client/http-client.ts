import { classifyStatus } from '../types/result.js'
import type { PhylaxResult } from '../types/result.js'
import type { RequestOptions } from '../types/options.js'
import { redactToken, truncate } from '../utils/redact.js'
import { buildUrl } from '../utils/url.js'
import { IDEMPOTENT_METHODS, isRetryable, retryDelayMs, sleep } from './retry.js'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface HttpClientConfig {
  baseUrl: string
  apiToken: string
  timeoutMs: number
  maxRetries: number
  userAgent: string
  fetchImpl: typeof globalThis.fetch
}

export interface RequestPayload extends RequestOptions {
  body?: unknown
}

export class HttpClient {
  readonly #config: HttpClientConfig

  constructor(config: HttpClientConfig) {
    this.#config = config
  }

  #headers(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      accept: 'application/json',
      authorization: `Bearer ${this.#config.apiToken}`,
      'user-agent': this.#config.userAgent,
    }
    if (hasBody) {
      headers['content-type'] = 'application/json'
    }
    return headers
  }

  async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestPayload = {},
  ): Promise<PhylaxResult<T>> {
    const { apiToken, fetchImpl, maxRetries, timeoutMs } = this.#config
    const url = buildUrl(this.#config.baseUrl, path, options.query)
    const hasBody = options.body !== undefined
    const payload = hasBody ? JSON.stringify(options.body) : undefined

    let lastFailure: PhylaxResult<T> = {
      success: false,
      status: 0,
      code: 'network_error',
      error: 'Request failed',
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const onExternalAbort = () => controller.abort()
      options.signal?.addEventListener('abort', onExternalAbort, { once: true })

      try {
        const response = await fetchImpl(url, {
          method,
          headers: this.#headers(hasBody),
          ...(payload === undefined ? {} : { body: payload }),
          signal: controller.signal,
        })

        if (response.ok) {
          const raw = await response.text()
          const data = (raw ? JSON.parse(raw) : undefined) as T
          return { success: true, status: response.status, data }
        }

        const raw = await response.text().catch(() => '')
        const cause = raw
          ? truncate(redactToken(raw, apiToken))
          : undefined

        lastFailure = {
          success: false,
          status: response.status,
          code: classifyStatus(response.status),
          error: `HTTP ${response.status} ${response.statusText}`.trim(),
          cause,
        }

        if (!isRetryable(method, response.status) || attempt >= maxRetries - 1) {
          return lastFailure
        }

        await sleep(retryDelayMs(attempt, response.headers.get('retry-after')))
      } catch (error) {
        if (options.signal?.aborted) {
          return {
            success: false,
            status: 0,
            code: 'aborted',
            error: 'Request aborted by caller',
          }
        }

        const isTimeout = error instanceof Error && error.name === 'AbortError'
        const message = error instanceof Error ? error.message : String(error)

        lastFailure = {
          success: false,
          status: 0,
          code: isTimeout ? 'timeout' : 'network_error',
          error: isTimeout
            ? `Request timed out after ${timeoutMs}ms`
            : redactToken(message, apiToken),
        }

        if (!IDEMPOTENT_METHODS.has(method) || attempt >= maxRetries - 1) {
          return lastFailure
        }
        await sleep(retryDelayMs(attempt, null))
      } finally {
        clearTimeout(timer)
        options.signal?.removeEventListener('abort', onExternalAbort)
      }
    }

    return lastFailure
  }

  get<T>(path: string, options?: RequestOptions): Promise<PhylaxResult<T>> {
    return this.request<T>('GET', path, options)
  }

  post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<PhylaxResult<T>> {
    return this.request<T>('POST', path, { ...options, body })
  }

  patch<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<PhylaxResult<T>> {
    return this.request<T>('PATCH', path, { ...options, body })
  }

  delete<T>(path: string, options?: RequestOptions): Promise<PhylaxResult<T>> {
    return this.request<T>('DELETE', path, options)
  }
}
