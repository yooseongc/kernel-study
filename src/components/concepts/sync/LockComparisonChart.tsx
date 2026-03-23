// Lock comparison D3 bar chart
// Extracted from src/pages/topic09-synchronization/index.tsx

import { useCallback } from 'react'
import * as d3 from 'd3'
import { useTheme, themeColors , D3Container, createD3Theme } from '@study-ui/components'

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
    const theme = createD3Theme(isDark)
    const textColor = c.text
    const dimColor = c.textMuted

    const g = svg.append('g')

    const data = [
        { label: 'Spinlock', overhead: 85, fill: c.amberFill, stroke: c.amberStroke, text: c.amberText },
        { label: 'Mutex', overhead: 60, fill: c.purpleFill, stroke: c.purpleStroke, text: c.purpleText },
        { label: 'RWLock-R', overhead: 45, fill: c.greenFill, stroke: c.greenStroke, text: c.greenText },
        { label: 'RWLock-W', overhead: 70, fill: c.blueFill, stroke: c.blueStroke, text: c.blueText },
        { label: 'Atomic', overhead: 20, fill: c.cyanFill, stroke: c.cyanStroke, text: c.cyanText },
        { label: 'RCU-R', overhead: 5, fill: c.indigoFill, stroke: c.indigoStroke, text: c.indigoText },
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
            .attr('fill', d.fill)
            .attr('stroke', d.stroke)
            .attr('stroke-width', 1.5)

        g.append('text')
            .attr('x', cx)
            .attr('y', barY - 4)
            .attr('text-anchor', 'middle')
            .attr('fill', d.text)
            .attr('font-size', '10px')
            .attr('font-family', theme.fonts.mono)
            .attr('font-weight', 'bold')
            .text(`${d.overhead}`)

        g.append('text')
            .attr('x', cx)
            .attr('y', padTop + chartH + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '9px')
            .attr('font-family', theme.fonts.mono)
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
        .attr('font-family', theme.fonts.sans)
        .text('상대적 오버헤드 →')

    g.append('text')
        .attr('x', width - padX)
        .attr('y', padTop + chartH + 30)
        .attr('text-anchor', 'end')
        .attr('fill', dimColor)
        .attr('font-size', '8.5px')
        .attr('font-family', theme.fonts.sans)
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

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <D3Container renderFn={renderFn} deps={[isDark]} height={220} />
        </div>
    )
}
