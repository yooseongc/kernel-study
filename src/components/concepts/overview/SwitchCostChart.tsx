import * as d3 from 'd3'
import { themeColors, createD3Theme } from '@study-ui/components'

export function renderSwitchCostChart(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const theme = createD3Theme(isDark)
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const data = [
        { label: '함수 호출', ns: 1, color: '#10b981' },
        { label: 'Ring 3→0 전환\n(syscall)', ns: 100, color: '#f59e0b' },
        { label: 'TLB flush\n포함 전환', ns: 300, color: '#ef4444' },
        { label: '컨텍스트 스위치', ns: 2000, color: '#7c3aed' },
    ]

    const margin = { top: 24, right: 16, bottom: 70, left: 72 }
    const w = width - margin.left - margin.right
    const h = height - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3
        .scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, w])
        .padding(0.35)
    const y = d3.scaleLog().domain([0.5, 3000]).range([h, 0])

    // Grid lines
    const yTicks = [1, 10, 100, 1000]
    yTicks.forEach((tick) => {
        g.append('line')
            .attr('x1', 0)
            .attr('x2', w)
            .attr('y1', y(tick))
            .attr('y2', y(tick))
            .attr('stroke', c.link)
            .attr('stroke-dasharray', '3 3')
            .attr('stroke-width', 1)
        g.append('text')
            .attr('x', -8)
            .attr('y', y(tick) + 4)
            .attr('text-anchor', 'end')
            .attr('fill', c.textMuted)
            .attr('font-size', '10px')
            .text(`${tick}ns`)
    })

    // Bars
    data.forEach((d) => {
        const bx = x(d.label)!
        const bw = x.bandwidth()
        const by = y(d.ns)
        const bh = h - by

        g.append('rect')
            .attr('x', bx)
            .attr('y', by)
            .attr('width', bw)
            .attr('height', bh)
            .attr('fill', d.color + '33')
            .attr('stroke', d.color)
            .attr('stroke-width', 1.5)
            .attr('rx', 4)

        g.append('text')
            .attr('x', bx + bw / 2)
            .attr('y', by - 5)
            .attr('text-anchor', 'middle')
            .attr('fill', d.color)
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .text(`${d.ns}ns`)

        // Multi-line x-axis label
        const lines = d.label.split('\n')
        lines.forEach((line, i) => {
            g.append('text')
                .attr('x', bx + bw / 2)
                .attr('y', h + 18 + i * 14)
                .attr('text-anchor', 'middle')
                .attr('fill', c.textMuted)
                .attr('font-size', '10px')
                .attr('font-family', theme.fonts.sans)
                .text(line)
        })
    })

    // Y-axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -h / 2)
        .attr('y', -55)
        .attr('text-anchor', 'middle')
        .attr('fill', c.textMuted)
        .attr('font-size', '11px')
        .attr('font-family', theme.fonts.sans)
        .text('지연 시간 (로그 스케일)')
}
