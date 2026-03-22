import * as d3 from 'd3'
import { themeColors } from '../../../lib/colors'

// ─────────────────────────────────────────────────────────────────────────────
// 3.6  SLUB Allocator D3 시각화
// ─────────────────────────────────────────────────────────────────────────────
export function renderSlubViz(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    _height: number,
) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const textFill = c.text
    const dimFill = c.textMuted
    const bg = c.bg
    const borderColor = c.border
    const freeFill = c.bgCard
    const allocFill = c.blueFill
    const allocStroke = c.blueStroke
    const cacheColor = isDark ? 'oklch(55% 0.20 295)' : 'oklch(42% 0.22 295)'

    svg.style('background', bg)

    const padL = 12, padT = 10

    // Split SVG: left 52% for slab visualization, right for kmalloc table
    const slabSectionW = Math.floor(width * 0.52)
    const tableSectionX = slabSectionW + 8

    const g = svg.append('g')

    // kmem_cache header box
    const cacheW = Math.min(220, slabSectionW * 0.8)
    const cacheH = 44
    g.append('rect')
        .attr('x', padL).attr('y', padT)
        .attr('width', cacheW).attr('height', cacheH)
        .attr('rx', 6)
        .attr('fill', c.purpleFill)
        .attr('stroke', cacheColor).attr('stroke-width', 1.5)

    g.append('text')
        .attr('x', padL + cacheW / 2).attr('y', padT + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', cacheColor).attr('font-size', '11px')
        .attr('font-family', 'monospace').attr('font-weight', 'bold')
        .text('kmem_cache')

    g.append('text')
        .attr('x', padL + cacheW / 2).attr('y', padT + 32)
        .attr('text-anchor', 'middle')
        .attr('fill', dimFill).attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text('task_struct  size=9536B  align=64')

    // 3 slab pages
    const slabs = [
        { label: 'active', objs: [true, true, true, true, true, true] },
        { label: 'partial', objs: [true, false, true, false, true, false] },
        { label: 'full (free)', objs: [false, false, false, false, false, false] },
    ]
    const slabAreaW = slabSectionW - padL
    const slabW = slabAreaW / 3 - 8
    const slabStartY = padT + cacheH + 16
    const objCols = 3, objRows = 2
    const objW = (slabW - 16) / objCols
    const objH = 22

    slabs.forEach((slab, si) => {
        const sx = padL + si * (slabW + 8)
        const sy = slabStartY

        // Slab container
        g.append('rect')
            .attr('x', sx).attr('y', sy)
            .attr('width', slabW)
            .attr('height', objRows * (objH + 4) + 32)
            .attr('rx', 6)
            .attr('fill', c.bg)
            .attr('stroke', borderColor).attr('stroke-width', 1)

        g.append('text')
            .attr('x', sx + slabW / 2).attr('y', sy + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', slab.label === 'active' ? c.greenStroke : slab.label === 'partial' ? c.amberStroke : dimFill)
            .attr('font-size', '9px').attr('font-family', 'monospace').attr('font-weight', 'bold')
            .text(slab.label)

        // Objects
        const freeChain: { x: number; y: number }[] = []
        slab.objs.forEach((allocated, oi) => {
            const col = oi % objCols
            const row = Math.floor(oi / objCols)
            const ox = sx + 8 + col * (objW + 4)
            const oy = sy + 20 + row * (objH + 4)

            g.append('rect')
                .attr('x', ox).attr('y', oy)
                .attr('width', objW).attr('height', objH)
                .attr('rx', 3)
                .attr('fill', allocated ? allocFill : freeFill)
                .attr('stroke', allocated ? allocStroke : borderColor)
                .attr('stroke-width', 1)

            if (!allocated) {
                freeChain.push({ x: ox + objW / 2, y: oy + objH / 2 })
            }
        })

        // Free list chain arrows
        for (let i = 0; i < freeChain.length - 1; i++) {
            const p1 = freeChain[i], p2 = freeChain[i + 1]
            g.append('line')
                .attr('x1', p1.x).attr('y1', p1.y)
                .attr('x2', p2.x).attr('y2', p2.y)
                .attr('stroke', dimFill).attr('stroke-width', 1).attr('stroke-dasharray', '2,2')
        }
    })

    // kmalloc size class table — placed in dedicated right section
    const tableX = tableSectionX
    const tableY = padT
    const sizes = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192]
    const rowH = 16

    g.append('text')
        .attr('x', tableX).attr('y', tableY + 12)
        .attr('fill', textFill).attr('font-size', '10px')
        .attr('font-family', 'monospace').attr('font-weight', 'bold')
        .text('kmalloc size classes')

    sizes.forEach((sz, i) => {
        const ry = tableY + 24 + i * rowH
        g.append('text')
            .attr('x', tableX + 10).attr('y', ry + 10)
            .attr('fill', dimFill).attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .text(`kmalloc-${sz}   (${sz}B)`)
    })
}
