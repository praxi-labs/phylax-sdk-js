/**
 * Finding the manifests and lockfiles an audit needs.
 *
 * Much narrower than {@link collectFiles}. An audit does not want your source:
 * it wants the files that say what will be installed, and the server fetches
 * the packages themselves from their registries. Sending a whole tree instead
 * would upload megabytes to answer a question about a few kilobytes.
 */

import { readFile, readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

/** Mirrors phylax_server.business.audit.manifests.ACCEPTED. */
export const MANIFEST_NAMES = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'poetry.lock',
  'Pipfile.lock',
  'requirements.txt',
  'package.json',
  'pyproject.toml',
])

const SKIP_DIRS = new Set([
  '.git', '.venv', '__pycache__', 'node_modules', 'dist', 'build', '.next',
  'coverage', '.turbo', 'vendor',
])

/** A lockfile can be large; a manifest never is. */
const MAX_BYTES = 8 * 1024 * 1024

export interface ManifestResult {
  files: Record<string, string>
  skipped: string[]
}

async function walk(dir: string, out: string[], depth: number): Promise<void> {
  // Deep enough for a monorepo, shallow enough not to crawl a whole disk.
  if (depth > 6) return
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      await walk(join(dir, entry.name), out, depth + 1)
    } else if (entry.isFile() && MANIFEST_NAMES.has(entry.name)) {
      out.push(join(dir, entry.name))
    }
  }
}

export async function collectManifests(root: string): Promise<ManifestResult> {
  const paths: string[] = []
  await walk(root, paths, 0)
  paths.sort()

  const files: Record<string, string> = {}
  const skipped: string[] = []
  let total = 0

  for (const path of paths) {
    const rel = relative(root, path).split(sep).join('/')
    let text: string
    try {
      text = await readFile(path, 'utf8')
    } catch {
      skipped.push(`${rel}: not readable`)
      continue
    }
    const size = Buffer.byteLength(text, 'utf8')
    if (total + size > MAX_BYTES) {
      skipped.push(`${rel}: would pass the ${MAX_BYTES} byte limit`)
      continue
    }
    files[rel] = text
    total += size
  }

  return { files, skipped }
}
