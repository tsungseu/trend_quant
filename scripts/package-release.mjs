import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version
const output = join(root, 'dist', `release-v${version}`)
mkdirSync(output, { recursive: true })
const staging = mkdtempSync(join(output, 'build-'))
const site = join(staging, 'site')
mkdirSync(site)

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}`)
  return result
}

const commit = run('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: 'pipe' }).stdout.trim()
if (!process.env.npm_execpath) throw new Error('Run this script with npm run release:pack')

// Fixed public paths keep the website and Studio in separate deployable directories.
const publicEnv = {
  ...process.env,
  VITE_DATA_MODE: 'demo',
  VITE_ALLOW_THIRD_PARTY_SCRIPTS: 'false',
  VITE_ENABLE_MOCK_LIVE: 'false',
  VITE_DATA_PROXY_BASE: '',
  VITE_RAG_API_URL: '/api',
  VITE_GATEWAY_API_URL: '/api',
  VITE_TERMINAL_URL: '/studio/#/app',
}
for (const [workspace, base, destination] of [
  ['web', '/', site],
  ['terminal', '/studio/', join(site, 'studio')],
  ['admin', '/admin/', join(site, 'admin')],
]) {
  run(process.execPath, [process.env.npm_execpath, 'run', 'build', '-w', `@trendquant/${workspace}`], {
    env: { ...publicEnv, VITE_PUBLIC_BASE: base },
  })
  cpSync(join(root, 'apps', workspace, 'dist'), destination, { recursive: true })
}

// Fail before publishing if CSS imports/fonts or entry assets point outside the package.
function verifyAssets(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name)
    if (entry.isDirectory()) { verifyAssets(file); continue }
    if (!/\.(css|html)$/.test(file)) continue
    const source = readFileSync(file, 'utf8')
    const refs = file.endsWith('.css')
      ? [...source.matchAll(/@import\s*["']([^"']+)["']|url\(\s*["']?([^"')\s]+)["']?\s*\)/g)].map((m) => m[1] || m[2])
      : [...source.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((m) => m[1])
    for (const ref of refs) {
      if (/^(?:[a-z]+:|\/\/|#)/i.test(ref)) continue
      const pathname = ref.split(/[?#]/)[0]
      const target = pathname.startsWith('/') ? join(site, pathname.slice(1)) : resolve(dirname(file), pathname)
      if (!existsSync(target)) throw new Error(`Missing packaged asset: ${ref} in ${file}`)
    }
  }
}
verifyAssets(site)

const manifest = {
  version, commit, builtAt: new Date().toISOString(), dataMode: 'demo',
  routes: { website: '/', agent: '/#/agent', studio: '/studio/#/app', admin: '/admin/' },
  api: 'Optional reverse proxy: /api/* -> API server /* (strip /api prefix)',
}
writeFileSync(join(site, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
cpSync(join(root, 'docs', 'RELEASING.md'), join(site, 'DEPLOYMENT.md'))
cpSync(join(root, 'CHANGELOG.md'), join(site, 'CHANGELOG.md'))

const archive = `trendquant-v${version}-static.tar.gz`
run('tar', ['-czf', join(output, archive), '-C', site, '.'])
const hash = createHash('sha256').update(readFileSync(join(output, archive))).digest('hex')
writeFileSync(join(output, 'SHA256SUMS'), `${hash}  ${archive}\n`)
writeFileSync(join(output, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`Release package: ${join(output, archive)}`)
