import * as d3 from 'd3'
import { useCallback } from 'react'
import { useTheme } from '../../../hooks/useTheme'
import { themeColors } from '../../../lib/colors'
import { D3Container } from '../../../components/viz/D3Container'

// ─────────────────────────────────────────────────────────────────────────────
// 6.1  네트워크 레이어 다이어그램 (D3)
// ─────────────────────────────────────────────────────────────────────────────
interface LayerInfo {
    label: string
    fn: string
    step: string
    fill: string
    stroke: string
    textColor: string
    fnColor: string
}

function getNetworkLayers(isDark: boolean): LayerInfo[] {
    const c = themeColors(isDark)
    return [
        {
            label: 'User Process',
            fn: 'recv() / read()',
            step: '7. app이 데이터를 읽음',
            fill: isDark ? 'oklch(22% 0.06 250)' : 'oklch(93% 0.02 250)',
            stroke: isDark ? 'oklch(62% 0.20 250)' : 'oklch(50% 0.20 250)',
            textColor: c.text,
            fnColor: c.textMuted,
        },
        {
            label: 'Socket Layer',
            fn: 'sock_recvmsg()',
            step: '6. 소켓 수신 큐에서 유저로 복사',
            fill: c.blueFill,
            stroke: c.blueStroke,
            textColor: c.blueText,
            fnColor: c.blueStroke,
        },
        {
            label: 'Transport Layer L4',
            fn: 'tcp_v4_rcv() / udp_rcv()',
            step: '5. TCP/UDP 처리, 포트 매칭',
            fill: c.indigoFill,
            stroke: c.indigoStroke,
            textColor: c.indigoText,
            fnColor: c.indigoStroke,
        },
        {
            label: 'Network Layer L3',
            fn: 'ip_rcv() / ip_route_input()',
            step: '4. IP 주소 확인, 라우팅 결정',
            fill: c.purpleFill,
            stroke: c.purpleStroke,
            textColor: c.purpleText,
            fnColor: c.purpleStroke,
        },
        {
            label: 'Link Layer L2',
            fn: 'eth_type_trans() / arp_rcv()',
            step: '3. MAC 주소 확인, 프로토콜 분류',
            fill: c.pinkFill,
            stroke: c.pinkStroke,
            textColor: c.pinkText,
            fnColor: c.pinkStroke,
        },
        {
            label: 'Driver / NAPI',
            fn: 'netif_receive_skb() / napi_poll()',
            step: '2. NAPI poll로 sk_buff 생성',
            fill: c.amberFill,
            stroke: c.amberStroke,
            textColor: c.amberText,
            fnColor: c.amberStroke,
        },
        {
            label: 'NIC Hardware',
            fn: 'DMA Ring Buffer / IRQ',
            step: '1. 패킷 수신, DMA로 링 버퍼 복사',
            fill: c.redFill,
            stroke: c.redStroke,
            textColor: c.redText,
            fnColor: c.redStroke,
        },
    ]
}

function renderNetworkLayers(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const networkLayers = getNetworkLayers(isDark)
    const padX = 56
    const padTop = 16
    const padBottom = 16
    const arrowAreaW = 44
    const layerAreaX = padX + arrowAreaW
    const layerAreaW = width - layerAreaX - 8
    const n = networkLayers.length
    const totalH = height - padTop - padBottom
    const layerH = totalH / n
    const rx = 8

    // Draw "패킷 흐름 ↑" arrow on the left
    const arrowX = padX + arrowAreaW / 2
    const arrowTop = padTop + 20
    const arrowBottom = padTop + totalH - 20

    // Simple arrow line with triangle head
    svg.append('line')
        .attr('x1', arrowX)
        .attr('y1', arrowBottom)
        .attr('x2', arrowX)
        .attr('y2', arrowTop)
        .attr('stroke', c.textMuted)
        .attr('stroke-width', 2)

    // Triangle arrowhead
    svg.append('polygon')
        .attr('points', `${arrowX - 5},${arrowTop + 8} ${arrowX},${arrowTop} ${arrowX + 5},${arrowTop + 8}`)
        .attr('fill', c.textMuted)

    // Label
    svg.append('text')
        .attr('x', arrowX)
        .attr('y', arrowBottom + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', c.textMuted)
        .attr('font-size', 10)
        .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
        .text('패킷 흐름 ↑')

    // Draw layers (top = user, bottom = hardware)
    networkLayers.forEach((layer, i) => {
        const y = padTop + i * layerH

        const g = svg.append('g')

        g.append('rect')
            .attr('x', layerAreaX)
            .attr('y', y)
            .attr('width', layerAreaW)
            .attr('height', layerH - 2)
            .attr('rx', rx)
            .attr('fill', layer.fill)
            .attr('stroke', layer.stroke)
            .attr('stroke-width', 1.5)

        // Layer label (left aligned)
        g.append('text')
            .attr('x', layerAreaX + 14)
            .attr('y', y + layerH * 0.35)
            .attr('dominant-baseline', 'auto')
            .attr('fill', layer.textColor)
            .attr('font-size', 13)
            .attr('font-weight', '600')
            .text(layer.label)

        // Step description (left aligned, below label)
        g.append('text')
            .attr('x', layerAreaX + 14)
            .attr('y', y + layerH * 0.65)
            .attr('dominant-baseline', 'auto')
            .attr('fill', layer.fnColor)
            .attr('font-size', 11)
            .text(layer.step)

        // Function name (right side, smaller)
        g.append('text')
            .attr('x', layerAreaX + layerAreaW - 14)
            .attr('y', y + layerH * 0.55)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'auto')
            .attr('fill', layer.fnColor)
            .attr('font-size', 10)
            .attr('font-family', "'JetBrains Mono', monospace")
            .text(layer.fn)
    })
}

export function NetworkLayerDiagram() {
    const { theme } = useTheme()

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
            renderNetworkLayers(svg, width, height)
        },
        [theme], // eslint-disable-line react-hooks/exhaustive-deps
    )

    return (
        <D3Container
            renderFn={renderFn}
            deps={[theme]}
            height={420}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950"
        />
    )
}
