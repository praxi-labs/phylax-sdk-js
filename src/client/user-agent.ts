import { SDK_NAME, SDK_VERSION } from '../version.js'

export function buildUserAgent(suffix?: string | undefined): string {
  const runtime =
    typeof process !== 'undefined' && process.versions?.node
      ? ` node/${process.versions.node}`
      : ''
  const base = `${SDK_NAME}/${SDK_VERSION}${runtime}`
  return suffix ? `${suffix} ${base}` : base
}
