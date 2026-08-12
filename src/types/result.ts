export type PhylaxErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'plan_required'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'not_found'
  | 'invalid_request'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'aborted'

export type PhylaxSuccess<T> = {
  success: true
  status: number
  data: T
  error?: undefined
  code?: undefined
  cause?: undefined
}

export type PhylaxFailure = {
  success: false
  status: number
  code: PhylaxErrorCode
  error: string
  cause?: string | undefined
  data?: undefined
}

export type PhylaxResult<T> = PhylaxSuccess<T> | PhylaxFailure

export function classifyStatus(status: number): PhylaxErrorCode {
  switch (status) {
    case 401:
      return 'unauthenticated'
    case 402:
      return 'plan_required'
    case 403:
      return 'forbidden'
    case 404:
      return 'not_found'
    case 408:
      return 'timeout'
    case 429:
      return 'rate_limited'
    default:
      if (status >= 500) {
        return 'server_error'
      }
      return status >= 400 ? 'invalid_request' : 'server_error'
  }
}

export function isRetryableCode(code: PhylaxErrorCode): boolean {
  return code === 'rate_limited' || code === 'server_error' || code === 'timeout'
}
