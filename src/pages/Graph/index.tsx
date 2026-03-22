import { useState, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import { kernelTopics } from '../../data/kernelTopics'
import { glossary } from '../../data/glossary'
import { useTheme } from '../../hooks/useTheme'
import { D3Container } from '../../components/viz/D3Container'

// ── 카테고리 메타데이터 ─────────────────────────────────────────────────────
const CAT_COLOR: Record<string, string> = {
    process: '#3b82f6',
    memory: '#a855f7',
    network: '#22c55e',
    interrupt: '#f97316',
    sync: '#ef4444',
    driver: '#eab308',
    debug: '#9ca3af',
    general: '#14b8a6',
    fs: '#84cc16',
    security: '#f43f5e',
    virt: '#06b6d4',
}
const CAT_LABEL: Record<string, string> = {
    process: '프로세스',
    memory: '메모리',
    network: '네트워크',
    interrupt: '인터럽트',
    sync: '동기화',
    driver: '드라이버',
    debug: '디버깅',
    general: '일반',
    fs: '파일시스템',
    security: '보안',
    virt: '가상화',
}

// ── 13개 토픽 색상 (hue 균등 분배) ──────────────────────────────────────────
const TOPIC_HUES = [250, 278, 305, 332, 5, 30, 57, 85, 112, 140, 168, 196, 224]

function topicStroke(idx: number, isDark: boolean): string {
    const h = TOPIC_HUES[idx % TOPIC_HUES.length]
    return isDark ? `oklch(62% 0.18 ${h})` : `oklch(45% 0.18 ${h})`
}
function topicFill(idx: number, isDark: boolean): string {
    const h = TOPIC_HUES[idx % TOPIC_HUES.length]
    return isDark ? `oklch(22% 0.08 ${h})` : `oklch(93% 0.04 ${h})`
}

// ── GraphNode / GraphLink 타입 ────────────────────────────────────────────
interface GraphNode extends d3.SimulationNodeDatum {
    id: string
    type: 'topic' | 'glossary'
    label: string
    category?: string
    topicIndex?: number
    route: string
    r: number
}
interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    kind: 'sharedTag' | 'topicRef'
}

// ── 그래프 데이터 빌드 ───────────────────────────────────────────────────────
function buildData(
    showTopics: boolean,
    showGlossary: boolean,
    activeCategory: string | null,
): { nodes: GraphNode[]; links: GraphLink[] } {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []

    if (showTopics) {
        kernelTopics.forEach((t, i) => {
            nodes.push({
                id: `topic:${t.id}`,
                type: 'topic',
                label: `${String(t.number).padStart(2, '0')}. ${t.title}`,
                topicIndex: i,
                route: t.route,
                r: 32,
            })
        })
    }

    const filteredGlossary = glossary.filter((g) => (activeCategory ? g.category === activeCategory : true))
    if (showGlossary) {
        filteredGlossary.forEach((g) => {
            nodes.push({
                id: `glossary:${g.id}`,
                type: 'glossary',
                label: g.term,
                category: g.category,
                route: `/glossary#${g.id}`,
                r: 12,
            })
        })
    }

    const nodeIds = new Set(nodes.map((n) => n.id))

    // 토픽-토픽: 공통 태그
    if (showTopics) {
        for (let i = 0; i < kernelTopics.length; i++) {
            for (let j = i + 1; j < kernelTopics.length; j++) {
                const shared = kernelTopics[i].tags.filter((t) => kernelTopics[j].tags.includes(t))
                if (shared.length > 0) {
                    links.push({
                        source: `topic:${kernelTopics[i].id}`,
                        target: `topic:${kernelTopics[j].id}`,
                        kind: 'sharedTag',
                    })
                }
            }
        }
    }

    // 용어-토픽: topicRef
    if (showTopics && showGlossary) {
        filteredGlossary.forEach((g) => {
            if (!g.topicRef) return
            const src = `glossary:${g.id}`
            const tgt = `topic:${g.topicRef}`
            if (nodeIds.has(src) && nodeIds.has(tgt)) {
                links.push({ source: src, target: tgt, kind: 'topicRef' })
            }
        })
    }

    return { nodes, links }
}

