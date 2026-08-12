export interface PhylaxSdkOptions {
  apiToken: string
  baseUrl?: string | undefined
  timeoutMs?: number | undefined
  maxRetries?: number | undefined
  userAgent?: string | undefined
  fetch?: typeof globalThis.fetch | undefined
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined> | undefined
  signal?: AbortSignal | undefined
}

export interface Paginated<T> {
  items: T[]
  page?: number
  page_size?: number
  next_page?: number | null
  [key: string]: unknown
}
