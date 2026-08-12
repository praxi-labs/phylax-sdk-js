import { PATHS } from '../constants.js'
import type { HttpClient } from '../client/http-client.js'
import type { Paginated, RequestOptions } from '../types/options.js'
import type { PhylaxResult } from '../types/result.js'
import type { Webhook } from '../types/domain.js'

export interface CreateWebhookInput {
  url: string
  events: string[]
  secret?: string | undefined
}

export interface UpdateWebhookInput extends Partial<CreateWebhookInput> {
  active?: boolean | undefined
}

export class WebhooksResource {
  readonly #http: HttpClient

  constructor(http: HttpClient) {
    this.#http = http
  }

  async list(
    options?: RequestOptions,
  ): Promise<PhylaxResult<Paginated<Webhook>>> {
    return this.#http.get<Paginated<Webhook>>(PATHS.webhooks, options)
  }

  async get(
    id: string,
    options?: RequestOptions,
  ): Promise<PhylaxResult<Webhook>> {
    return this.#http.get<Webhook>(PATHS.webhook(id), options)
  }

  async create(
    input: CreateWebhookInput,
    options?: RequestOptions,
  ): Promise<PhylaxResult<Webhook>> {
    return this.#http.post<Webhook>(PATHS.webhooks, input, options)
  }

  async update(
    id: string,
    input: UpdateWebhookInput,
    options?: RequestOptions,
  ): Promise<PhylaxResult<Webhook>> {
    return this.#http.patch<Webhook>(PATHS.webhook(id), input, options)
  }

  async delete(
    id: string,
    options?: RequestOptions,
  ): Promise<PhylaxResult<void>> {
    return this.#http.delete<void>(PATHS.webhook(id), options)
  }
}
