import { PATHS } from '../constants.js'
import type { HttpClient } from '../client/http-client.js'
import type { Paginated, RequestOptions } from '../types/options.js'
import type { PhylaxResult } from '../types/result.js'
import type { Repository } from '../types/domain.js'

export interface ScanRepositoryInput {
  /** Lockfile contents keyed by filename, for example package-lock.json. */
  files: Record<string, string>
  url?: string | undefined
  policy?: string | undefined
}

export interface ScannedDependency {
  artifact: string
  version?: string | null
  verdict: string
  risk_band?: string | null
  finding_counts?: Record<string, number>
}

export interface RepositoryScanResult {
  url?: string | null
  verdict: string
  coverage: string
  dependencies_scanned: number
  dependencies_evaluated?: number
  blocked: ScannedDependency[]
  warned: ScannedDependency[]
  reason?: string
  [key: string]: unknown
}

export interface AddRepositoryInput {
  url: string
  provider?: 'github' | 'gitlab' | 'bitbucket' | string | undefined
  policy?: string | undefined
}

export class RepositoriesResource {
  readonly #http: HttpClient

  constructor(http: HttpClient) {
    this.#http = http
  }

  async list(
    options?: RequestOptions,
  ): Promise<PhylaxResult<Paginated<Repository>>> {
    return this.#http.get<Paginated<Repository>>(PATHS.repositories, options)
  }

  async get(
    id: string,
    options?: RequestOptions,
  ): Promise<PhylaxResult<Repository>> {
    return this.#http.get<Repository>(PATHS.repository(id), options)
  }

  async add(
    input: AddRepositoryInput,
    options?: RequestOptions,
  ): Promise<PhylaxResult<Repository>> {
    return this.#http.post<Repository>(PATHS.repositories, input, options)
  }

  async remove(
    id: string,
    options?: RequestOptions,
  ): Promise<PhylaxResult<void>> {
    return this.#http.delete<void>(PATHS.repository(id), options)
  }


  /**
   * Scan a repository by verifying every dependency its lockfiles install.
   *
   * Send the lockfile contents keyed by filename. Nothing about the repository
   * itself is fetched, so scanning a private repository never requires giving
   * Phylax a token for it.
   */
  async verify(
    input: ScanRepositoryInput,
    options?: RequestOptions,
  ): Promise<PhylaxResult<RepositoryScanResult>> {
    return this.#http.post<RepositoryScanResult>(
      PATHS.repositoryVerify,
      { url: input.url, files: input.files, policy: input.policy },
      options,
    )
  }
}
