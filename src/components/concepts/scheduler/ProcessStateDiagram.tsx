import * as d3 from 'd3'
import { useCallback } from 'react'
import { useTheme } from '../../../hooks/useTheme'
import { themeColors } from '../../../lib/colors'
import { D3Container } from '../../viz/D3Container'

function renderProcessStateDiagram(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    _width: number,
    _height: number,
) {
    const VW = 700,
        VH = 290
    svg.attr('viewBox', `0 0 ${VW} ${VH}`).attr('preserveAspectRatio', 'xMidYMid meet')

    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const textFill = c.text
    const dimFill = c.textMuted
    const nodeFill = c.bg
    const nodeStroke = c.border
    const runFill = c.blueFill
    const runStroke = c.blueStroke
    const edgeColor = c.textMuted
    const labelFill = c.textMuted

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
    const NH = 36,
        NR = 6
    const TY = 85,
        BY = 215
    const TBot = TY + NH / 2 // 103
    const BTop = BY - NH / 2 // 197

    // Node draw helper (2-line label)
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
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-weight', 'bold')
            .text(l1)
        g.append('text')
            .attr('x', cx)
            .attr('y', cy + 8)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', dimFill)
            .attr('font-size', '9px')
            .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
            .text(l2)
    }

    // Arrow helper
    function arrow(d: string, label: string, lx: number, ly: number) {
        g.append('path')
            .attr('d', d)
            .attr('fill', 'none')
            .attr('stroke', edgeColor)
            .attr('stroke-width', 1.3)
            .attr('marker-end', 'url(#psd-arrow)')
        if (label) {
            g.append('text')
                .attr('x', lx)
                .attr('y', ly)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', labelFill)
                .attr('font-size', '9px')
                .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
                .text(label)
        }
    }

    // Start dot
    g.append('circle').attr('cx', 25).attr('cy', TY).attr('r', 8).attr('fill', textFill)
    // End double-dot
    g.append('circle')
        .attr('cx', 570)
        .attr('cy', TY)
        .attr('r', 10)
        .attr('fill', 'none')
        .attr('stroke', textFill)
        .attr('stroke-width', 1.5)
    g.append('circle').attr('cx', 570).attr('cy', TY).attr('r', 5).attr('fill', textFill)

    // Nodes
    drawNode(115, TY, 98, 'TASK_NEW', 'new', nodeFill, nodeStroke)
    drawNode(292, TY, 148, 'TASK_RUNNING', '(R) — 실행/런큐', runFill, runStroke)
    drawNode(456, TY, 118, 'EXIT_ZOMBIE', '(Z) — 좀비', nodeFill, nodeStroke)
    drawNode(110, BY, 148, 'TASK_INTERRUPTIBLE', '(S) — 슬립', nodeFill, nodeStroke)
    drawNode(292, BY, 158, 'TASK_UNINTERRUPTIBLE', '(D) — 블록 I/O', nodeFill, nodeStroke)
    drawNode(460, BY, 118, 'TASK_STOPPED', '(T) — 정지', nodeFill, nodeStroke)

    // ── Top row straight arrows ──
    arrow(`M 33,${TY} L 65,${TY}`, 'fork/clone', 50, 73)
    arrow(`M 164,${TY} L 218,${TY}`, '스케줄러 선택', 191, 73)
    arrow(`M 366,${TY} L 397,${TY}`, 'exit()', 381, 73)
    arrow(`M 515,${TY} L 558,${TY}`, '부모 wait()', 537, 73)

    // ── RUNNING ↔ INTERRUPTIBLE ──
    arrow(`M 257,${TBot} C 257,150 130,150 130,${BTop}`, 'sleep/I/O', 178, 157)
    arrow(`M 183,${BTop} C 183,135 268,135 268,${TBot}`, '시그널/이벤트', 215, 122)

    // ── RUNNING ↔ UNINTERRUPTIBLE (near-vertical) ──
    arrow(`M 280,${TBot} L 280,${BTop}`, '블록 I/O', 246, 140)
    arrow(`M 304,${BTop} L 304,${TBot}`, 'I/O 완료', 338, 162)

    // ── RUNNING ↔ STOPPED ──
    arrow(`M 327,${TBot} C 327,150 440,150 440,${BTop}`, 'SIGSTOP', 385, 157)
    arrow(`M 510,${BTop} C 510,135 316,135 316,${TBot}`, 'SIGCONT', 427, 122)
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
            <D3Container renderFn={renderFn} height={290} deps={[theme]} />
        </div>
    )
}
