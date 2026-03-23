import { useState, useCallback } from 'react'
import * as d3 from 'd3'
import { KernelRef } from '../../components/ui/KernelRef'
import * as snippets from './codeSnippets'
import { CodeBlock, D3Container, InfoBox, InfoTable, LearningCard, Prose, Section, T, TopicNavigation, themeColors, useTheme } from '@study-ui/components'

// ── 7.2 Netfilter 5개 훅 포인트 D3 다이어그램 (Wikipedia-style) ──────────────
function renderNetfilterFlow(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _width: number,
    _height: number,
) {
    const VW = 1100,
        VH = 480
    svg.attr('viewBox', `0 0 ${VW} ${VH}`).attr('preserveAspectRatio', 'xMidYMid meet')

    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const textFill = c.text
    const dimFill = c.textMuted
    const edgeColor = c.textMuted
    const bgFill = c.bg
    const bgStroke = c.border

    // Table colors
    const TBL = {
        conntrack: { fill: c.cyanFill, stroke: c.cyanStroke, label: 'conntrack' },
        raw: { fill: c.bgCard, stroke: c.border, label: 'raw' },
        mangle: { fill: c.purpleFill, stroke: c.purpleStroke, label: 'mangle' },
        nat: { fill: c.greenFill, stroke: c.greenStroke, label: 'nat' },
        filter: { fill: c.redFill, stroke: c.redStroke, label: 'filter' },
    }

    // Hook node border colors
    const hookColors: Record<string, { fill: string; stroke: string }> = {
        PREROUTING: { fill: c.blueFill, stroke: c.blueStroke },
        INPUT: { fill: c.greenFill, stroke: c.greenStroke },
        FORWARD: { fill: c.amberFill, stroke: c.amberStroke },
        OUTPUT: { fill: c.redFill, stroke: c.redStroke },
        POSTROUTING: { fill: c.purpleFill, stroke: c.purpleStroke },
    }

    const defs = svg.append('defs')
    defs.append('marker')
        .attr('id', 'nf-arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 9)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', edgeColor)

    const g = svg.append('g')

    // ── Layout constants ──────────────────────────────────────────────────────
    const MID_Y = 220
    const TOP_Y = 80
    const BOT_Y = 370
    const NR = 6

    // Hook node dimensions (tall enough for table list)
    const HW = 130
    const HH = 130
    // Small box dimensions
    const SW = 90
    const SH = 36

    // Table pill dimensions
    const PILL_W = 110
    const PILL_H = 14
    const PILL_GAP = 2

    // X positions
    const NIC_IN_X = 30
    const PREROUT_X = 160
    const DIAMOND1_X = 340
    const INPUT_X = 230
    const PROCESS_X = 450
    const FORWARD_X = 450
    const OUTPUT_X = 650
    const DIAMOND2_X = 810
    const POSTRT_X = 860
    const NIC_OUT_X = 1020

    // ── Helpers ───────────────────────────────────────────────────────────────
    type TableEntry = { fill: string; stroke: string; label: string }

    function drawHookNode(
        cx: number,
        cy: number,
        name: string,
        tables: TableEntry[],
        col: { fill: string; stroke: string },
    ) {
        const h = HH
        // Background rect
        g.append('rect')
            .attr('x', cx - HW / 2)
            .attr('y', cy - h / 2)
            .attr('width', HW)
            .attr('height', h)
            .attr('rx', NR)
            .attr('fill', col.fill)
            .attr('stroke', col.stroke)
            .attr('stroke-width', 2)

        // Hook name
        g.append('text')
            .attr('x', cx)
            .attr('y', cy - h / 2 + 16)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', textFill)
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(name)

        // Separator line
        const sepY = cy - h / 2 + 28
        g.append('line')
            .attr('x1', cx - HW / 2 + 6)
            .attr('y1', sepY)
            .attr('x2', cx + HW / 2 - 6)
            .attr('y2', sepY)
            .attr('stroke', col.stroke)
            .attr('stroke-opacity', 0.5)
            .attr('stroke-width', 1)

        // Table pills
        const startY = sepY + 6
        tables.forEach((t, i) => {
            const py = startY + i * (PILL_H + PILL_GAP)
            g.append('rect')
                .attr('x', cx - PILL_W / 2)
                .attr('y', py)
                .attr('width', PILL_W)
                .attr('height', PILL_H)
                .attr('rx', 3)
                .attr('fill', t.fill)
                .attr('stroke', t.stroke)
                .attr('stroke-width', 1)
            g.append('text')
                .attr('x', cx)
                .attr('y', py + PILL_H / 2)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', textFill)
                .attr('font-size', '8.5px')
                .attr('font-family', "'JetBrains Mono', monospace")
                .text(t.label)
        })
    }

    function drawSmallBox(cx: number, cy: number, label: string, sub: string) {
        g.append('rect')
            .attr('x', cx - SW / 2)
            .attr('y', cy - SH / 2)
            .attr('width', SW)
            .attr('height', SH)
            .attr('rx', NR)
            .attr('fill', bgFill)
            .attr('stroke', bgStroke)
            .attr('stroke-width', 1.5)
        g.append('text')
            .attr('x', cx)
            .attr('y', sub ? cy - 5 : cy)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', textFill)
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(label)
        if (sub) {
            g.append('text')
                .attr('x', cx)
                .attr('y', cy + 8)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', dimFill)
                .attr('font-size', '8px')
                .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
                .text(sub)
        }
    }

    function drawDiamond(cx: number, cy: number, label1: string, label2: string) {
        const dw = 60, dh = 44
        const path = `M ${cx},${cy - dh / 2} L ${cx + dw / 2},${cy} L ${cx},${cy + dh / 2} L ${cx - dw / 2},${cy} Z`
        g.append('path')
            .attr('d', path)
            .attr('fill', c.indigoFill)
            .attr('stroke', c.indigoStroke)
            .attr('stroke-width', 1.8)
        g.append('text')
            .attr('x', cx)
            .attr('y', cy - 6)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', c.indigoText)
            .attr('font-size', '9px')
            .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
            .attr('font-weight', 'bold')
            .text(label1)
        g.append('text')
            .attr('x', cx)
            .attr('y', cy + 7)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', c.indigoText)
            .attr('font-size', '9px')
            .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
            .attr('font-weight', 'bold')
            .text(label2)
    }

    function arrow(d: string, label?: string, lx?: number, ly?: number) {
        g.append('path')
            .attr('d', d)
            .attr('fill', 'none')
            .attr('stroke', edgeColor)
            .attr('stroke-width', 1.5)
            .attr('marker-end', 'url(#nf-arrow)')
        if (label && lx !== undefined && ly !== undefined) {
            // Background rect for label readability
            const tempText = g.append('text').attr('font-size', '8px').text(label)
            const bbox = (tempText.node() as SVGTextElement).getBBox()
            tempText.remove()
            g.append('rect')
                .attr('x', lx - bbox.width / 2 - 3)
                .attr('y', ly - bbox.height / 2 - 1)
                .attr('width', bbox.width + 6)
                .attr('height', bbox.height + 2)
                .attr('rx', 2)
                .attr('fill', bgFill)
                .attr('fill-opacity', 0.85)
            g.append('text')
                .attr('x', lx)
                .attr('y', ly)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', dimFill)
                .attr('font-size', '8px')
                .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
                .text(label)
        }
    }

    // ── Draw nodes ────────────────────────────────────────────────────────────
    // NIC (수신)
    drawSmallBox(NIC_IN_X + SW / 2, MID_Y, 'NIC (수신)', '')

    // PREROUTING
    drawHookNode(PREROUT_X + HW / 2, MID_Y, 'PREROUTING', [
        TBL.raw, TBL.conntrack, TBL.mangle, { ...TBL.nat, label: 'nat (DNAT)' },
    ], hookColors.PREROUTING)

    // Routing diamond 1 (after PREROUTING)
    drawDiamond(DIAMOND1_X, MID_Y, '라우팅', '결정')

    // INPUT (top path)
    drawHookNode(INPUT_X + HW / 2, TOP_Y, 'INPUT', [
        TBL.mangle, { ...TBL.nat, label: 'nat (DNAT)' }, TBL.filter,
    ], hookColors.INPUT)

    // Process (top path)
    drawSmallBox(PROCESS_X, TOP_Y, '프로세스', '(User Space)')

    // OUTPUT (top path)
    drawHookNode(OUTPUT_X + HW / 2, TOP_Y, 'OUTPUT', [
        TBL.raw, TBL.conntrack, TBL.mangle, { ...TBL.nat, label: 'nat (DNAT)' }, TBL.filter,
    ], hookColors.OUTPUT)

    // FORWARD (bottom path)
    drawHookNode(FORWARD_X + HW / 2, BOT_Y, 'FORWARD', [
        TBL.mangle, TBL.filter,
    ], hookColors.FORWARD)

    // Routing diamond 2 (after OUTPUT, merge point)
    drawDiamond(DIAMOND2_X, MID_Y, '라우팅', '결정')

    // POSTROUTING
    drawHookNode(POSTRT_X + HW / 2, MID_Y, 'POSTROUTING', [
        TBL.mangle, { ...TBL.nat, label: 'nat (SNAT)' },
    ], hookColors.POSTROUTING)

    // NIC (송신)
    drawSmallBox(NIC_OUT_X + SW / 2, MID_Y, 'NIC (송신)', '')

    // ── Draw arrows ───────────────────────────────────────────────────────────
    // NIC_IN → PREROUTING
    arrow(`M ${NIC_IN_X + SW},${MID_Y} L ${PREROUT_X},${MID_Y}`)

    // PREROUTING → Diamond1
    arrow(`M ${PREROUT_X + HW},${MID_Y} L ${DIAMOND1_X - 30},${MID_Y}`)

    // Diamond1 → INPUT (curve up)
    const inputRight = INPUT_X + HW
    arrow(
        `M ${DIAMOND1_X},${MID_Y - 22} C ${DIAMOND1_X},${MID_Y - 70} ${inputRight - 20},${TOP_Y + HH / 2 + 30} ${inputRight},${TOP_Y + HH / 2}`,
        'LOCAL_IN',
        DIAMOND1_X - 10,
        MID_Y - 60,
    )

    // Diamond1 → FORWARD (curve down)
    arrow(
        `M ${DIAMOND1_X},${MID_Y + 22} C ${DIAMOND1_X},${MID_Y + 70} ${FORWARD_X},${BOT_Y - HH / 2 - 30} ${FORWARD_X},${BOT_Y - HH / 2}`,
        'FORWARD',
        DIAMOND1_X + 30,
        MID_Y + 65,
    )

    // INPUT → Process
    arrow(`M ${inputRight},${TOP_Y} L ${PROCESS_X - SW / 2},${TOP_Y}`)

    // Process → OUTPUT
    arrow(`M ${PROCESS_X + SW / 2},${TOP_Y} L ${OUTPUT_X},${TOP_Y}`)

    // OUTPUT → Diamond2 (curve down to mid)
    const outputRight = OUTPUT_X + HW
    arrow(
        `M ${outputRight},${TOP_Y + HH / 2} C ${outputRight + 20},${TOP_Y + HH / 2 + 40} ${DIAMOND2_X},${MID_Y - 60} ${DIAMOND2_X},${MID_Y - 22}`,
    )

    // FORWARD → Diamond2 (curve up to mid)
    const fwdRight = FORWARD_X + HW
    arrow(
        `M ${fwdRight},${BOT_Y - HH / 2} C ${fwdRight + 30},${BOT_Y - HH / 2 - 40} ${DIAMOND2_X},${MID_Y + 60} ${DIAMOND2_X},${MID_Y + 22}`,
    )

    // Diamond2 → POSTROUTING
    arrow(`M ${DIAMOND2_X + 30},${MID_Y} L ${POSTRT_X},${MID_Y}`)

    // POSTROUTING → NIC_OUT
    arrow(`M ${POSTRT_X + HW},${MID_Y} L ${NIC_OUT_X},${MID_Y}`)

    // ── Section label ─────────────────────────────────────────────────────────
    g.append('text')
        .attr('x', VW / 2)
        .attr('y', VH - 8)
        .attr('text-anchor', 'middle')
        .attr('fill', dimFill)
        .attr('font-size', '9px')
        .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
        .text('Netfilter 훅 포인트 — 패킷 흐름 (table 처리 순서 포함)')

    // ── Legend (table colors) ─────────────────────────────────────────────────
    const legends = [
        { fill: TBL.conntrack.fill, stroke: TBL.conntrack.stroke, label: 'conntrack' },
        { fill: TBL.raw.fill, stroke: TBL.raw.stroke, label: 'raw' },
        { fill: TBL.mangle.fill, stroke: TBL.mangle.stroke, label: 'mangle' },
        { fill: TBL.nat.fill, stroke: TBL.nat.stroke, label: 'nat' },
        { fill: TBL.filter.fill, stroke: TBL.filter.stroke, label: 'filter' },
    ]
    const legendStartX = VW / 2 - (legends.length * 130) / 2
    legends.forEach((l, i) => {
        const lx = legendStartX + i * 130
        const ly = VH - 28
        g.append('rect')
            .attr('x', lx)
            .attr('y', ly - 6)
            .attr('width', 12)
            .attr('height', 12)
            .attr('rx', 2)
            .attr('fill', l.fill)
            .attr('stroke', l.stroke)
            .attr('stroke-width', 1.5)
        g.append('text')
            .attr('x', lx + 16)
            .attr('y', ly + 1)
            .attr('dominant-baseline', 'middle')
            .attr('fill', dimFill)
            .attr('font-size', '9px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(l.label)
    })
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TableWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
            <table className="w-full text-sm text-left">{children}</table>
        </div>
    )
}

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
            {children}
        </th>
    )
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
    return (
        <td
            className={`px-4 py-2.5 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 ${mono ? 'font-mono text-xs' : ''}`}
        >
            {children}
        </td>
    )
}

