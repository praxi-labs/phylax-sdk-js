import { PATHS } from '../constants.js'
import type { HttpClient } from '../client/http-client.js'
import type { Paginated, RequestOptions } from '../types/options.js'
import type { PhylaxResult } from '../types/result.js'
import type { SearchHit, VerificationResult } from '../types/domain.js'

export interface VerifyOptions extends RequestOptions {
  policy?: string | undefined
  include?: string[] | undefined
}

export interface ListArtifactsParams {
  ecosystem?: string | undefined
  limit?: number | undefined
  page?: number | undefined
}

export interface SearchParams {
  ecosystem?: string | undefined
  limit?: number | undefined
}

export class ArtifactsResource {
  readonly #http: HttpClient

  constructor(http: HttpClient) {
    this.#http = http
  }

  async verify(
    artifact: string,
    options: VerifyOptions = {},
  ): Promise<PhylaxResult<VerificationResult>> {
    const { policy, include, ...rest } = options
    return this.#http.post<VerificationResult>(
      PATHS.artifactVerify,
      {
        artifact,
        ...(policy ? { policy } : {}),
        ...(include ? { include } : {}),
      },
      rest,
    )
  }

  async verifyMany(
    artifacts: string[],
    options: VerifyOptions = {},
  ): Promise<PhylaxResult<VerificationResult[]>> {
    const { policy, include, ...rest } = options
    return this.#http.post<VerificationResult[]>(
      PATHS.artifactVerify,
      {
        artifacts,
        ...(policy ? { policy } : {}),
        ...(include ? { include } : {}),
      },
      rest,
    )
  }

  async get(
    artifact: string,
    options?: RequestOptions,
  ): Promise<PhylaxResult<VerificationResult>> {
    return this.#http.get<VerificationResult>(PATHS.artifact(artifact), options)
  }

  async list(
    params: ListArtifactsParams = {},
    options?: RequestOptions,
  ): Promise<PhylaxResult<Paginated<VerificationResult>>> {
    return this.#http.get<Paginated<VerificationResult>>(PATHS.artifacts, {
      ...options,
      query: { ...params, ...options?.query },
    })
  }

  async search(
    query: string,
    params: SearchParams = {},
    options?: RequestOptions,
  ): Promise<PhylaxResult<Paginated<SearchHit>>> {
    return this.#http.get<Paginated<SearchHit>>(PATHS.search, {
      ...options,
      query: { q: query, ...params, ...options?.query },
    })
  }
}
