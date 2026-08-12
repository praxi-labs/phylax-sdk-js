import { PATHS } from '../constants.js'
import type { HttpClient } from '../client/http-client.js'
import type { Paginated, RequestOptions } from '../types/options.js'
import type { PhylaxResult } from '../types/result.js'
import type {
  Attestation,
  AttestationVerification,
} from '../types/domain.js'

export interface ListAttestationsParams {
  limit?: number | undefined
  page?: number | undefined
}

export class AttestationsResource {
  readonly #http: HttpClient

  constructor(http: HttpClient) {
    this.#http = http
  }

  async list(
    artifact: string,
    params: ListAttestationsParams = {},
    options?: RequestOptions,
  ): Promise<PhylaxResult<Paginated<Attestation>>> {
    return this.#http.get<Paginated<Attestation>>(PATHS.attestations, {
      ...options,
      query: { artifact, ...params, ...options?.query },
    })
  }

  async get(
    id: string,
    options?: RequestOptions,
  ): Promise<PhylaxResult<Attestation>> {
    return this.#http.get<Attestation>(PATHS.attestation(id), options)
  }

  async verify(
    bundle: unknown,
    options?: RequestOptions,
  ): Promise<PhylaxResult<AttestationVerification>> {
    return this.#http.post<AttestationVerification>(
      PATHS.attestationVerify,
      bundle,
      options,
    )
  }
}
