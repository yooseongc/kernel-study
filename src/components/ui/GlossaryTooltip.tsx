/**
 * GlossaryTooltip — <T id="rcu">RCU</T>
 *
 * 점선 밑줄로 표시된 용어에 마우스오버/포커스 시
 * 정의 카드를 띄워주는 인라인 툴팁 컴포넌트.
 * React Portal을 이용해 overflow clipping 없이 렌더링.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { glossary, type GlossaryTerm } from '../../data/glossary'

// ── 카테고리 한국어 레이블 ──────────────────────────────────────────────────
const CATEGORY_LABEL: Record<GlossaryTerm['category'], string> = {
    process:   '프로세스',
    memory:    '메모리',
    network:   '네트워크',
    interrupt: '인터럽트',
    sync:      '동기화',
    driver:    '드라이버',
    debug:     '디버깅',
    general:   '일반',
    fs:        '파일시스템',
    security:  '보안',
    virt:      '가상화',
}

// ── 카테고리별 뱃지 색 ─────────────────────────────────────────────────────
const CATEGORY_COLOR: Record<GlossaryTerm['category'], string> = {
    process:   'text-blue-600   dark:text-blue-400   bg-blue-50   dark:bg-blue-950/50   border-blue-200   dark:border-blue-800',
    memory:    'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
    network:   'text-green-600  dark:text-green-400  bg-green-50  dark:bg-green-950/50  border-green-200  dark:border-green-800',
    interrupt: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800',
    sync:      'text-red-600    dark:text-red-400    bg-red-50    dark:bg-red-950/50    border-red-200    dark:border-red-800',
    driver:    'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800',
    debug:     'text-gray-600   dark:text-gray-400   bg-gray-50   dark:bg-gray-800      border-gray-200   dark:border-gray-700',
    general:   'text-gray-600   dark:text-gray-400   bg-gray-50   dark:bg-gray-800      border-gray-200   dark:border-gray-700',
    fs:        'text-teal-600   dark:text-teal-400   bg-teal-50   dark:bg-teal-950/50   border-teal-200   dark:border-teal-800',
    security:  'text-rose-600   dark:text-rose-400   bg-rose-50   dark:bg-rose-950/50   border-rose-200   dark:border-rose-800',
    virt:      'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800',
}

// ── glossary를 id → entry 맵으로 변환 (모듈 초기화 시 1회) ─────────────────
const glossaryMap = new Map(glossary.map(g => [g.id, g]))

// ── Props ──────────────────────────────────────────────────────────────────
interface Props {
    /** glossary.ts 의 GlossaryTerm.id */
    id: string
    children: React.ReactNode
}

// ── 툴팁 카드 위치 계산 결과 ───────────────────────────────────────────────
interface TooltipPos {
    top: number
    left: number
    /** true → 트리거 위에 표시 (화면 하단 부족 시) */
    flipY: boolean
}

const TOOLTIP_WIDTH = 320
const TOOLTIP_GAP   = 6   // 트리거와의 간격(px)
const SCREEN_MARGIN = 12  // 화면 가장자리 여백(px)

