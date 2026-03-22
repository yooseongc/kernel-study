import * as d3 from 'd3'
import { themeColors } from '../../../lib/colors'

export function renderSubsystemGraph(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number
) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
  type NodeDatum = { id: string; label: string; group: number; x?: number; y?: number; fx?: number | null; fy?: number | null }
  type LinkDatum = { source: string | NodeDatum; target: string | NodeDatum }

  const nodes: NodeDatum[] = [
      { id: 'syscall', label: 'System Call', group: 0 },
      { id: 'vfs', label: 'VFS', group: 1 },
      { id: 'mm', label: 'Memory\nManager', group: 1 },
      { id: 'net', label: 'Network\nStack', group: 1 },
      { id: 'sched', label: 'Scheduler\n(CFS)', group: 1 },
      { id: 'block', label: 'Block Layer', group: 2 },
      { id: 'driver', label: 'Drivers', group: 2 },
      { id: 'cpu', label: 'CPU', group: 3 },
      { id: 'ram', label: 'RAM', group: 3 },
      { id: 'nic', label: 'NIC', group: 3 },
      { id: 'disk', label: 'Disk', group: 3 },
  ]

  const links: LinkDatum[] = [
      { source: 'syscall', target: 'vfs' },
      { source: 'syscall', target: 'mm' },
      { source: 'syscall', target: 'net' },
      { source: 'syscall', target: 'sched' },
      { source: 'vfs', target: 'block' },
      { source: 'block', target: 'driver' },
      { source: 'driver', target: 'disk' },
      { source: 'net', target: 'driver' },
      { source: 'driver', target: 'nic' },
      { source: 'mm', target: 'ram' },
      { source: 'sched', target: 'cpu' },
  ]

  const groupColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  const groupLabels = ['인터페이스', '코어 서브시스템', '디바이스 추상화', '하드웨어']

  svg.attr('viewBox', `0 0 ${width} ${height}`)

  const g = svg.append('g')

  const pad = 50
  const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(links).id((d: d3.SimulationNodeDatum) => (d as NodeDatum).id).distance(90))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(50))
      .force('boundary', () => {
          for (const node of nodes) {
              const n = node as NodeDatum
              if (n.x !== undefined) n.x = Math.max(pad, Math.min(width - pad, n.x))
              if (n.y !== undefined) n.y = Math.max(pad, Math.min(height - pad, n.y))
          }
      })

  // Links
  const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', c.link)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrow)')

  svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', c.textDim)

  // Nodes
  const node = g
      .append('g')
      .selectAll<SVGGElement, NodeDatum>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
          d3
              .drag<SVGGElement, NodeDatum>()
              .on('start', (event, d) => {
                  if (!event.active) simulation.alphaTarget(0.3).restart()
                  d.fx = d.x
                  d.fy = d.y
              })
              .on('drag', (event, d) => {
                  d.fx = event.x
                  d.fy = event.y
              })
              .on('end', (event, d) => {
                  if (!event.active) simulation.alphaTarget(0)
                  d.fx = null
                  d.fy = null
              })
      )

  node
      .append('circle')
      .attr('r', 30)
      .attr('fill', (d) => groupColors[d.group] + '33')
      .attr('stroke', (d) => groupColors[d.group])
      .attr('stroke-width', 1.5)

  node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', c.text)
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .each(function (d) {
          const lines = d.label.split('\n')
          const el = d3.select(this)
          lines.forEach((line, i) => {
              el.append('tspan')
                  .attr('x', 0)
                  .attr('dy', i === 0 ? `${-(lines.length - 1) * 0.5}em` : '1.1em')
                  .text(line)
          })
      })

  // Legend
  const legend = svg.append('g').attr('transform', `translate(12, 12)`)
  groupLabels.forEach((label, i) => {
      const row = legend.append('g').attr('transform', `translate(0, ${i * 20})`)
      row.append('circle').attr('r', 5).attr('fill', groupColors[i]).attr('cx', 5).attr('cy', 0)
      row.append('text').attr('x', 14).attr('y', 4).attr('fill', c.textMuted).attr('font-size', '11px').text(label)
  })

  simulation.on('tick', () => {
      link
          .attr('x1', (d) => (d.source as NodeDatum).x!)
          .attr('y1', (d) => (d.source as NodeDatum).y!)
          .attr('x2', (d) => (d.target as NodeDatum).x!)
          .attr('y2', (d) => (d.target as NodeDatum).y!)

      node.attr('transform', (d) => `translate(${d.x},${d.y})`)
  })
}
