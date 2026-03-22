// Network bottleneck horizontal bar chart D3 visualisation
// Extracted from src/pages/topic11-debugging/index.tsx

import { useCallback } from 'react'
import * as d3 from 'd3'
import { useTheme } from '../../../hooks/useTheme'
import { themeColors } from '../../../lib/colors'
import { D3Container } from '../../viz/D3Container'

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

interface BottleneckItem {
    label: string
    priority: number
    color: string
    cmd: string
}

const bottleneckData: BottleneckItem[] = [
    { label: 'NIC RX drop', priority: 95, color: '#ef4444', cmd: 'ethtool -S eth0 | grep drop' },
    { label: 'softnet drop', priority: 80, color: '#f59e0b', cmd: '/proc/net/softnet_stat col2' },
    { label: 'conntrack full', priority: 65, color: '#8b5cf6', cmd: 'conntrack -S' },
    { label: 'socket buffer', priority: 50, color: '#3b82f6', cmd: 'ss -nmp | grep rcvbuf' },
    { label: '앱 처리 지연', priority: 35, color: '#10b981', cmd: 'strace / perf' },
]

// ─────────────────────────────────────────────────────────────────────────────
// D3 render function
// ─────────────────────────────────────────────────────────────────────────────

function renderNetworkBottleneck(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c2 = themeColors(isDark)
    const axisColor = c2.textDim
    const textColor = c2.text
    const dimColor = c2.textMuted


    const padLeft = 110
    const padRight = 16
    const padTop = 16
    const padBottom = 32

    const innerW = width - padLeft - padRight
    const innerH = height - padTop - padBottom

    const g = svg.append('g')

    const xScale = d3
        .scaleLinear()
        .domain([0, 100])
        .range([padLeft, padLeft + innerW])

    const barHeight = Math.min(innerH / bottleneckData.length - 8, 28)
    const stepY = innerH / bottleneckData.length

    g.append('line')
        .attr('x1', padLeft)
        .attr('y1', padTop + innerH)
        .attr('x2', padLeft + innerW)
        .attr('y2', padTop + innerH)
        .attr('stroke', axisColor)
        .attr('stroke-width', 1)
    ;[0, 25, 50, 75, 100].forEach((tick) => {
        const x = xScale(tick)
        g.append('line')
            .attr('x1', x)
            .attr('y1', padTop)
            .attr('x2', x)
            .attr('y2', padTop + innerH)
            .attr('stroke', axisColor)
            .attr('stroke-width', 0.5)
            .attr('stroke-dasharray', '3 3')

        g.append('text')
            .attr('x', x)
            .attr('y', padTop + innerH + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', dimColor)
            .attr('font-size', '9px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(tick === 100 ? '높음' : tick === 0 ? '낮음' : `${tick}`)
    })

    g.append('text')
        .attr('x', padLeft + innerW / 2)
        .attr('y', padTop + innerH + 28)
        .attr('text-anchor', 'middle')
        .attr('fill', dimColor)
        .attr('font-size', '9px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text('체크 우선순위')

    bottleneckData.forEach((item, i) => {
        const cy = padTop + i * stepY + stepY / 2
        const barW = xScale(item.priority) - padLeft

        g.append('rect')
            .attr('x', padLeft)
            .attr('y', cy - barHeight / 2)
            .attr('width', innerW)
            .attr('height', barHeight)
            .attr('rx', 4)
            .attr('fill', c2.bgCard)

        g.append('rect')
            .attr('x', padLeft)
            .attr('y', cy - barHeight / 2)
            .attr('width', barW)
            .attr('height', barHeight)
            .attr('rx', 4)
            .attr('fill', item.color + (isDark ? 'bb' : 'cc'))

        g.append('text')
            .attr('x', padLeft - 6)
            .attr('y', cy - 4)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('fill', item.color)
            .attr('font-size', '9px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-weight', 'bold')
            .text(item.label)

        g.append('text')
            .attr('x', padLeft - 6)
            .attr('y', cy + 8)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('fill', dimColor)
            .attr('font-size', '7.5px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(item.cmd)

        if (barW > 30) {
            g.append('text')
                .attr('x', padLeft + barW - 6)
                .attr('y', cy)
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .attr('fill', textColor)
                .attr('font-size', '9px')
                .attr('font-family', "'JetBrains Mono', monospace")
                .attr('font-weight', 'bold')
                .text(`${item.priority}`)
        }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function NetworkBottleneckChart() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderNetworkBottleneck(svg, w, h, isDark)
        },
        [isDark],
    )

    return <D3Container renderFn={renderFn} deps={[isDark]} height={220} />
}
