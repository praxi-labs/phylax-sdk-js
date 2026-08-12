import { PATHS } from '../constants.js'
import type { HttpClient } from '../client/http-client.js'
import type { Paginated, RequestOptions } from '../types/options.js'
import type { PhylaxResult } from '../types/result.js'
import type { Policy, PolicyEvaluation } from '../types/domain.js'

export interface EvaluateInput {
  artifact: string
  policy?: string | undefined
  include?: string[] | undefined
}

export class PoliciesResource {
  readonly #http: HttpClient

  constructor(http: HttpClient) {
    this.#http = http
  }

  async list(
    options?: RequestOptions,
  ): Promise<PhylaxResult<Paginated<Policy>>> {
    return this.#http.get<Paginated<Policy>>(PATHS.policies, options)
  }

  async get(
    id: string,
    options?: RequestOptions,
  ): Promise<PhylaxResult<Policy>> {
    return this.#http.get<Policy>(PATHS.policy(id), options)
  }

  async create(
    policy: Policy,
    options?: RequestOptions,
  ): Promise<PhylaxResult<Policy>> {
    return this.#http.post<Policy>(PATHS.policies, policy, options)
  }

  async update(
    id: string,
    policy: Partial<Policy>,
    options?: RequestOptions,
  ): Promise<PhylaxResult<Policy>> {
    return this.#http.patch<Policy>(PATHS.policy(id), policy, options)
  }

  async delete(
    id: string,
    options?: RequestOptions,
  ): Promise<PhylaxResult<void>> {
    return this.#http.delete<void>(PATHS.policy(id), options)
  }

  async evaluate(
    input: EvaluateInput,
    options?: RequestOptions,
  ): Promise<PhylaxResult<PolicyEvaluation>> {
    return this.#http.post<PolicyEvaluation>(PATHS.policyEvaluate, input, options)
  }
}
