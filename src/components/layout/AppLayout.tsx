import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { SearchModal } from '../search/SearchModal'
import { BackToTop } from './BackToTop'
import { TableOfContents } from './TableOfContents'

function getPanelState(key: string, def: boolean): boolean {
    try {
        const v = localStorage.getItem(key)
        return v === null ? def : v === 'true'
    } catch {
        return def
    }
}

export function AppLayout() {
    const [searchOpen, setSearchOpen] = useState(false)
    const [searchKey, setSearchKey] = useState(0)
    const [leftOpen, setLeftOpen] = useState(() => getPanelState('panel-left', true))
    const [rightOpen, setRightOpen] = useState(() => getPanelState('panel-right', true))
    const location = useLocation()
    const mainRef = useRef<HTMLElement>(null)
    const searchOpenRef = useRef(false)

    // sidebarOpen을 상태가 아닌 "현재 라우트 키와 일치하는지"로 유도 → effect 안 setState 불필요
    const [sidebarOpenKey, setSidebarOpenKey] = useState<string | null>(null)
    const sidebarOpen = sidebarOpenKey === location.key

    const toggleLeft = () => setLeftOpen(v => {
        const next = !v
        localStorage.setItem('panel-left', String(next))
        return next
    })
    const toggleRight = () => setRightOpen(v => {
        const next = !v
        localStorage.setItem('panel-right', String(next))
        return next
    })

    // ref를 렌더 중에 직접 갱신하지 않고 effect에서 동기화 (react-hooks/refs 규칙)
    useEffect(() => {
        searchOpenRef.current = searchOpen
    }, [searchOpen])

    // 라우트 변경 시 스크롤 최상단 복귀 (DOM 조작 → useLayoutEffect)
    // sidebarOpen은 location.key 유도값이므로 별도 setState 불필요
    useLayoutEffect(() => {
        mainRef.current?.scrollTo({ top: 0 })
    }, [location])

    // Cmd+K / Ctrl+K 검색 토글 (이벤트 핸들러 안에서 setState — effect 안 직접 호출 아님)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                if (searchOpenRef.current) {
                    setSearchOpen(false)
                } else {
                    setSearchKey(k => k + 1)
                    setSearchOpen(true)
                }
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const openSearch = () => {
        setSearchKey(k => k + 1)
        setSearchOpen(true)
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 overflow-hidden">
            {/* 모바일 오버레이 배경 */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setSidebarOpenKey(null)}
                    aria-hidden="true"
                />
            )}

            {/* 좌측: 네비게이션 사이드바 */}
            <Sidebar
                onSearchOpen={openSearch}
                mobileOpen={sidebarOpen}
                onMobileClose={() => setSidebarOpenKey(null)}
                collapsed={!leftOpen}
            />

            {/* 좌측 패널 토글 버튼 */}
            <button
                onClick={toggleLeft}
                className="hidden md:flex items-center justify-center w-4 shrink-0 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 border-r border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors z-10"
                aria-label={leftOpen ? '사이드바 숨기기' : '사이드바 열기'}
                title={leftOpen ? '사이드바 숨기기' : '사이드바 열기'}
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d={leftOpen ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'} />
                </svg>
            </button>

            {/* 중앙: 콘텐츠 스크롤 영역 */}
            <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto">
                {/* 모바일 상단 바 */}
                <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky top-0 z-20">
                    <button
                        onClick={() => setSidebarOpenKey(location.key)}
                        className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                        aria-label="메뉴 열기"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase">
                        Kernel Study
                    </span>
                    <button
                        onClick={openSearch}
                        className="ml-auto p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                        aria-label="검색"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </div>

                <Outlet />
            </main>

            {/* 우측 패널 토글 버튼 */}
            <button
                onClick={toggleRight}
                className="hidden xl:flex items-center justify-center w-4 shrink-0 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 border-l border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors z-10"
                aria-label={rightOpen ? '목차 숨기기' : '목차 열기'}
                title={rightOpen ? '목차 숨기기' : '목차 열기'}
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d={rightOpen ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
                </svg>
            </button>

            {/* 우측: 페이지 내 목차 (xl 이상에서만 표시) */}
            <TableOfContents scrollRef={mainRef} collapsed={!rightOpen} />

            <BackToTop scrollRef={mainRef} />
            <SearchModal key={searchKey} open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
    )
}
