import * as d3 from 'd3'
import { useCallback } from 'react'
import { useTheme } from '../../../hooks/useTheme'
import { themeColors } from '../../../lib/colors'
import { D3Container } from '../../../components/viz/D3Container'

// ─────────────────────────────────────────────────────────────────────────────
// 8.1  XDP vs Normal path D3 diagram
// ─────────────────────────────────────────────────────────────────────────────

function renderXdpVsNormal(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c = themeColors(isDark)
    const textColor = c.text
    const dimColor = c.textMuted
    const borderColor = c.border


    const g = svg.append('g')

    const padX = 20
    const padY = 16
    const halfW = (width - padX * 2) / 2
    const gap = 8
    const labelY = padY + 14

    // ── Section headers ────────────────────────────────────────────────────────
    g.append('text')
        .attr('x', padX + halfW / 2)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', dimColor)
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text('일반 경로 (Normal Path)')

    g.append('text')
        .attr('x', padX + halfW + halfW / 2)
        .attr('y', labelY)
        .attr('text-anchor', 'middle')
        .attr('fill', c.amberStroke)
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text('XDP 경로 (eXpress Data Path)')

    // divider
    g.append('line')
        .attr('x1', padX + halfW)
        .attr('y1', padY)
        .attr('x2', padX + halfW)
        .attr('y2', height - padY)
        .attr('stroke', borderColor)
        .attr('stroke-dasharray', '4 3')
        .attr('stroke-width', 1)

    // ── Helper: draw a rounded box ─────────────────────────────────────────────
    function drawBox(
        cx: number,
        cy: number,
        w: number,
        h: number,
        fill: string,
        stroke: string,
        label: string,
        sublabel?: string,
    ) {
        g.append('rect')
            .attr('x', cx - w / 2)
            .attr('y', cy - h / 2)
            .attr('width', w)
            .attr('height', h)
            .attr('rx', 5)
            .attr('fill', fill)
            .attr('stroke', stroke)
            .attr('stroke-width', 1.5)

        g.append('text')
            .attr('x', cx)
            .attr('y', cy + (sublabel ? -4 : 1))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '10px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-weight', 'bold')
            .text(label)

        if (sublabel) {
            g.append('text')
                .attr('x', cx)
                .attr('y', cy + 10)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', dimColor)
                .attr('font-size', '8px')
                .attr('font-family', "'JetBrains Mono', monospace")
                .text(sublabel)
        }
    }

    function arrow(x1: number, y1: number, x2: number, y2: number, color: string) {
        const markerId = `arrow-${Math.random().toString(36).slice(2)}`
        svg.append('defs')
            .append('marker')
            .attr('id', markerId)
            .attr('viewBox', '0 -4 8 8')
            .attr('refX', 7)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-4L8,0L0,4')
            .attr('fill', color)

        g.append('line')
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('marker-end', `url(#${markerId})`)
    }

    // ── Left: Normal path ─────────────────────────────────────────────────────
    const lCX = padX + halfW / 2
    const normalNodes = [
        { label: 'NIC', sub: '하드웨어', fill: c.blueFill, stroke: c.blueStroke },
        { label: '드라이버', sub: 'NAPI poll', fill: c.cyanFill, stroke: c.cyanStroke },
        { label: 'sk_buff 할당', sub: '메모리 할당', fill: c.amberFill, stroke: c.amberStroke },
        { label: 'Netfilter', sub: 'iptables/nftables', fill: c.purpleFill, stroke: c.purpleStroke },
        { label: 'TCP/IP 스택', sub: 'L3/L4 처리', fill: c.greenFill, stroke: c.greenStroke },
        { label: '소켓 버퍼', sub: 'rcvmsg', fill: c.blueFill, stroke: c.blueStroke },
        { label: '프로세스', sub: 'userspace recv()', fill: c.bgCard, stroke: c.border },
    ]

    const boxW = Math.min(halfW - 28, 130)
    const boxH = 30
    const startY = labelY + 20
    const stepY = Math.max(boxH + gap, (height - padY - startY - boxH) / (normalNodes.length - 1))

    normalNodes.forEach((node, i) => {
        const cy = startY + i * stepY + boxH / 2
        drawBox(lCX, cy, boxW, boxH, node.fill, node.stroke, node.label, node.sub)
        if (i < normalNodes.length - 1) {
            arrow(lCX, cy + boxH / 2, lCX, cy + stepY - boxH / 2 + 2, c.textDim)
        }
    })

    // ── Right: XDP path ───────────────────────────────────────────────────────
    const rCX = padX + halfW + halfW / 2
    const xdpTopNodes = [
        { label: 'NIC', sub: '하드웨어', fill: c.blueFill, stroke: c.blueStroke },
        { label: '드라이버', sub: 'DMA 직후', fill: c.cyanFill, stroke: c.cyanStroke },
        { label: 'XDP Hook', sub: 'eBPF 실행', fill: c.amberFill, stroke: c.amberStroke },
    ]

    const xdpStepY = stepY
    xdpTopNodes.forEach((node, i) => {
        const cy = startY + i * xdpStepY + boxH / 2
        drawBox(rCX, cy, boxW, boxH, node.fill, node.stroke, node.label, node.sub)
        if (i < xdpTopNodes.length - 1) {
            arrow(rCX, cy + boxH / 2, rCX, cy + xdpStepY - boxH / 2 + 2, c.amberStroke)
        }
    })

    // XDP Hook cy
    const xdpHookCY = startY + 2 * xdpStepY + boxH / 2

    // XDP Action boxes (horizontal spread below hook)
    const actions = [
        { label: 'XDP_DROP', color: '#ef4444', desc: 'DDoS 방어' },
        { label: 'XDP_TX', color: '#8b5cf6', desc: '즉시 반송' },
        { label: 'XDP_REDIRECT', color: '#06b6d4', desc: '다른 NIC/CPU' },
        { label: 'XDP_PASS', color: '#22c55e', desc: '일반 스택으로' },
    ]

    const actionAreaY = xdpHookCY + boxH / 2 + 18
    const actionBoxW = Math.min((halfW - 20) / 4 - 4, 68)
    const actionBoxH = 34
    const totalActionsW = actions.length * (actionBoxW + 4) - 4
    const actionsStartX = rCX - totalActionsW / 2

    actions.forEach((act, i) => {
        const cx = actionsStartX + i * (actionBoxW + 4) + actionBoxW / 2
        const cy = actionAreaY + actionBoxH / 2

        g.append('rect')
            .attr('x', cx - actionBoxW / 2)
            .attr('y', cy - actionBoxH / 2)
            .attr('width', actionBoxW)
            .attr('height', actionBoxH)
            .attr('rx', 4)
            .attr('fill', act.color + (isDark ? '22' : '11'))
            .attr('stroke', act.color)
            .attr('stroke-width', 1.5)

        g.append('text')
            .attr('x', cx)
            .attr('y', cy - 5)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', act.color)
            .attr('font-size', '8px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-weight', 'bold')
            .text(act.label)

        g.append('text')
            .attr('x', cx)
            .attr('y', cy + 9)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', dimColor)
            .attr('font-size', '7.5px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(act.desc)

        // arrow from xdp hook down to actions
        arrow(rCX, xdpHookCY + boxH / 2, cx, cy - actionBoxH / 2, act.color)
    })

    // XDP_PASS continues to normal path — draw a small note
    const passAction = actions[3]
    const passCX = actionsStartX + 3 * (actionBoxW + 4) + actionBoxW / 2
    const passCY = actionAreaY + actionBoxH / 2
    g.append('text')
        .attr('x', passCX)
        .attr('y', passCY + actionBoxH / 2 + 12)
        .attr('text-anchor', 'middle')
        .attr('fill', passAction.color)
        .attr('font-size', '7.5px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .text('↓ 일반 경로 계속')
}

export function XdpVsNormalDiagram() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderXdpVsNormal(svg, w, h, isDark)
        },
        [isDark],
    )

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <D3Container renderFn={renderFn} deps={[isDark]} height={380} zoomable={true} />
        </div>
    )
}
