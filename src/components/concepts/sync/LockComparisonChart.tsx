// Lock comparison D3 bar chart
// Extracted from src/pages/topic09-synchronization/index.tsx

import { useCallback } from 'react'
import * as d3 from 'd3'
import { useTheme } from '../../../hooks/useTheme'
import { themeColors } from '../../../lib/colors'
import { D3Container } from '../../viz/D3Container'

// ─────────────────────────────────────────────────────────────────────────────
// D3 render function
// ─────────────────────────────────────────────────────────────────────────────

function renderLockComparison(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c = themeColors(isDark)
    const bg = c.bg
    const textColor = c.text
    const dimColor = c.textMuted

    svg.style('background', bg)

    const g = svg.append('g')

    const data = [
        { label: 'Spinlock', overhead: 85, color: c.amberStroke },
        { label: 'Mutex', overhead: 60, color: c.amberText },
        { label: 'RWLock-R', overhead: 45, color: c.greenStroke },
        { label: 'RWLock-W', overhead: 70, color: isDark ? 'oklch(72% 0.18 130)' : 'oklch(46% 0.20 130)' },
        { label: 'Atomic', overhead: 20, color: c.greenText },
        { label: 'RCU-R', overhead: 5, color: c.cyanStroke },
    ]

    const padX = 12
    const padTop = 20
    const padBottom = 38
    const chartW = width - padX * 2
    const chartH = height - padTop - padBottom

    const barW = Math.min(chartW / data.length - 10, 52)
    const stepX = chartW / data.length

    const maxVal = 100

    data.forEach((d, i) => {
        const cx = padX + i * stepX + stepX / 2
        const barH = (d.overhead / maxVal) * chartH
        const barY = padTop + chartH - barH

        g.append('rect')
            .attr('x', cx - barW / 2)
            .attr('y', barY)
            .attr('width', barW)
            .attr('height', barH)
            .attr('rx', 4)
            .attr('fill', d.color + (isDark ? 'bb' : 'cc'))
            .attr('stroke', d.color)
            .attr('stroke-width', 1)

        g.append('text')
            .attr('x', cx)
            .attr('y', barY - 4)
            .attr('text-anchor', 'middle')
            .attr('fill', d.color)
            .attr('font-size', '10px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-weight', 'bold')
            .text(`${d.overhead}`)

        g.append('text')
            .attr('x', cx)
            .attr('y', padTop + chartH + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '9px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(d.label)
    })

    g.append('line')
        .attr('x1', padX)
        .attr('y1', padTop + chartH)
        .attr('x2', width - padX)
        .attr('y2', padTop + chartH)
        .attr('stroke', dimColor)
        .attr('stroke-width', 1)

    g.append('text')
        .attr('x', padX)
        .attr('y', padTop - 6)
        .attr('fill', dimColor)
        .attr('font-size', '9px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text('상대적 오버헤드 →')

    g.append('text')
        .attr('x', width - padX)
        .attr('y', padTop + chartH + 30)
        .attr('text-anchor', 'end')
        .attr('fill', dimColor)
        .attr('font-size', '8.5px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text('낮을수록 오버헤드 적음')
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function LockComparisonChart() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderLockComparison(svg, w, h, isDark)
        },
        [isDark],
    )

    return <D3Container renderFn={renderFn} deps={[isDark]} height={220} />
}
