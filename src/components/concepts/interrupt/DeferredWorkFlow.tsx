import * as d3 from 'd3'
import { themeColors } from '../../../lib/colors'

interface DeferredStage {
    title: string
    sub: string
    items: string[]
    fill: string
    stroke: string
    titleColor: string
}

function buildDeferredStages(isDark: boolean): DeferredStage[] {
    const c = themeColors(isDark)
    return [
        {
            title: '하드웨어 인터럽트',
            sub: 'Top Half (ISR)',
            items: ['IRQ 핸들러', 'ACK 전송', '데이터 복사', 'NAPI 스케줄'],
            fill: c.redFill,
            stroke: c.redStroke,
            titleColor: c.redText,
        },
        {
            title: 'Softirq / Tasklet',
            sub: 'Bottom Half (softirq ctx)',
            items: ['NET_RX_SOFTIRQ', 'NET_TX_SOFTIRQ', 'TIMER_SOFTIRQ', 'Tasklet'],
            fill: c.amberFill,
            stroke: c.amberStroke,
            titleColor: c.amberText,
        },
        {
            title: 'Workqueue',
            sub: 'Bottom Half (process ctx)',
            items: ['system_wq', 'system_long_wq', 'RT workqueue', 'sleep 가능'],
            fill: c.blueFill,
            stroke: c.blueStroke,
            titleColor: c.blueText,
        },
    ]
}

export function renderDeferredWorkFlow(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c = themeColors(isDark)
    const textFill = c.text
    const subFill = c.textMuted
    const arrowColor = c.textMuted
    const labelColor = c.textMuted

    const PAD = 24
    const GAP = 40
    const boxW = Math.floor((width - PAD * 2 - GAP * 2) / 3)
    const boxH = 148
    const boxY = Math.floor((height - boxH) / 2)

    const stages = buildDeferredStages(isDark)

    const defs = svg.append('defs')
    defs.append('marker')
        .attr('id', 'dw-arrow')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 9)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', arrowColor)

    stages.forEach((s, i) => {
        const x = PAD + i * (boxW + GAP)

        svg.append('rect')
            .attr('x', x)
            .attr('y', boxY)
            .attr('width', boxW)
            .attr('height', boxH)
            .attr('rx', 10)
            .attr('fill', s.fill)
            .attr('stroke', s.stroke)
            .attr('stroke-width', 1.5)

        svg.append('text')
            .attr('x', x + boxW / 2)
            .attr('y', boxY + 22)
            .attr('text-anchor', 'middle')
            .attr('fill', s.titleColor)
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
            .text(s.title)

        svg.append('text')
            .attr('x', x + boxW / 2)
            .attr('y', boxY + 38)
            .attr('text-anchor', 'middle')
            .attr('fill', subFill)
            .attr('font-size', '9px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(s.sub)

        svg.append('line')
            .attr('x1', x + 12)
            .attr('x2', x + boxW - 12)
            .attr('y1', boxY + 47)
            .attr('y2', boxY + 47)
            .attr('stroke', s.stroke)
            .attr('stroke-width', 0.8)
            .attr('opacity', 0.5)

        s.items.forEach((item, ii) => {
            svg.append('text')
                .attr('x', x + 14)
                .attr('y', boxY + 64 + ii * 19)
                .attr('fill', textFill)
                .attr('font-size', '10px')
                .attr('font-family', "'JetBrains Mono', monospace")
                .text(`• ${item}`)
        })

        if (i < stages.length - 1) {
            const ax1 = x + boxW + 4
            const ax2 = x + boxW + GAP - 4
            const ay = boxY + boxH / 2

            svg.append('line')
                .attr('x1', ax1)
                .attr('y1', ay)
                .attr('x2', ax2)
                .attr('y2', ay)
                .attr('stroke', arrowColor)
                .attr('stroke-width', 1.5)
                .attr('marker-end', 'url(#dw-arrow)')

            svg.append('text')
                .attr('x', (ax1 + ax2) / 2)
                .attr('y', ay - 8)
                .attr('text-anchor', 'middle')
                .attr('fill', labelColor)
                .attr('font-size', '9px')
                .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
                .text('스케줄링')
        }
    })
}
