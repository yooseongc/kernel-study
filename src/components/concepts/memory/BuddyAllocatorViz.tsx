import { useState, useCallback } from 'react'
import * as d3 from 'd3'
import { useTheme, themeColors , D3Container, createD3Theme } from '@study-ui/components'

// ─────────────────────────────────────────────────────────────────────────────
// 3.5  Buddy Allocator (인터랙티브)
// ─────────────────────────────────────────────────────────────────────────────
const TOTAL_PAGES = 32
const MAX_ORDER = 5

interface BuddyState {
    pages: (number | null)[]
    freeList: number[][]
    nextId: number
    log: string[]
    allocations: { id: number; pfn: number; order: number }[]
}

function initBuddy(): BuddyState {
    const freeList: number[][] = Array.from({ length: MAX_ORDER + 1 }, () => [])
    freeList[MAX_ORDER] = [0]
    return {
        pages: new Array(TOTAL_PAGES).fill(null),
        freeList,
        nextId: 0,
        log: ['초기 상태: order-5 블록 1개 (32 pages = 128KB)'],
        allocations: [],
    }
}

function buddyAlloc(state: BuddyState, order: number): BuddyState {
    let availOrder = -1
    for (let o = order; o <= MAX_ORDER; o++) {
        if (state.freeList[o].length > 0) {
            availOrder = o
            break
        }
    }
    if (availOrder === -1) {
        return { ...state, log: [`할당 실패: order-${order} (OOM)`, ...state.log] }
    }

    const newFL = state.freeList.map((l) => [...l])
    const pfn = newFL[availOrder].shift()!

    for (let o = availOrder; o > order; o--) {
        const buddyPfn = pfn + (1 << (o - 1))
        newFL[o - 1].push(buddyPfn)
        newFL[o - 1].sort((a, b) => a - b)
    }

    const allocId = state.nextId
    const newPages = [...state.pages]
    for (let i = pfn; i < pfn + (1 << order); i++) newPages[i] = allocId

    const splitMsg = availOrder > order ? ` (order-${availOrder} → order-${order} 분할)` : ''
    return {
        pages: newPages,
        freeList: newFL,
        nextId: state.nextId + 1,
        log: [`alloc(order=${order}, ${1 << order} pages, PFN ${pfn})${splitMsg}`, ...state.log].slice(0, 8),
        allocations: [...state.allocations, { id: allocId, pfn, order }],
    }
}

function buddyFree(state: BuddyState, allocId: number): BuddyState {
    const alloc = state.allocations.find((a) => a.id === allocId)
    if (!alloc) return state

    const newPages = [...state.pages]
    for (let i = alloc.pfn; i < alloc.pfn + (1 << alloc.order); i++) newPages[i] = null

    const newFL = state.freeList.map((l) => [...l])
    let pfn = alloc.pfn
    let ord = alloc.order

    while (ord < MAX_ORDER) {
        const buddyPfn = pfn ^ (1 << ord)
        const buddyIdx = newFL[ord].indexOf(buddyPfn)
        if (buddyIdx === -1) break
        newFL[ord].splice(buddyIdx, 1)
        pfn = Math.min(pfn, buddyPfn)
        ord++
    }
    newFL[ord].push(pfn)
    newFL[ord].sort((a, b) => a - b)

    return {
        pages: newPages,
        freeList: newFL,
        nextId: state.nextId,
        log: [`free(order=${alloc.order}, PFN ${alloc.pfn}) → order-${ord}로 합병`, ...state.log].slice(0, 8),
        allocations: state.allocations.filter((a) => a.id !== allocId),
    }
}

const ALLOC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

