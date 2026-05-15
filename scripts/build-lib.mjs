import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const root = process.cwd()
const dist = resolve(root, 'dist')

rmSync(dist, { recursive: true, force: true })
mkdirSync(dist, { recursive: true })

execSync('tsc -p tsconfig.build.json', {
  cwd: root,
  stdio: 'inherit',
})

for (const file of ['base-shared.css']) {
  cpSync(resolve(root, 'src', 'demo', 'css', file), resolve(dist, file))
}
