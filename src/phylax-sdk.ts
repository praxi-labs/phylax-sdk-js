import { HttpClient } from './client/http-client.js'
import { buildUserAgent } from './client/user-agent.js'
import {
  DEFAULT_BASE_URL,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TIMEOUT_MS,
  PATHS,
} from './constants.js'
import { ArtifactsResource } from './resources/artifacts.js'
import { AttestationsResource } from './resources/attestations.js'
import { PoliciesResource } from './resources/policies.js'
import { QuotaResource } from './resources/quota.js'
import { RepositoriesResource } from './resources/repositories.js'
import { WebhooksResource } from './resources/webhooks.js'
import type { RequestOptions, PhylaxSdkOptions } from './types/options.js'
import type { PhylaxResult } from './types/result.js'
import type { HealthResponse, ServerIdentity } from './types/domain.js'

export class PhylaxSdk {
  readonly #http: HttpClient

  readonly artifacts: ArtifactsResource
  readonly attestations: AttestationsResource
  readonly policies: PoliciesResource
  readonly repositories: RepositoriesResource
  readonly webhooks: WebhooksResource
  readonly quota: QuotaResource

  constructor(options: PhylaxSdkOptions) {
    const apiToken = options.apiToken?.trim()
    if (!apiToken) {
      throw new TypeError(
        'A Phylax API token is required. Create one at https://app.phyi.dev/marketplace/keys',
      )
    }

    const fetchImpl = options.fetch ?? globalThis.fetch
    if (typeof fetchImpl !== 'function') {
      throw new TypeError(
        'No fetch implementation available. Use Node 18+ or pass options.fetch.',
      )
    }

    this.#http = new HttpClient({
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      apiToken,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      userAgent: buildUserAgent(options.userAgent),
      fetchImpl,
    })

    this.artifacts = new ArtifactsResource(this.#http)
    this.attestations = new AttestationsResource(this.#http)
    this.policies = new PoliciesResource(this.#http)
    this.repositories = new RepositoriesResource(this.#http)
    this.webhooks = new WebhooksResource(this.#http)
    this.quota = new QuotaResource(this.#http)
  }

  async health(
    options?: RequestOptions,
  ): Promise<PhylaxResult<HealthResponse>> {
    return this.#http.get<HealthResponse>(PATHS.health, options)
  }

  async serverIdentity(
    options?: RequestOptions,
  ): Promise<PhylaxResult<ServerIdentity>> {
    return this.#http.get<ServerIdentity>(PATHS.serverIdentity, options)
  }

  async me(options?: RequestOptions): Promise<PhylaxResult<unknown>> {
    return this.#http.get(PATHS.me, options)
  }
}
