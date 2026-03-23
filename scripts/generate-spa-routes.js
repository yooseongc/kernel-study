/**
 * 빌드 후 SPA 라우트별 index.html을 생성합니다.
 * GitHub Pages는 서버사이드 라우팅을 지원하지 않으므로,
 * 각 라우트 경로에 index.html 사본을 배치하여 직접 접근/새로고침을 지원합니다.
 */
import { cpSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dist = resolve(__dirname, '..', 'dist')
const source = resolve(dist, 'index.html')

const routes = [
    'topic/01-overview',
    'topic/02-scheduler',
    'topic/03-memory',
    'topic/04-filesystem',
    'topic/05-interrupts',
    'topic/06-network-stack',
    'topic/07-netfilter',
    'topic/08-xdp-ebpf',
    'topic/09-synchronization',
    'topic/10-drivers',
    'topic/11-debugging',
    'topic/12-security',
    'topic/13-kvm',
    'glossary',
    'graph',
]

if (!existsSync(source)) {
    console.error('dist/index.html not found. Run build first.')
    process.exit(1)
}

for (const route of routes) {
    const target = resolve(dist, route, 'index.html')
    mkdirSync(dirname(target), { recursive: true })
    cpSync(source, target)
}

console.log(`Generated ${routes.length} SPA route entries.`)