// ── 컴포넌트 ───────────────────────────────────────────────────────────────
export function T({ id, children }: Props) {
    const entry = glossaryMap.get(id)

    const [open, setOpen]     = useState(false)
    const [pos, setPos]       = useState<TooltipPos>({ top: 0, left: 0, flipY: false })
    const triggerRef          = useRef<HTMLSpanElement>(null)
    const tooltipRef          = useRef<HTMLDivElement>(null)
    const closeTimer          = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── 위치 계산 ──────────────────────────────────────────────────────────
    const calcPos = useCallback(() => {
        if (!triggerRef.current) return
        const rect = triggerRef.current.getBoundingClientRect()

        // 수평: 왼쪽 정렬 기본, 화면 우측 초과 시 오른쪽 끝 맞춤
        let left = rect.left
        if (left + TOOLTIP_WIDTH > window.innerWidth - SCREEN_MARGIN) {
            left = Math.max(SCREEN_MARGIN, rect.right - TOOLTIP_WIDTH)
        }

        // 수직: 아래쪽 기본, 아래 공간 부족 시 위로 뒤집기
        const spaceBelow = window.innerHeight - rect.bottom - TOOLTIP_GAP
        const flipY = spaceBelow < 160
        const top = flipY ? rect.top - TOOLTIP_GAP : rect.bottom + TOOLTIP_GAP

        setPos({ top, left, flipY })
    }, [])

    // ── 호버 딜레이 (트리거 → 툴팁 이동 시 닫힘 방지) ─────────────────────
    const cancelClose = useCallback(() => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
    }, [])

    const scheduleClose = useCallback(() => {
        cancelClose()
        closeTimer.current = setTimeout(() => setOpen(false), 120)
    }, [cancelClose])

    const openTooltip = useCallback(() => {
        cancelClose()
        calcPos()
        setOpen(true)
    }, [cancelClose, calcPos])

    // ── 외부 클릭 시 닫기 ─────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return
        const onMouseDown = (e: MouseEvent) => {
            if (
                triggerRef.current?.contains(e.target as Node) ||
                tooltipRef.current?.contains(e.target as Node)
            ) return
            setOpen(false)
        }
        document.addEventListener('mousedown', onMouseDown)
        return () => document.removeEventListener('mousedown', onMouseDown)
    }, [open])

    // ── Escape 로 닫기 ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open])

    // ── 언마운트 시 타이머 정리 ───────────────────────────────────────────
    useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

    // ── glossary에 없는 id → 폴백 (그냥 children 렌더) ───────────────────
    if (!entry) {
        return <span title={`glossary: unknown id "${id}"`}>{children}</span>
    }

    // ── 툴팁 카드 (portal → document.body) ───────────────────────────────
    const tooltipCard = open ? createPortal(
        <div
            ref={tooltipRef}
            role="tooltip"
            id={`glossary-tip-${id}`}
            style={{
                position: 'fixed',
                top:      pos.top,
                left:     pos.left,
                width:    TOOLTIP_WIDTH,
                zIndex:   9999,
                transformOrigin: pos.flipY ? 'bottom left' : 'top left',
            }}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl p-4 animate-in fade-in slide-in-from-top-1 duration-150"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
        >
            {/* 헤더: 용어 + 카테고리 뱃지 */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-mono font-semibold text-sm text-gray-900 dark:text-gray-100 leading-snug">
                    {entry.term}
                    {entry.aliases && entry.aliases.length > 0 && (
                        <span className="ml-1.5 font-normal text-gray-400 dark:text-gray-500 text-xs">
                            ({entry.aliases[0]})
                        </span>
                    )}
                </span>
                <span className={`text-xs border rounded-full px-2 py-0.5 shrink-0 font-medium ${CATEGORY_COLOR[entry.category]}`}>
                    {CATEGORY_LABEL[entry.category]}
                </span>
            </div>

            {/* 정의 */}
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {entry.definition}
            </p>

            {/* 용어사전 링크 */}
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Link
                    to={`/glossary#${entry.id}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => setOpen(false)}
                >
                    용어사전에서 보기 →
                </Link>
            </div>
        </div>,
        document.body,
    ) : null

    return (
        <>
            <span
                ref={triggerRef}
                role="button"
                tabIndex={0}
                aria-expanded={open}
                aria-describedby={open ? `glossary-tip-${id}` : undefined}
                className="border-b border-dotted border-current cursor-help opacity-90 hover:opacity-100 transition-opacity"
                onMouseEnter={openTooltip}
                onMouseLeave={scheduleClose}
                onFocus={openTooltip}
                onBlur={(e) => {
                    // 포커스가 툴팁 내부로 이동하면 닫지 않음 (용어사전 링크 클릭 가능)
                    if (!tooltipRef.current?.contains(e.relatedTarget as Node)) {
                        scheduleClose()
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        if (open) setOpen(false)
                        else openTooltip()
                    }
                }}
            >
                {children}
            </span>
            {tooltipCard}
        </>
    )
}