// InfoBox는 @study-ui/components에서 import — color="blue" 사용

// ── Hook detail map ────────────────────────────────────────────────────────────
const hookDetails: Record<string, { desc: string; examples: string }> = {
    PREROUTING: {
        desc: '패킷이 NIC에서 수신된 직후, 라우팅 결정 전에 실행됩니다.',
        examples: 'DNAT, conntrack 초기화',
    },
    INPUT: { desc: '라우팅 결과가 로컬 프로세스로 결정된 패킷에 적용됩니다.', examples: '인바운드 방화벽 규칙' },
    FORWARD: { desc: '로컬이 아닌 다른 호스트로 포워딩될 패킷에 적용됩니다.', examples: '라우터/게이트웨이 방화벽' },
    OUTPUT: { desc: '로컬 프로세스가 송신하는 패킷에 적용됩니다.', examples: '아웃바운드 필터, DNAT' },
    POSTROUTING: { desc: '패킷이 NIC로 나가기 직전, 라우팅 결정 후에 실행됩니다.', examples: 'SNAT, IP Masquerade' },
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Topic06() {
    const { theme } = useTheme()
    const [activeHook, setActiveHook] = useState<string | null>(null)

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderNetfilterFlow(svg, w, h)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [theme],
    )

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">Topic 07</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">패킷 처리 경로와 후킹 지점</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Packet Path &amp; Hook Points</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    Netfilter 5훅, iptables/nftables, conntrack, TPROXY, TC Hook
                </p>
            </header>

            <LearningCard
                topicId="07-netfilter"
                items={[
                    'Netfilter의 5개 훅 포인트(PREROUTING~POSTROUTING)와 우선순위 체계를 이해합니다',
                    'iptables와 nftables가 커널 Netfilter 위에서 어떻게 동작하는지 배웁니다',
                    'TPROXY를 이용한 투명 프록시 구현과 conntrack 상태 추적 원리를 파악합니다',
                ]}
            />

            <Section id="s771" title="7.1  Netfilter 구조">
                <InfoBox color="blue">
                    <strong>
                        <T id="netfilter">Netfilter</T>
                    </strong>
                    는 리눅스 커널 네트워크 스택의 <em>훅(hook) 프레임워크</em>입니다.{' '}
                    <KernelRef path="include/uapi/linux/netfilter.h" label="netfilter hooks" /> 커널 내부에 5개의 고정된 훅
                    포인트를 두고, 각 포인트에서 등록된 함수를 우선순위 순서대로 호출합니다.
                    <br />
                    <br />
                    <strong>
                        <T id="iptables">iptables</T>
                    </strong>
                    , <strong>nftables</strong>,{' '}
                    <strong>
                        <T id="conntrack">conntrack(연결 추적)</T>
                    </strong>
                    , <strong>IPVS(로드밸런서)</strong> 등 대부분의 리눅스 네트워크 보안·제어 기능이 모두 Netfilter 훅
                    위에서 동작합니다.
                </InfoBox>
            </Section>

            <Section id="s772" title="7.2  5개 훅 포인트 — 패킷 흐름">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    수신 패킷은 PREROUTING → (라우팅 결정) → INPUT 또는 FORWARD 경로로 분기됩니다. 송신 패킷은 OUTPUT →
                    POSTROUTING 경로를 거칩니다. 드래그·휠로 확대/축소할 수 있습니다.
                </p>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mb-6">
                    <D3Container renderFn={renderFn} deps={[theme]} height={480} zoomable={true} />
                </div>

                {/* 훅 상세 인터랙션 버튼 */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                    {Object.keys(hookDetails).map((hook) => (
                        <button
                            key={hook}
                            onClick={() => setActiveHook(activeHook === hook ? null : hook)}
                            className={`rounded-lg border px-2 py-2 text-xs font-mono font-semibold transition-colors ${
                                activeHook === hook
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {hook}
                        </button>
                    ))}
                </div>
                {activeHook !== null && hookDetails[activeHook] !== undefined && (
                    <div className="rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 px-5 py-4 mb-6 text-sm">
                        <div className="font-mono font-bold text-blue-700 dark:text-blue-300 mb-1">{activeHook}</div>
                        <div className="text-gray-700 dark:text-gray-300 mb-1">{hookDetails[activeHook].desc}</div>
                        <div className="text-gray-500 dark:text-gray-400 text-xs">
                            주요 용도: <span className="font-mono">{hookDetails[activeHook].examples}</span>
                        </div>
                    </div>
                )}
            </Section>

            <Section id="s773" title="7.3  훅 포인트 상세">
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>훅</Th>
                            <Th>시점</Th>
                            <Th>주요 용도</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td mono>PREROUTING</Td>
                            <Td>라우팅 전 (수신 직후)</Td>
                            <Td>
                                DNAT, <T id="conntrack">conntrack</T>
                            </Td>
                        </tr>
                        <tr>
                            <Td mono>INPUT</Td>
                            <Td>로컬 프로세스로 전달 전</Td>
                            <Td>방화벽 인바운드</Td>
                        </tr>
                        <tr>
                            <Td mono>FORWARD</Td>
                            <Td>포워딩 패킷</Td>
                            <Td>라우터 방화벽</Td>
                        </tr>
                        <tr>
                            <Td mono>OUTPUT</Td>
                            <Td>로컬 프로세스 송신</Td>
                            <Td>아웃바운드 필터</Td>
                        </tr>
                        <tr>
                            <Td mono>POSTROUTING</Td>
                            <Td>송신 직전</Td>
                            <Td>SNAT, Masquerade</Td>
                        </tr>
                    </tbody>
                </TableWrapper>
            </Section>

            <Section id="s774" title="7.4  iptables와 nftables">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    두 도구 모두 <T id="netfilter">Netfilter</T> 훅을 사용하지만 아키텍처와 성능 특성이 다릅니다. 현대
                    배포판(RHEL 8+, Debian 10+)은 nftables를 기본값으로 채택했습니다.
                </p>
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>항목</Th>
                            <Th>iptables</Th>
                            <Th>nftables</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td>아키텍처</Td>
                            <Td>테이블별 별도 커널 모듈</Td>
                            <Td>단일 프레임워크</Td>
                        </tr>
                        <tr>
                            <Td>성능</Td>
                            <Td>규칙 수 많을수록 선형 탐색</Td>
                            <Td>JIT 컴파일, 집합(set) 지원</Td>
                        </tr>
                        <tr>
                            <Td>IPv4/IPv6</Td>
                            <Td>별도 (iptables / ip6tables)</Td>
                            <Td>통합 (nftables)</Td>
                        </tr>
                        <tr>
                            <Td>현재 상태</Td>
                            <Td>유지보수 모드</Td>
                            <Td>기본값 (RHEL 8+, Debian 10+)</Td>
                        </tr>
                    </tbody>
                </TableWrapper>
                <CodeBlock code={snippets.iptablesVsNftablesCode} language="bash" filename="iptables vs nftables" />

                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                    iptables 핵심 문법
                </h3>
                <CodeBlock code={snippets.iptablesMainSyntaxCode} language="bash" filename="# iptables 주요 규칙 예시" />
                <CodeBlock code={snippets.nftablesSyntaxCode} language="bash" filename="# nftables 동일 규칙" />
            </Section>

            <Section id="s7741" title="7.4.1  iptables Table × Chain 매트릭스">
                <InfoBox color="blue">
                    <strong>iptables</strong>는 4개의 <em>테이블</em>을 가지며, 각 테이블은 특정 체인에만 규칙을 등록할 수 있습니다.
                    <ul className="mt-3 space-y-2 list-disc list-inside">
                        <li>
                            <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">filter</code> — 기본 테이블.
                            패킷 허용/차단 (INPUT, FORWARD, OUTPUT)
                        </li>
                        <li>
                            <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">nat</code> — 주소 변환.
                            SNAT/DNAT/MASQUERADE (PREROUTING, INPUT, OUTPUT, POSTROUTING)
                        </li>
                        <li>
                            <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">mangle</code> — 패킷 헤더 수정.
                            TTL, TOS, MARK 변경 (5개 chain 모두)
                        </li>
                        <li>
                            <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">raw</code> — conntrack 제외 설정.
                            NOTRACK 타겟 (PREROUTING, OUTPUT)
                        </li>
                    </ul>
                </InfoBox>

                <InfoTable
                    headers={['Table', 'PREROUTING', 'INPUT', 'FORWARD', 'OUTPUT', 'POSTROUTING']}
                    rows={[
                        { cells: ['raw', '✓', '', '', '✓', ''] },
                        { cells: ['mangle', '✓', '✓', '✓', '✓', '✓'] },
                        { cells: ['nat', '✓', '✓', '', '✓', '✓'] },
                        { cells: ['filter', '', '✓', '✓', '✓', ''] },
                    ]}
                />

                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 mb-2">
                    <strong>처리 우선순위 (priority 값):</strong>{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">raw (-300)</code>
                    {' → '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">conntrack (-200)</code>
                    {' → '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">mangle (-150)</code>
                    {' → '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">nat/DNAT (-100)</code>
                    {' → '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">filter (0)</code>
                    {' → '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">nat/SNAT (100)</code>
                    {' '}순으로 평가됩니다. 같은 체인에 여러 테이블이 등록되어 있으면 이 순서대로 실행됩니다.
                </p>
            </Section>

            <Section id="s7742" title="7.4.2  NAT — 네트워크 주소 변환">
                <InfoBox color="blue">
                    <strong>NAT(Network Address Translation)</strong>는 패킷의 IP 주소/포트를 변환합니다.
                    <T id="conntrack">conntrack</T>이 매핑을 추적하여 응답 패킷을 자동으로 역변환합니다.
                    <ul className="mt-3 space-y-2 list-disc list-inside">
                        <li>
                            <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">SNAT</code> — 소스 주소 변경
                            (POSTROUTING). 내부 → 외부 통신 시 출발지 IP를 공인 IP로 변환
                        </li>
                        <li>
                            <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">DNAT</code> — 목적지 주소 변경
                            (PREROUTING). 포트 포워딩, 로드밸런싱에 활용
                        </li>
                        <li>
                            <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">MASQUERADE</code> — 동적 IP용 SNAT.
                            PPPoE, DHCP 환경에서 인터페이스 IP가 바뀌어도 자동 적용
                        </li>
                    </ul>
                </InfoBox>

                <CodeBlock code={snippets.natExamplesCode} language="bash" filename="# NAT iptables 명령어 예시" />

                <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 px-5 py-4 text-sm text-gray-700 dark:text-gray-300 mt-4 mb-6">
                    <div className="font-semibold text-green-700 dark:text-green-400 mb-2">NAT와 conntrack의 관계</div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        NAT 규칙이 적용되면 <T id="conntrack">conntrack</T>이 원본 주소와 변환된 주소의 매핑을 기록합니다.
                        이후 응답 패킷이 돌아올 때 conntrack이 자동으로 역변환(reverse NAT)을 수행하므로, 별도의 역방향 규칙이 필요 없습니다.
                        <br />
                        <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">conntrack -L -n</code> 명령으로 현재 NAT 매핑 상태를 확인할 수 있습니다.
                    </p>
                </div>
            </Section>

            <Section id="s775" title="7.5  conntrack (연결 추적)">
                <InfoBox color="blue">
                    <T id="netfilter">Netfilter</T>{' '}
                    <strong>
                        <T id="conntrack">conntrack</T>
                    </strong>{' '}
                    <KernelRef path="net/netfilter/nf_conntrack_core.c" sym="nf_conntrack" />
                    은 stateful 방화벽의 핵심 컴포넌트입니다. 커널이 모든 TCP/UDP 연결의 상태를 해시 테이블로 관리하며,
                    응답 패킷을 자동으로 허용하거나 NAT 역변환을 처리합니다.
                </InfoBox>
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>상태</Th>
                            <Th>의미</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td mono>NEW</Td>
                            <Td>첫 번째 패킷 (연결 시작)</Td>
                        </tr>
                        <tr>
                            <Td mono>ESTABLISHED</Td>
                            <Td>양방향 패킷이 확인된 연결</Td>
                        </tr>
                        <tr>
                            <Td mono>RELATED</Td>
                            <Td>기존 연결과 관련된 새 연결 (FTP data 등)</Td>
                        </tr>
                        <tr>
                            <Td mono>INVALID</Td>
                            <Td>추적 불가 패킷</Td>
                        </tr>
                    </tbody>
                </TableWrapper>
                <CodeBlock code={snippets.conntrackCode} language="bash" filename="conntrack CLI" />

                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-6">
                    conntrack 성능 튜닝
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    고트래픽 환경에서 <T id="conntrack">conntrack</T> 테이블이 가득 차면 새 연결이 차단됩니다. 적절한
                    크기 조정이 필요합니다.
                </p>
                <CodeBlock code={snippets.conntrackTuningCode} language="bash" filename="# conntrack 튜닝" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/40 px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">용량 부족 증상</div>
                        <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
                            dmesg | grep "nf_conntrack: table full"
                        </code>
                        <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            새 연결 REJECT, 기존 연결은 유지됩니다.
                        </p>
                    </div>
                    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-semibold text-purple-700 dark:text-purple-400 mb-2">메모리 사용량</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            conntrack 엔트리 1개 ≈ 320바이트
                            <br />
                            100만 연결 ≈ <strong>320MB RAM</strong>
                        </p>
                    </div>
                </div>
            </Section>

            <Section id="s776" title="7.6  TPROXY와 정책 기반 라우팅">
                <InfoBox color="blue">
                    <ul className="space-y-1 list-disc list-inside">
                        <li>
                            <strong><T id="tproxy">TPROXY</T></strong>: 패킷을 실제 목적지가 아닌 <em>로컬 소켓</em>으로 리다이렉트합니다.
                            NAT와 달리 패킷의 목적지 IP/포트를 변경하지 않습니다.
                        </li>
                        <li>투명 프록시(transparent proxy) 구현에 필수이며, Envoy, Squid 등에서 활용됩니다.</li>
                        <li>
                            <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">ip rule</code>{' '}
                            +{' '}
                            <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                                ip route
                            </code>
                            로 정책 기반 라우팅과 연동해야 합니다.
                        </li>
                    </ul>
                </InfoBox>
                <CodeBlock code={snippets.tproxyCode} language="bash" filename="TPROXY 설정" />
            </Section>

            <Section id="s777" title="7.7  TC Hook (Traffic Control)">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    TC(Traffic Control)는 <T id="netfilter">Netfilter</T>와 독립적인 패킷 처리 포인트입니다. XDP보다
                    늦지만 <T id="netfilter">Netfilter</T>보다 빠른 위치에서 동작하여, eBPF 프로그램과 결합하면 매우
                    유연한 패킷 제어가 가능합니다.
                </p>
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>위치</Th>
                            <Th>시점</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td mono>ingress TC</Td>
                            <Td>드라이버 → ip_rcv() 사이 (PREROUTING 전)</Td>
                        </tr>
                        <tr>
                            <Td mono>egress TC</Td>
                            <Td>ip_output() → 드라이버 사이 (POSTROUTING 후)</Td>
                        </tr>
                    </tbody>
                </TableWrapper>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-5 py-4 text-sm text-gray-600 dark:text-gray-400 mb-8">
                    <div className="font-mono text-xs leading-7">
                        <span className="text-yellow-600 dark:text-yellow-400">NIC Driver</span>
                        {' → '}
                        <span className="font-bold text-blue-600 dark:text-blue-400">[ingress TC]</span>
                        {' → '}
                        <span className="text-gray-500">PREROUTING</span>
                        {' → ... → '}
                        <span className="text-gray-500">POSTROUTING</span>
                        {' → '}
                        <span className="font-bold text-purple-600 dark:text-purple-400">[egress TC]</span>
                        {' → '}
                        <span className="text-yellow-600 dark:text-yellow-400">NIC Driver</span>
                    </div>
                    <p className="mt-3 text-xs">
                        TC BPF는 <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">cls_bpf</code>를
                        통해 eBPF 프로그램을 연결하며, 패킷 수정·리다이렉션·드롭 등의 액션을 수행할 수 있습니다. 다음
                        토픽(XDP / eBPF)에서 더 자세히 다룹니다.
                    </p>
                </div>
            </Section>

            <Section id="s778" title="7.8  ipset — 대규모 IP 집합 매칭">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <T id="iptables">iptables</T> 규칙 하나로 수천 개의 IP를 O(1)로 매칭합니다. 차단 목록, 화이트리스트,
                    GeoIP 차단에 활용됩니다.
                </p>
                <InfoBox color="blue">
                    <strong>성능 비교:</strong> <T id="iptables">iptables</T> 규칙 10만 개 → O(n) 순차 매칭 vs{' '}
                    <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">ipset hash:ip</code> →
                    O(1) 해시 룩업. 대규모 차단 목록에서 압도적인 성능 차이가 발생합니다.
                </InfoBox>
                <CodeBlock code={snippets.ipsetCode} language="bash" filename="# ipset 사용법" />
                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>타입</Th>
                            <Th>설명</Th>
                            <Th>예시</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td mono>hash:ip</Td>
                            <Td>단일 IP 매칭</Td>
                            <Td>차단 IP 목록</Td>
                        </tr>
                        <tr>
                            <Td mono>hash:net</Td>
                            <Td>CIDR 블록 매칭</Td>
                            <Td>GeoIP 국가별 차단</Td>
                        </tr>
                        <tr>
                            <Td mono>hash:ip,port</Td>
                            <Td>IP+포트 조합</Td>
                            <Td>특정 서비스 차단</Td>
                        </tr>
                        <tr>
                            <Td mono>bitmap:port</Td>
                            <Td>포트 범위 (비트맵)</Td>
                            <Td>포트 범위 차단</Td>
                        </tr>
                    </tbody>
                </TableWrapper>
            </Section>

            <Section id="s779" title="7.9  Conntrack Helpers — 복잡한 프로토콜 추적">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <T id="conntrack">conntrack</T>(연결 추적)은 기본적으로 패킷의 5-tuple(src IP, dst IP, src port, dst
                    port, proto)로 연결을 식별합니다. 하지만 <strong>FTP</strong>, <strong>SIP</strong>처럼 페이로드
                    안에 추가 IP:PORT가 포함된 프로토콜은 별도 <strong>conntrack helper</strong>(ALG: Application Layer
                    Gateway)가 필요합니다.
                </p>

                <InfoBox color="blue">
                    <strong>FTP ACTIVE 모드 문제:</strong> 제어 채널(클라이언트 → 서버 21번 포트)은 conntrack이
                    추적하지만, 데이터 채널(서버 → 클라이언트 임의 포트)은 <em>새로운 연결</em>이므로 방화벽이
                    기본적으로 차단합니다.{' '}
                    <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">
                        nf_conntrack_ftp
                    </code>{' '}
                    모듈이 제어 채널 페이로드를 파싱해 <strong>RELATED</strong> expectation을 등록함으로써 이를
                    해결합니다.
                </InfoBox>

                <div className="my-6 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Helper 동작 흐름</h3>
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed space-y-1">
                        <div className="text-blue-600 dark:text-blue-400 font-semibold">[패킷 수신]</div>
                        <div className="pl-4">↓</div>
                        <div>
                            <span className="text-green-600 dark:text-green-400 font-semibold">[conntrack]</span> →
                            5-tuple 매칭 → ESTABLISHED
                        </div>
                        <div className="pl-4">
                            ↓ <span className="text-gray-500 dark:text-gray-500">(miss 또는 새 연결)</span>
                        </div>
                        <div>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">[helper 검사]</span> →
                            nf_conntrack_ftp / sip / h323 등
                        </div>
                        <div className="pl-4">
                            ↓ <span className="text-gray-500 dark:text-gray-500">(페이로드 파싱)</span>
                        </div>
                        <div>
                            <span className="text-purple-600 dark:text-purple-400 font-semibold">
                                [expectation 등록]
                            </span>{' '}
                            → /proc/net/nf_conntrack_expect
                        </div>
                        <div className="pl-4">
                            ↓ <span className="text-gray-500 dark:text-gray-500">(예상 패킷 도착)</span>
                        </div>
                        <div className="text-green-600 dark:text-green-400 font-semibold">[RELATED 상태로 허용]</div>
                    </div>
                </div>

                <div className="my-6 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">SIP ALG 동작</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        SIP INVITE 메시지 바디(SDP)에 미디어 IP:PORT가 포함됩니다.{' '}
                        <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">
                            nf_conntrack_sip
                        </code>{' '}
                        모듈이 SDP를 파싱해 RTP 포트 expectation을 등록하고, NAT 환경에서는{' '}
                        <code className="font-mono text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded">nf_nat_sip</code>{' '}
                        이 SDP 내부 IP도 함께 rewrite합니다. 단, 암호화된 SIP(TLS)는 helper가 파싱 불가하므로 별도
                        SBC(Session Border Controller)가 필요합니다.
                    </p>
                </div>

                <TableWrapper>
                    <thead>
                        <tr>
                            <Th>Helper 모듈</Th>
                            <Th>프로토콜</Th>
                            <Th>페이로드에서 추출</Th>
                            <Th>사용 포트</Th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <Td mono>nf_conntrack_ftp</Td>
                            <Td>FTP</Td>
                            <Td>PORT/PASV 명령의 IP:PORT</Td>
                            <Td mono>21</Td>
                        </tr>
                        <tr>
                            <Td mono>nf_conntrack_sip</Td>
                            <Td>SIP</Td>
                            <Td>SDP의 m= 라인 IP:PORT</Td>
                            <Td mono>5060</Td>
                        </tr>
                        <tr>
                            <Td mono>nf_conntrack_h323</Td>
                            <Td>H.323</Td>
                            <Td>H.245 TCS 메시지</Td>
                            <Td mono>1720</Td>
                        </tr>
                        <tr>
                            <Td mono>nf_conntrack_tftp</Td>
                            <Td>TFTP</Td>
                            <Td>첫 패킷의 src port</Td>
                            <Td mono>69</Td>
                        </tr>
                    </tbody>
                </TableWrapper>

                <CodeBlock code={snippets.conntrackHelperCode} language="bash" filename="# conntrack helper 활용" />
            </Section>

            {/* 7.10 관련 커널 파라미터 */}
            <Section id="s7710" title="7.10  관련 커널 파라미터">
                <Prose>
                    Netfilter와 conntrack의 동작을 제어하는 주요 커널 파라미터입니다.
                    NAT 게이트웨이나 방화벽 환경에서는 conntrack 테이블 크기 튜닝이 특히 중요합니다.
                </Prose>

                <InfoTable
                    headers={['파라미터', '기본값', '설명']}
                    rows={[
                        { cells: ['net.netfilter.nf_conntrack_max', '65536', 'conntrack 테이블 최대 엔트리 수'] },
                        { cells: ['net.netfilter.nf_conntrack_buckets', '16384', 'conntrack 해시 테이블 버킷 수'] },
                        { cells: ['net.netfilter.nf_conntrack_tcp_timeout_established', '432000', 'TCP ESTABLISHED 상태 conntrack 타임아웃(초, 5일)'] },
                        { cells: ['net.netfilter.nf_conntrack_tcp_timeout_time_wait', '120', 'TIME_WAIT 상태 conntrack 타임아웃(초)'] },
                        { cells: ['net.ipv4.ip_forward', '0', 'IP 포워딩 활성화 (라우터/NAT 필수)'] },
                        { cells: ['net.bridge.bridge-nf-call-iptables', '1', '브릿지 패킷에 iptables 적용 여부'] },
                    ]}
                />

                <CodeBlock code={snippets.netfilterParamsCode} language="bash" filename="# 넷필터 파라미터 확인 및 튜닝" />
            </Section>

            <TopicNavigation topicId="07-netfilter" />
        </div>
    )
}
