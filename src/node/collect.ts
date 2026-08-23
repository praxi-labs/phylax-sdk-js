/**
 * Reading a directory into the file map `artifacts.analyse` expects.
 *
 * This lives behind the `@phyi/sdk/node` subpath rather than the main entry
 * point because it touches the filesystem. A browser bundle that imported the
 * root would otherwise have to resolve `node:fs`, which it cannot.
 *
 * The server's own limits are mirrored here so an oversized artifact is trimmed
 * deliberately and the caller is told what was dropped, rather than meeting a
 * 413 that does not say which file was at fault.
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

/** Mirrors phylax_server.business.routers.artifacts. */
export const MAX_FILES = 200
export const MAX_FILE_BYTES = 512 * 1024
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024

const TEXT_SUFFIXES = new Set([
  '.cfg', '.cjs', '.go', '.ini', '.java', '.js', '.json', '.jsx', '.kt',
  '.lock', '.md', '.mjs', '.php', '.ps1', '.py', '.rb', '.rs', '.sh',
  '.toml', '.ts', '.tsx', '.txt', '.yaml', '.yml',
])

/** Extensionless files that still carry real signal. */
const TEXT_NAMES = new Set([
  'Dockerfile', 'Makefile', 'Procfile', 'SKILL.md', '.npmrc', 'binding.gyp',
])

const SKIP_DIRS = new Set([
  '.git', '.venv', '__pycache__', 'node_modules', 'dist', 'build', '.next',
  'coverage', '.turbo',
])

export interface CollectResult {
  /** Relative POSIX path to file contents, ready to pass to `analyse`. */
  files: Record<string, string>
  /** What was left out, and why. Never silent. */
  skipped: string[]
  bytes: number
}

function wanted(name: string): boolean {
  if (TEXT_NAMES.has(name)) return true
  const dot = name.lastIndexOf('.')
  return dot !== -1 && TEXT_SUFFIXES.has(name.slice(dot).toLowerCase())
}

async function walk(dir: string, out: string[]): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      await walk(join(dir, entry.name), out)
    } else if (entry.isFile()) {
      out.push(join(dir, entry.name))
    }
  }
}

/**
 * Collect a directory's source into the shape `artifacts.analyse` takes.
 *
 * Paths are POSIX-normalised because the server keys findings by them, and a
 * backslash on Windows would produce findings nobody can locate.
 */
export async function collectFiles(root: string): Promise<CollectResult> {
  const paths: string[] = []
  await walk(root, paths)
  paths.sort()

  const files: Record<string, string> = {}
  const skipped: string[] = []
  let total = 0

  for (const path of paths) {
    const rel = relative(root, path).split(sep).join('/')
    const base = rel.slice(rel.lastIndexOf('/') + 1)
    if (!wanted(base)) continue

    let size: number
    try {
      size = (await stat(path)).size
    } catch {
      continue
    }
    if (size > MAX_FILE_BYTES) {
      skipped.push(`${rel}: ${size} bytes, over the ${MAX_FILE_BYTES} limit`)
      continue
    }
    if (Object.keys(files).length >= MAX_FILES) {
      skipped.push(`${rel}: past the ${MAX_FILES} file limit`)
      continue
    }
    if (total + size > MAX_TOTAL_BYTES) {
      skipped.push(`${rel}: would pass the ${MAX_TOTAL_BYTES} byte limit`)
      continue
    }

    let text: string
    try {
      text = await readFile(path, 'utf8')
    } catch {
      skipped.push(`${rel}: not readable as utf-8`)
      continue
    }
    files[rel] = text
    total += size
  }

  return { files, skipped, bytes: total }
}
