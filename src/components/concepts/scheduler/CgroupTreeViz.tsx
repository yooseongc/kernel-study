import * as d3 from 'd3'
import { useCallback } from 'react'
import { useTheme } from '../../../hooks/useTheme'
import { themeColors } from '../../../lib/colors'
import { D3Container } from '../../viz/D3Container'

interface CgroupNode {
    name: string
    type: 'root' | 'system' | 'user' | 'custom' | 'service' | 'process'
    detail?: string
    children?: CgroupNode[]
}

const cgroupTreeData: CgroupNode = {
    name: '/ (root)',
    type: 'root',
    detail: 'cgroup v2',
    children: [
        {
            name: 'system.slice',
            type: 'system',
            detail: 'systemd 서비스',
            children: [
                { name: 'sshd.service', type: 'service', detail: 'cpu.max: max' },
                { name: 'nginx.service', type: 'service', detail: 'memory.max: 256M' },
            ],
        },
        {
            name: 'user.slice',
            type: 'user',
            detail: '사용자 세션',
            children: [
                {
                    name: 'user-1000.slice',
                    type: 'user',
                    detail: 'UID 1000',
                    children: [{ name: 'bash', type: 'process', detail: 'PID 1234' }],
                },
            ],
        },
        {
            name: 'myapp',
            type: 'custom',
            detail: 'cpu: 20% / mem: 512M',
            children: [
                { name: 'worker-1', type: 'process', detail: 'PID 5678' },
                { name: 'worker-2', type: 'process', detail: 'PID 5679' },
            ],
        },
    ],
}

function renderCgroupTree(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const textFill = c.text
    const dimFill = c.textMuted
    const linkColor = c.link

    type ColorPair = { fill: string; stroke: string; text: string }
    const colorMap: Record<string, ColorPair> = {
        root: { fill: c.blueFill, stroke: c.blueStroke, text: c.blueText },
        system: { fill: c.bgCard, stroke: c.textDim, text: c.textMuted },
        user: { fill: c.greenFill, stroke: c.greenStroke, text: c.greenText },
        custom: { fill: c.amberFill, stroke: c.amberStroke, text: c.amberText },
        service: { fill: c.bg, stroke: c.textDim, text: c.textMuted },
        process: { fill: c.cyanFill, stroke: c.cyanStroke, text: c.cyanText },
    }

    const NW = 114,
        NH = 38,
        NR = 6
    const padX = NW / 2 + 8
    const padY = NH / 2 + 8
    const innerW = width - padX * 2
    const innerH = height - padY * 2

    const root = d3.hierarchy<CgroupNode>(cgroupTreeData, (d) => d.children)
    d3.tree<CgroupNode>()
        .size([innerH, innerW])
        .separation((a, b) => (a.parent === b.parent ? 1.4 : 2))(root)
    root.each((d) => {
        ;(d as d3.HierarchyPointNode<CgroupNode>).y += padX
        ;(d as d3.HierarchyPointNode<CgroupNode>).x += padY
    })

    const g = svg.append('g')

    g.selectAll('path.link')
        .data(root.links() as d3.HierarchyPointLink<CgroupNode>[])
        .join('path')
        .attr('fill', 'none')
        .attr('stroke', linkColor)
        .attr('stroke-width', 1)
        .attr('d', (d) => {
            const sx = d.source.y + NW / 2,
                sy = d.source.x
            const tx = d.target.y - NW / 2,
                ty = d.target.x
            const mx = (sx + tx) / 2
            return `M ${sx},${sy} C ${mx},${sy} ${mx},${ty} ${tx},${ty}`
        })

    const nodeG = g
        .selectAll<SVGGElement, d3.HierarchyPointNode<CgroupNode>>('g.node')
        .data(root.descendants())
        .join('g')
        .attr('class', 'node')
        .attr('transform', (d) => `translate(${d.y},${d.x})`)

    nodeG
        .append('rect')
        .attr('x', -NW / 2)
        .attr('y', -NH / 2)
        .attr('width', NW)
        .attr('height', NH)
        .attr('rx', NR)
        .attr('fill', (d) => colorMap[d.data.type]?.fill ?? colorMap.service.fill)
        .attr('stroke', (d) => colorMap[d.data.type]?.stroke ?? colorMap.service.stroke)
        .attr('stroke-width', 1.5)

    nodeG
        .append('text')
        .attr('y', (d) => (d.data.detail ? -5 : 0))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', (d) => colorMap[d.data.type]?.text ?? textFill)
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', 'bold')
        .text((d) => d.data.name)

    nodeG
        .filter((d) => !!d.data.detail)
        .append('text')
        .attr('y', 8)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', dimFill)
        .attr('font-size', '8px')
        .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
        .text((d) => d.data.detail ?? '')
}

export function CgroupTreeViz() {
    const { theme } = useTheme()

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderCgroupTree(svg, w, h)
        },
        [theme], // eslint-disable-line react-hooks/exhaustive-deps
    )

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    cgroup v2 계층 구조 — /sys/fs/cgroup/
                </span>
            </div>
            <D3Container renderFn={renderFn} height={420} deps={[theme]} zoomable />
        </div>
    )
}
