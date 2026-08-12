import type { RequestOptions } from '../types/options.js'

export function buildUrl(
  baseUrl: string,
  path: string,
  query: RequestOptions['query'],
): string {
  const url = new URL(path, baseUrl)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.href
}

export function segment(value: string): string {
  return encodeURIComponent(value)
}
