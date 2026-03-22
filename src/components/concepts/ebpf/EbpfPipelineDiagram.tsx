import * as d3 from 'd3'
import { useCallback } from 'react'
import { useTheme } from '../../../hooks/useTheme'
import { themeColors } from '../../../lib/colors'
import { D3Container } from '../../../components/viz/D3Container'

// ─────────────────────────────────────────────────────────────────────────────
// 8.3  eBPF Pipeline D3 diagram
// ─────────────────────────────────────────────────────────────────────────────

function renderEbpfPipeline(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c2 = themeColors(isDark)
    const bg = c2.bg
    const textColor = c2.text
    const dimColor = c2.textMuted

    svg.style('background', bg)

    const g = svg.append('g')

    const stages = [
        { label: 'eBPF C 코드', sub: '.c 소스', color: c2.blueStroke },
        { label: 'clang/llvm', sub: 'compiling', color: c2.purpleStroke },
        { label: 'eBPF 바이트코드', sub: '.o ELF', color: c2.cyanStroke },
        { label: 'verifier', sub: '정적 분석', color: c2.amberStroke },
        { label: 'JIT 컴파일', sub: 'native code', color: c2.greenStroke },
        { label: '커널 실행', sub: 'in-kernel', color: c2.greenStroke },
    ]

    const padX = 16
    const padY = 20
    const totalW = width - padX * 2
    const boxW = Math.min(totalW / stages.length - 10, 88)
    const boxH = 44
    const cy = padY + boxH / 2 + 8
    const stepX = totalW / stages.length

    stages.forEach((st, i) => {
        const cx = padX + i * stepX + stepX / 2

        g.append('rect')
            .attr('x', cx - boxW / 2)
            .attr('y', cy - boxH / 2)
            .attr('width', boxW)
            .attr('height', boxH)
            .attr('rx', 6)
            .attr('fill', st.color + (isDark ? '22' : '11'))
            .attr('stroke', st.color)
            .attr('stroke-width', 1.5)

        g.append('text')
            .attr('x', cx)
            .attr('y', cy - 6)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', st.color)
            .attr('font-size', '9px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-weight', 'bold')
            .text(st.label)

        g.append('text')
            .attr('x', cx)
            .attr('y', cy + 10)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', dimColor)
            .attr('font-size', '8px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(st.sub)

        // Arrow to next stage
        if (i < stages.length - 1) {
            const nextCX = padX + (i + 1) * stepX + stepX / 2
            const arrowId = `pa-${i}`
            svg.append('defs')
                .append('marker')
                .attr('id', arrowId)
                .attr('viewBox', '0 -4 8 8')
                .attr('refX', 7)
                .attr('refY', 0)
                .attr('markerWidth', 5)
                .attr('markerHeight', 5)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-4L8,0L0,4')
                .attr('fill', c2.textDim)

            g.append('line')
                .attr('x1', cx + boxW / 2)
                .attr('y1', cy)
                .attr('x2', nextCX - boxW / 2 - 2)
                .attr('y2', cy)
                .attr('stroke', c2.textDim)
                .attr('stroke-width', 1.5)
                .attr('marker-end', `url(#${arrowId})`)
        }
    })

    // verifier failure branch
    const verifierIdx = 3
    const verifierCX = padX + verifierIdx * stepX + stepX / 2
    const failY = cy + boxH / 2 + 14
    const failBoxW = 72
    const failBoxH = 24

    const failArrowId = 'fail-arrow'
    svg.append('defs')
        .append('marker')
        .attr('id', failArrowId)
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 7)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', '#ef4444')

    g.append('line')
        .attr('x1', verifierCX)
        .attr('y1', cy + boxH / 2)
        .attr('x2', verifierCX)
        .attr('y2', failY + failBoxH / 2 - 2)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3 2')
        .attr('marker-end', `url(#${failArrowId})`)

    g.append('rect')
        .attr('x', verifierCX - failBoxW / 2)
        .attr('y', failY + failBoxH / 2)
        .attr('width', failBoxW)
        .attr('height', failBoxH)
        .attr('rx', 4)
        .attr('fill', c2.redFill)
        .attr('stroke', c2.redStroke)
        .attr('stroke-width', 1.5)

    g.append('text')
        .attr('x', verifierCX)
        .attr('y', failY + failBoxH / 2 + failBoxH / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', c2.redText)
        .attr('font-size', '9px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', 'bold')
        .text('로드 거부')

    g.append('text')
        .attr('x', verifierCX + 2)
        .attr('y', cy + boxH / 2 + 9)
        .attr('text-anchor', 'middle')
        .attr('fill', c2.redText)
        .attr('font-size', '8px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text('실패')

    // title
    g.append('text')
        .attr('x', padX)
        .attr('y', height - 8)
        .attr('fill', dimColor)
        .attr('font-size', '9px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text('eBPF 실행 파이프라인: 사용자 코드 → 커널 안전 실행')

    void textColor
}

export function EbpfPipelineDiagram() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderEbpfPipeline(svg, w, h, isDark)
        },
        [isDark],
    )

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <D3Container renderFn={renderFn} deps={[isDark]} height={160} />
        </div>
    )
}
