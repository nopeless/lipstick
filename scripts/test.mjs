import { rmSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { execSync, spawnSync } from 'node:child_process'

const root = process.cwd()
const outDir = resolve(root, '.test-dist')

rmSync(outDir, { recursive: true, force: true })
execSync('tsc -p tsconfig.test.json', { cwd: root, stdio: 'inherit' })

const testFiles = collectTestFiles(resolve(outDir, 'tests'))

if (testFiles.length === 0) {
  console.error('No compiled test files found.')
  process.exit(1)
}

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
})

process.exit(result.status ?? 1)

function collectTestFiles(dir) {
  if (!existsSync(dir)) {
    return []
  }

  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stats = statSync(full)

    if (stats.isDirectory()) {
      files.push(...collectTestFiles(full))
      continue
    }

    if (entry.endsWith('.test.js')) {
      files.push(full)
    }
  }

  return files
}