// ── D3 렌더 함수 ─────────────────────────────────────────────────────────────
function renderGraph(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    nodes: GraphNode[],
    links: GraphLink[],
    isDark: boolean,
    onNavigate: (href: string) => void,
    tooltipEl: HTMLDivElement | null,
) {
    // D3Container의 zoom이 첫 번째 g에 attach됨
    const g = svg.append('g')

    const edgeColor = isDark ? 'oklch(55% 0 0)' : 'oklch(55% 0 0)'
    const edgeColorDash = isDark ? 'oklch(50% 0.06 250)' : 'oklch(55% 0.06 250)'

    // 링크
    const linkSel = g
        .append('g')
        .selectAll<SVGLineElement, GraphLink>('line')
        .data(links)
        .join('line')
        .attr('stroke', (d) => (d.kind === 'sharedTag' ? edgeColor : edgeColorDash))
        .attr('stroke-width', (d) => (d.kind === 'sharedTag' ? 2.5 : 1.5))
        .attr('stroke-dasharray', (d) => (d.kind === 'topicRef' ? '6,4' : 'none'))
        .attr('opacity', (d) => (d.kind === 'sharedTag' ? 0.7 : 0.5))

    // 노드 그룹
    const nodeSel = g
        .append('g')
        .selectAll<SVGGElement, GraphNode>('g')
        .data(nodes)
        .join('g')
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
            event.stopPropagation()
            onNavigate(d.route)
        })
        .on('mouseenter', (event, d) => {
            if (!tooltipEl) return
            tooltipEl.style.display = 'block'
            tooltipEl.style.left = `${event.offsetX + 14}px`
            tooltipEl.style.top = `${event.offsetY - 14}px`
            tooltipEl.textContent = d.label
        })
        .on('mousemove', (event) => {
            if (!tooltipEl) return
            tooltipEl.style.left = `${event.offsetX + 14}px`
            tooltipEl.style.top = `${event.offsetY - 14}px`
        })
        .on('mouseleave', () => {
            if (tooltipEl) tooltipEl.style.display = 'none'
        })

    // 원
    nodeSel
        .append('circle')
        .attr('r', (d) => d.r)
        .attr('fill', (d) => {
            if (d.type === 'topic') return topicFill(d.topicIndex!, isDark)
            const base = CAT_COLOR[d.category ?? 'general']
            return base + (isDark ? '28' : '20')
        })
        .attr('stroke', (d) => {
            if (d.type === 'topic') return topicStroke(d.topicIndex!, isDark)
            return CAT_COLOR[d.category ?? 'general']
        })
        .attr('stroke-width', (d) => (d.type === 'topic' ? 2.5 : 1.5))

    // 토픽 번호 레이블 (원 안)
    nodeSel
        .filter((d) => d.type === 'topic')
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', (d) => topicStroke(d.topicIndex!, isDark))
        .attr('font-size', '13px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', 'bold')
        .attr('pointer-events', 'none')
        .text((d) => String((d.topicIndex ?? 0) + 1).padStart(2, '0'))

    // 토픽 타이틀 레이블 (원 아래, 상시 표시)
    nodeSel
        .filter((d) => d.type === 'topic')
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', (d) => d.r + 14)
        .attr('fill', (d) => topicStroke(d.topicIndex!, isDark))
        .attr('font-size', '10px')
        .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
        .attr('pointer-events', 'none')
        .text((d) => {
            const title = d.label.replace(/^\d+\.\s*/, '')
            return title.length > 14 ? title.slice(0, 13) + '…' : title
        })

    // 용어 텍스트 레이블 (원 우측, 상시 표시)
    nodeSel
        .filter((d) => d.type === 'glossary')
        .append('text')
        .attr('x', (d) => d.r + 5)
        .attr('y', 1)
        .attr('dominant-baseline', 'middle')
        .attr('fill', (d) => CAT_COLOR[d.category ?? 'general'])
        .attr('font-size', '9px')
        .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
        .attr('pointer-events', 'none')
        .text((d) => d.label)

    // 초기 위치를 중심 근처에 원형 배치
    const cx = width / 2
    const cy = height / 2
    nodes.forEach((n, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI
        const radius = n.type === 'topic' ? 120 : 200 + Math.random() * 80
        n.x = cx + Math.cos(angle) * radius
        n.y = cy + Math.sin(angle) * radius
    })

    // Force 시뮬레이션
    const sim = d3
        .forceSimulation<GraphNode>(nodes)
        .alpha(0.5)
        .alphaDecay(0.03)
        .force(
            'link',
            d3
                .forceLink<GraphNode, GraphLink>(links)
                .id((d) => d.id)
                .distance((d) => (d.kind === 'sharedTag' ? 220 : 110))
                .strength((d) => (d.kind === 'sharedTag' ? 0.15 : 0.35)),
        )
        .force(
            'charge',
            d3.forceManyBody<GraphNode>().strength((d) => (d.type === 'topic' ? -600 : -80)),
        )
        // forceX/forceY로 중심 유지 + 경계 이탈 방지
        .force('x', d3.forceX(cx).strength(0.08))
        .force('y', d3.forceY(cy).strength(0.08))
        .force(
            'collision',
            d3.forceCollide<GraphNode>((d) => (d.type === 'topic' ? d.r + 25 : d.r + 28)),
        )
        .on('tick', () => {
            linkSel
                .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
                .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
                .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
                .attr('y2', (d) => (d.target as GraphNode).y ?? 0)
            nodeSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
        })

    // 드래그
    nodeSel.call(
        d3
            .drag<SVGGElement, GraphNode>()
            .on('start', (event, d) => {
                if (!event.active) sim.alphaTarget(0.3).restart()
                d.fx = d.x
                d.fy = d.y
            })
            .on('drag', (event, d) => {
                d.fx = event.x
                d.fy = event.y
            })
            .on('end', (event, d) => {
                if (!event.active) sim.alphaTarget(0)
                d.fx = null
                d.fy = null
            }),
    )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
