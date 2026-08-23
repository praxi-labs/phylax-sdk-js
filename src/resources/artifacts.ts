import { PATHS } from '../constants.js'
import type { HttpClient } from '../client/http-client.js'
import type { Paginated, RequestOptions } from '../types/options.js'
import type { PhylaxResult } from '../types/result.js'
import type {
  AnalysisResult,
  ArtifactKind,
  SearchHit,
  VerificationResult,
} from '../types/domain.js'

export interface VerifyOptions extends RequestOptions {
  policy?: string | undefined
  include?: string[] | undefined
}

export interface AnalyseOptions extends RequestOptions {
  /** Hint the classifier. It decides for itself and flags a disagreement. */
  artifactType?: ArtifactKind | string | undefined
  /** A name for the artifact, echoed back on the result. */
  coordinate?: string | undefined
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

  /**
   * Analyse an artifact you supply, rather than looking one up.
   *
   * `verify` and `get` answer from what the network has already recorded, so an
   * artifact nobody has attested comes back with coverage `none` and a verdict
   * of ALLOW. That default is safe for a catalogue and wrong for a gate: the
   * artifact you most need judged is the one nobody has seen.
   *
   * This sends the source itself. The server classifies it, resolves the
   * champions promoted for that track, runs them against these bytes and fuses
   * their opinions with a static pass.
   *
   * @param files Relative path to file contents. Text only.
   */
  async analyse(
    files: Record<string, string>,
    options: AnalyseOptions = {},
  ): Promise<PhylaxResult<AnalysisResult>> {
    const { artifactType, coordinate, ...rest } = options
    return this.#http.post<AnalysisResult>(
      PATHS.artifactAnalyse,
      {
        files,
        ...(artifactType ? { artifact_type: artifactType } : {}),
        ...(coordinate ? { coordinate } : {}),
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
