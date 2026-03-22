// Driver hierarchy D3 horizontal tree
// Extracted from src/pages/topic10-drivers/index.tsx

import { useCallback } from 'react'
import * as d3 from 'd3'
import { useTheme } from '../../../hooks/useTheme'
import { themeColors } from '../../../lib/colors'
import { D3Container } from '../../viz/D3Container'

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

interface DriverNode {
    name: string
    sub?: string
    kind?: 'root' | 'char' | 'block' | 'net'
    children?: DriverNode[]
}

const driverTreeData: DriverNode = {
    name: '커널',
    kind: 'root',
    children: [
        {
            name: '문자 디바이스',
            kind: 'char',
            children: [
                { name: '/dev/ttyS0', sub: '시리얼', kind: 'char' },
                { name: '/dev/input', sub: '키보드/마우스', kind: 'char' },
            ],
        },
        {
            name: '블록 디바이스',
            kind: 'block',
            children: [
                { name: '/dev/sda', sub: 'SCSI/SATA', kind: 'block' },
                { name: '/dev/nvme0', sub: 'NVMe', kind: 'block' },
            ],
        },
        {
            name: '네트워크 디바이스',
            kind: 'net',
            children: [
                { name: 'eth0', sub: 'e1000 드라이버', kind: 'net' },
                { name: 'lo', sub: '루프백', kind: 'net' },
            ],
        },
    ],
}

function kindColors(kind: DriverNode['kind'], isDark: boolean) {
    const c = themeColors(isDark)
    switch (kind) {
        case 'char':
            return { fill: c.amberFill, stroke: c.amberStroke, text: c.amberText }
        case 'block':
            return { fill: c.blueFill, stroke: c.blueStroke, text: c.blueText }
        case 'net':
            return { fill: c.greenFill, stroke: c.greenStroke, text: c.greenText }
        default:
            return { fill: c.bgCard, stroke: c.textDim, text: c.text }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// D3 render function
// ─────────────────────────────────────────────────────────────────────────────

function renderDriverTree(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c = themeColors(isDark)

    const g = svg.append('g')

    const padX = 24
    const padY = 20
    const innerW = width - padX * 2
    const innerH = height - padY * 2

    const root = d3.hierarchy<DriverNode>(driverTreeData)
    const treeLayout = d3.tree<DriverNode>().size([innerH, innerW])
    treeLayout(root)

    const nodeW = 108
    const nodeH = 36

    const linkColor = c.link

    const links = root.links() as d3.HierarchyPointLink<DriverNode>[]
    links.forEach((link) => {
        const s = link.source as d3.HierarchyPointNode<DriverNode>
        const t = link.target as d3.HierarchyPointNode<DriverNode>

        const sx = padX + s.y
        const sy = padY + s.x
        const tx = padX + t.y
        const ty = padY + t.x

        const mx = (sx + nodeW / 2 + tx - nodeW / 2) / 2

        g.append('path')
            .attr('d', `M${sx + nodeW / 2},${sy} C${mx},${sy} ${mx},${ty} ${tx - nodeW / 2},${ty}`)
            .attr('fill', 'none')
            .attr('stroke', linkColor)
            .attr('stroke-width', 1.5)
    })

    root.descendants().forEach((d) => {
        const nd = d as d3.HierarchyPointNode<DriverNode>
        const cx = padX + nd.y
        const cy = padY + nd.x
        const colors = kindColors(nd.data.kind, isDark)

        g.append('rect')
            .attr('x', cx - nodeW / 2)
            .attr('y', cy - nodeH / 2)
            .attr('width', nodeW)
            .attr('height', nodeH)
            .attr('rx', 6)
            .attr('fill', colors.fill)
            .attr('stroke', colors.stroke)
            .attr('stroke-width', 1.5)

        g.append('text')
            .attr('x', cx)
            .attr('y', cy + (nd.data.sub ? -5 : 1))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', colors.text)
            .attr('font-size', '10px')
            .attr('font-family', "'JetBrains Mono', monospace")
            .attr('font-weight', 'bold')
            .text(nd.data.name)

        if (nd.data.sub) {
            g.append('text')
                .attr('x', cx)
                .attr('y', cy + 10)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', c.textMuted)
                .attr('font-size', '8px')
                .attr('font-family', "'Pretendard Variable', Pretendard, sans-serif")
                .text(nd.data.sub)
        }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function DriverTreeChart() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderDriverTree(svg, w, h, isDark)
        },
        [isDark],
    )

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700">
            <D3Container renderFn={renderFn} deps={[isDark]} height={260} zoomable={true} />
        </div>
    )
}
