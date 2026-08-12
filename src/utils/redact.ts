export function redactToken(value: string, token: string | undefined): string {
  if (!token || token.length < 8) {
    return value
  }
  return value.split(token).join('***')
}

export function truncate(value: string, max = 500): string {
  return value.length > max ? `${value.slice(0, max)}...` : value
}
