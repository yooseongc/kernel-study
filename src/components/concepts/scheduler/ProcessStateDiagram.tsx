import * as d3 from 'd3'
import { useCallback } from 'react'
import { useTheme, themeColors , D3Container, createD3Theme } from '@study-ui/components'

function renderProcessStateDiagram(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _width: number,
    _height: number,
) {
    const VW = 800,
        VH = 370
    svg.attr('viewBox', `0 0 ${VW} ${VH}`).attr('preserveAspectRatio', 'xMidYMid meet')

    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const theme = createD3Theme(isDark)
    const textFill = c.text
    const dimFill = c.textMuted
    const nodeFill = c.bg
    const nodeStroke = c.border
    const runFill = c.blueFill
    const runStroke = c.blueStroke
    const edgeColor = c.textMuted
    const labelFill = c.textMuted
    const labelBg = isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.8)'

    const defs = svg.append('defs')
    defs.append('marker')
        .attr('id', 'psd-arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 9)
        .attr('refY', 5)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', edgeColor)

    const g = svg.append('g')
    const NH = 40,
        NR = 8
    const TY = 80,
        BY = 280
    const TBot = TY + NH / 2
    const BTop = BY - NH / 2
    const MID = (TBot + BTop) / 2

    // Node draw helper
    function drawNode(cx: number, cy: number, w: number, l1: string, l2: string, fill: string, stroke: string) {
        g.append('rect')
            .attr('x', cx - w / 2)
            .attr('y', cy - NH / 2)
            .attr('width', w)
            .attr('height', NH)
            .attr('rx', NR)
            .attr('fill', fill)
            .attr('stroke', stroke)
            .attr('stroke-width', 1.5)
        g.append('text')
            .attr('x', cx)
            .attr('y', cy - 7)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', textFill)
            .attr('font-size', '11px')
            .attr('font-family', theme.fonts.mono)
            .attr('font-weight', 'bold')
            .text(l1)
        g.append('text')
            .attr('x', cx)
            .attr('y', cy + 9)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', dimFill)
            .attr('font-size', '9px')
            .attr('font-family', theme.fonts.sans)
            .text(l2)
    }

    // Arrow helper with background label
    function arrow(d: string, label: string, lx: number, ly: number) {
        g.append('path')
            .attr('d', d)
            .attr('fill', 'none')
            .attr('stroke', edgeColor)
            .attr('stroke-width', 1.3)
            .attr('marker-end', 'url(#psd-arrow)')
        if (label) {
            // 배경 rect로 가독성 확보
            const textEl = g
                .append('text')
                .attr('x', lx)
                .attr('y', ly)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', labelFill)
                .attr('font-size', '9px')
                .attr('font-family', theme.fonts.sans)
                .text(label)
            const bbox = textEl.node()?.getBBox()
            if (bbox) {
                g.insert('rect', () => textEl.node()!)
                    .attr('x', bbox.x - 3)
                    .attr('y', bbox.y - 1)
                    .attr('width', bbox.width + 6)
                    .attr('height', bbox.height + 2)
                    .attr('rx', 3)
                    .attr('fill', labelBg)
            }
        }
    }

    // Start dot
    g.append('circle').attr('cx', 25).attr('cy', TY).attr('r', 8).attr('fill', textFill)
    // End double-dot
    g.append('circle')
        .attr('cx', 650)
        .attr('cy', TY)
        .attr('r', 10)
        .attr('fill', 'none')
        .attr('stroke', textFill)
        .attr('stroke-width', 1.5)
    g.append('circle').attr('cx', 650).attr('cy', TY).attr('r', 5).attr('fill', textFill)

    // Nodes — 더 넓게 배치
    drawNode(120, TY, 100, 'TASK_NEW', 'new', nodeFill, nodeStroke)
    drawNode(320, TY, 155, 'TASK_RUNNING', '(R) — 실행/런큐', runFill, runStroke)
    drawNode(530, TY, 120, 'EXIT_ZOMBIE', '(Z) — 좀비', nodeFill, nodeStroke)
    drawNode(120, BY, 155, 'TASK_INTERRUPTIBLE', '(S) — 슬립', nodeFill, nodeStroke)
    drawNode(340, BY, 165, 'TASK_UNINTERRUPTIBLE', '(D) — 블록 I/O', nodeFill, nodeStroke)
    drawNode(560, BY, 120, 'TASK_STOPPED', '(T) — 정지', nodeFill, nodeStroke)

    // ── Top row straight arrows ──
    arrow(`M 33,${TY} L 69,${TY}`, 'fork/clone', 52, TY - 14)
    arrow(`M 170,${TY} L 242,${TY}`, '스케줄러 선택', 206, TY - 14)
    arrow(`M 398,${TY} L 469,${TY}`, 'exit()', 434, TY - 14)
    arrow(`M 590,${TY} L 638,${TY}`, 'wait()', 614, TY - 14)

    // ── RUNNING → INTERRUPTIBLE (왼쪽 커브, 넓게) ──
    arrow(
        `M 260,${TBot} C 260,${MID - 20} 140,${MID - 20} 140,${BTop}`,
        'sleep / I/O 대기',
        180,
        MID - 30,
    )
    // ── INTERRUPTIBLE → RUNNING (왼쪽 커브, 넓게) ──
    arrow(
        `M 100,${BTop} C 100,${MID + 20} 240,${MID + 20} 240,${TBot}`,
        '시그널 / 이벤트',
        155,
        MID + 30,
    )

    // ── RUNNING → UNINTERRUPTIBLE (중앙 아래) ──
    arrow(`M 305,${TBot} L 325,${BTop}`, '블록 I/O', 290, MID)
    // ── UNINTERRUPTIBLE → RUNNING (중앙 위) ──
    arrow(`M 355,${BTop} L 335,${TBot}`, 'I/O 완료', 370, MID)

    // ── RUNNING → STOPPED (오른쪽 커브) ──
    arrow(
        `M 380,${TBot} C 380,${MID - 20} 545,${MID - 20} 545,${BTop}`,
        'SIGSTOP',
        470,
        MID - 30,
    )
    // ── STOPPED → RUNNING (오른쪽 커브) ──
    arrow(
        `M 575,${BTop} C 575,${MID + 20} 395,${MID + 20} 395,${TBot}`,
        'SIGCONT',
        495,
        MID + 30,
    )
}

export function ProcessStateDiagram() {
    const { theme } = useTheme()

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderProcessStateDiagram(svg, w, h)
        },
        [theme], // eslint-disable-line react-hooks/exhaustive-deps
    )

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-2">
            <D3Container renderFn={renderFn} height={370} deps={[theme]} />
        </div>
    )
}