function renderBuddyViz(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    state: BuddyState,
    isDark: boolean,
) {
    const c = themeColors(isDark)
    const theme = createD3Theme(isDark)
    const freeFill = c.bgCard
    const freeStroke = c.border
    const textFill = c.text
    const dimFill = c.textDim
    const headerFill = c.textMuted


    const padL = 8,
        padT = 24,
        padB = 60
    const gridH = height - padT - padB
    const cellW = Math.max(8, (width - padL * 2) / TOTAL_PAGES)
    const cellH = Math.min(36, gridH)

    const g = svg.append('g')

    // PFN header
    g.append('text')
        .attr('x', padL)
        .attr('y', 14)
        .attr('fill', headerFill)
        .attr('font-size', '10px')
        .attr('font-family', theme.fonts.sans)
        .text('Physical Pages (PFN 0–31)')

    // Page cells
    for (let i = 0; i < TOTAL_PAGES; i++) {
        const cx = padL + i * cellW
        const cy = padT
        const allocId = state.pages[i]
        const fill = allocId !== null ? ALLOC_COLORS[allocId % ALLOC_COLORS.length] : freeFill
        const stroke = allocId !== null ? fill : freeStroke

        g.append('rect')
            .attr('x', cx)
            .attr('y', cy)
            .attr('width', cellW - 1)
            .attr('height', cellH)
            .attr('rx', 2)
            .attr('fill', fill)
            .attr('stroke', stroke)
            .attr('stroke-width', 1)

        // PFN label (only show every 4 to avoid crowding)
        if (i % 4 === 0 || cellW >= 14) {
            g.append('text')
                .attr('x', cx + (cellW - 1) / 2)
                .attr('y', cy + cellH + 10)
                .attr('text-anchor', 'middle')
                .attr('fill', dimFill)
                .attr('font-size', '8px')
                .attr('font-family', theme.fonts.mono)
                .text(String(i))
        }
    }

    // Draw allocation borders
    for (const alloc of state.allocations) {
        const cx = padL + alloc.pfn * cellW
        const cy = padT
        const aw = cellW * (1 << alloc.order) - 1
        const color = ALLOC_COLORS[alloc.id % ALLOC_COLORS.length]
        g.append('rect')
            .attr('x', cx)
            .attr('y', cy)
            .attr('width', aw)
            .attr('height', cellH)
            .attr('rx', 2)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 2.5)

        // Alloc label inside block
        if (aw > 20) {
            g.append('text')
                .attr('x', cx + aw / 2)
                .attr('y', cy + cellH / 2 + 1)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', isDark ? '#fff' : '#1f2937')
                .attr('font-size', '9px')
                .attr('font-family', theme.fonts.mono)
                .attr('font-weight', 'bold')
                .text(`#${alloc.id}`)
        }
    }

    // Free list table at bottom
    const flY = padT + cellH + 22
    const colW = (width - padL * 2) / (MAX_ORDER + 1)

    for (let o = 0; o <= MAX_ORDER; o++) {
        const cx = padL + o * colW
        const blocks = state.freeList[o]

        g.append('text')
            .attr('x', cx + colW / 2)
            .attr('y', flY)
            .attr('text-anchor', 'middle')
            .attr('fill', headerFill)
            .attr('font-size', '9px')
            .attr('font-family', theme.fonts.mono)
            .attr('font-weight', 'bold')
            .text(`ord-${o}`)

        g.append('text')
            .attr('x', cx + colW / 2)
            .attr('y', flY + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', dimFill)
            .attr('font-size', '8px')
            .attr('font-family', theme.fonts.mono)
            .text(`${1 << o}p`)

        const blockText = blocks.length > 0 ? blocks.join(',') : '—'
        g.append('text')
            .attr('x', cx + colW / 2)
            .attr('y', flY + 28)
            .attr('text-anchor', 'middle')
            .attr('fill', blocks.length > 0 ? textFill : dimFill)
            .attr('font-size', '9px')
            .attr('font-family', theme.fonts.mono)
            .text(blockText.length > 10 ? blockText.slice(0, 9) + '…' : blockText)
    }
}

export function BuddyAllocatorViz() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const [buddyState, setBuddyState] = useState<BuddyState>(initBuddy)

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
            renderBuddyViz(svg, width, height, buddyState, isDark)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [buddyState, theme],
    )

    const handleAlloc = (order: number) => setBuddyState((s) => buddyAlloc(s, order))
    const handleFree = () => {
        if (buddyState.allocations.length === 0) return
        const last = buddyState.allocations[buddyState.allocations.length - 1]
        setBuddyState((s) => buddyFree(s, last.id))
    }

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-gray-600 dark:text-gray-400 font-mono">할당:</span>
                {([0, 1, 2, 3, 4] as const).map((order) => (
                    <button
                        key={order}
                        onClick={() => handleAlloc(order)}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono transition"
                    >
                        {1 << order}p ({4 * (1 << order)}KB)
                    </button>
                ))}
                <button
                    onClick={handleFree}
                    disabled={buddyState.allocations.length === 0}
                    className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono transition disabled:opacity-40"
                >
                    마지막 해제
                </button>
                <button
                    onClick={() => setBuddyState(initBuddy())}
                    className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-mono transition"
                >
                    초기화
                </button>
            </div>

            <D3Container renderFn={renderFn} deps={[buddyState, theme]} height={200} />

            {/* Log */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
                <div className="text-xs text-gray-500 font-mono mb-2">동작 로그</div>
                {buddyState.log.map((entry, i) => (
                    <div key={i} className="text-xs font-mono text-gray-700 dark:text-gray-300">
                        <span className="text-gray-400 dark:text-gray-600 mr-2">{buddyState.log.length - i}.</span>
                        {entry}
                    </div>
                ))}
            </div>
        </div>
    )
}
