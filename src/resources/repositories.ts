import { PATHS } from '../constants.js'
import type { HttpClient } from '../client/http-client.js'
import type { Paginated, RequestOptions } from '../types/options.js'
import type { PhylaxResult } from '../types/result.js'
import type { Repository } from '../types/domain.js'

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

}
