// /proc filesystem tree D3 visualisation
// Extracted from src/pages/topic11-debugging/index.tsx

import { useCallback } from 'react'
import * as d3 from 'd3'
import { useTheme } from '../../../hooks/useTheme'
import { themeColors } from '../../../lib/colors'
import { D3Container } from '../../viz/D3Container'

// ─────────────────────────────────────────────────────────────────────────────
// Types & data
// ─────────────────────────────────────────────────────────────────────────────

interface TreeNodeData {
    name: string
    color?: string
    children?: TreeNodeData[]
}

const procTreeData: TreeNodeData = {
    name: '/proc',
    color: '#3b82f6',
    children: [
        {
            name: '/proc/<pid>/',
            color: '#10b981',
            children: [
                { name: 'maps', color: '#34d399' },
                { name: 'status', color: '#34d399' },
                { name: 'fd/', color: '#34d399' },
                { name: 'net/', color: '#34d399' },
            ],
        },
        {
            name: '/proc/net/',
            color: '#8b5cf6',
            children: [
                { name: 'dev', color: '#a78bfa' },
                { name: 'tcp', color: '#a78bfa' },
                { name: 'softnet_stat', color: '#a78bfa' },
            ],
        },
        {
            name: '/proc/sys/',
            color: '#f59e0b',
            children: [
                { name: 'kernel/', color: '#fbbf24' },
                { name: 'net/', color: '#fbbf24' },
            ],
        },
        { name: '/proc/interrupts', color: '#ef4444' },
    ],
}

// ─────────────────────────────────────────────────────────────────────────────
// D3 render function
// ─────────────────────────────────────────────────────────────────────────────

function renderProcTree(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c = themeColors(isDark)
    const textColor = c.text
    const dimColor = c.textMuted
    const linkColor = c.link


    const padX = 20
    const padY = 20
    const innerW = width - padX * 2
    const innerH = height - padY * 2

    const root = d3.hierarchy<TreeNodeData>(procTreeData)

    const treeLayout = d3.tree<TreeNodeData>().size([innerH, innerW])
    treeLayout(root)

    const g = svg.append('g')

    const linkGenerator = d3
        .linkHorizontal<d3.HierarchyPointLink<TreeNodeData>, d3.HierarchyPointNode<TreeNodeData>>()
        .x((d) => (d as d3.HierarchyPointNode<TreeNodeData>).y + padX)
        .y((d) => (d as d3.HierarchyPointNode<TreeNodeData>).x + padY)

    const pointRoot = root as d3.HierarchyPointNode<TreeNodeData>
    g.selectAll('path.link')
        .data(pointRoot.links())
        .enter()
        .append('path')
        .attr('class', 'link')
        .attr('d', (d) => linkGenerator(d) ?? '')
        .attr('fill', 'none')
        .attr('stroke', linkColor)
        .attr('stroke-width', 1.2)

    const nodes = g
        .selectAll('g.node')
        .data(root.descendants())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', (d) => {
            const pd = d as d3.HierarchyPointNode<TreeNodeData>
            return `translate(${pd.y + padX},${pd.x + padY})`
        })

    nodes
        .append('circle')
        .attr('r', 4)
        .attr('fill', (d) => d.data.color ?? dimColor)
        .attr('stroke', (d) => d.data.color ?? dimColor)
        .attr('stroke-width', 1.5)

    nodes
        .append('text')
        .attr('x', (d) => (d.children ? -8 : 8))
        .attr('y', 0)
        .attr('text-anchor', (d) => (d.children ? 'end' : 'start'))
        .attr('dominant-baseline', 'middle')
        .attr('fill', (d) => d.data.color ?? textColor)
        .attr('font-size', '10px')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-weight', (d) => (d.depth <= 1 ? 'bold' : 'normal'))
        .text((d) => d.data.name)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

export function ProcTreeChart() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderProcTree(svg, w, h, isDark)
        },
        [isDark],
    )

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <D3Container renderFn={renderFn} deps={[isDark]} height={280} zoomable={true} />
        </div>
    )
}