export default function Graph() {
    const navigate = useNavigate()
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const tooltipRef = useRef<HTMLDivElement>(null)

    const [showTopics, setShowTopics] = useState(true)
    const [showGlossary, setShowGlossary] = useState(true)
    const [activeCategory, setActiveCategory] = useState<string | null>(null)

    const { nodes, links } = useMemo(
        () => buildData(showTopics, showGlossary, activeCategory),
        [showTopics, showGlossary, activeCategory],
    )

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderGraph(svg, w, h, nodes, links, isDark, (href) => navigate(href), tooltipRef.current)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [nodes, links, isDark],
    )

    const btnBase = 'text-xs px-2.5 py-1 rounded-full border transition-colors'
    const btnActive = 'bg-blue-600 text-white border-blue-600'
    const btnInactive =
        'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-600'

    return (
        <div className="max-w-6xl mx-auto px-6 py-10">
            {/* Header */}
            <header className="space-y-2 mb-8">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    개념 지도
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">커널 개념 그래프</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    토픽과 용어 간의 연결 관계를 시각화합니다. 실선은 공통 태그를 가진 토픽 연결, 점선은 용어의 토픽
                    참조입니다. 노드를 클릭하면 해당 페이지로 이동합니다.
                </p>
            </header>

            {/* 필터 */}
            <div className="flex flex-wrap gap-2 mb-3">
                <button
                    onClick={() => setShowTopics((v) => !v)}
                    className={`${btnBase} ${showTopics ? btnActive : btnInactive}`}
                >
                    토픽 ({kernelTopics.length})
                </button>
                <button
                    onClick={() => setShowGlossary((v) => !v)}
                    className={`${btnBase} ${showGlossary ? btnActive : btnInactive}`}
                >
                    용어 ({glossary.length})
                </button>
                <span className="text-xs text-gray-300 dark:text-gray-700 self-center">│</span>
                {Object.keys(CAT_LABEL).map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                        className={`${btnBase} ${
                            activeCategory === cat ? 'text-white border-transparent' : btnInactive
                        }`}
                        style={
                            activeCategory === cat
                                ? { backgroundColor: CAT_COLOR[cat], borderColor: CAT_COLOR[cat] }
                                : undefined
                        }
                    >
                        {CAT_LABEL[cat]}
                    </button>
                ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-600 mb-3">
                {nodes.length}개 노드 · {links.length}개 연결
                {activeCategory && ` · 카테고리: ${CAT_LABEL[activeCategory]}`}
            </p>

            {/* 그래프 */}
            <div className="relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
                <D3Container renderFn={renderFn} deps={[nodes, links, isDark]} height={800} zoomable />
                {/* 툴팁 */}
                <div
                    ref={tooltipRef}
                    style={{ display: 'none', position: 'absolute', pointerEvents: 'none' }}
                    className="z-10 px-2 py-1 text-xs rounded shadow-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 max-w-[200px]"
                />
            </div>

            {/* 범례 */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 bg-gray-400" />
                    <span>공통 태그 (토픽-토픽)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-0.5 border-t border-dashed border-gray-400" />
                    <span>토픽 참조 (용어→토픽)</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                        <span className="text-[7px] font-mono font-bold text-blue-500">01</span>
                    </div>
                    <span>토픽 노드</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CAT_COLOR.memory }} />
                    <span>용어 노드 (카테고리 색상)</span>
                </div>
            </div>
        </div>
    )
}
