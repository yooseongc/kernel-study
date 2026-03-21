import { NavLink } from 'react-router-dom'
import { kernelTopics } from '../../data/kernelTopics'
import { useTheme } from '../../contexts/ThemeContext'

interface SidebarProps {
  onSearchOpen: () => void
  mobileOpen: boolean
  onMobileClose: () => void
  collapsed?: boolean
}

export function Sidebar({ onSearchOpen, mobileOpen, onMobileClose, collapsed = false }: SidebarProps) {
    const { theme, toggle } = useTheme()

    return (
        <aside
            className={[
                // 공통 스타일
                'bg-gray-50 dark:bg-gray-900',
                'border-r border-gray-200 dark:border-gray-800',
                'flex flex-col h-full overflow-hidden',
                // 모바일: 고정 드로어 (z-40, transform으로 열고 닫기)
                'fixed inset-y-0 left-0 z-40 transition-transform duration-300',
                mobileOpen ? 'translate-x-0' : '-translate-x-full',
                // 데스크톱: 일반 흐름 배치, transform 초기화 + 너비 전환
                'md:relative md:inset-auto md:z-auto md:translate-x-0 md:transition-[width] md:duration-200',
                collapsed ? 'md:w-0 md:border-r-0' : 'md:w-72 md:shrink-0',
            ].join(' ')}
        >
            {/* Logo + 모바일 닫기 버튼 */}
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                <NavLink to="/" className="block" onClick={onMobileClose}>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase">
            Kernel Study
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">Linux Internals Visualized</div>
                </NavLink>
                {/* 닫기 버튼: 모바일에서만 표시 */}
                <button
                    onClick={onMobileClose}
                    className="md:hidden p-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    aria-label="메뉴 닫기"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Search button */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800">
                <button
                    onClick={onSearchOpen}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="flex-1 text-left text-xs">검색...</span>
                    <kbd className="hidden sm:inline text-xs border border-gray-300 dark:border-gray-600 rounded px-1">⌘K</kbd>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-2">
                {kernelTopics.map((topic) => (
                    <NavLink
                        key={topic.id}
                        to={topic.route}
                        onClick={onMobileClose}
                        className={({ isActive }) =>
                            `flex items-start gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-colors group ${
                                isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                            }`
                        }
                    >
                        <span className="mt-0.5 shrink-0 font-mono text-xs bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                            {String(topic.number).padStart(2, '0')}
                        </span>
                        <span className="font-medium leading-snug">{topic.title}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer: Glossary + Theme toggle */}
            <div className="px-2 py-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
                <NavLink
                    to="/glossary"
                    onClick={onMobileClose}
                    className={({ isActive }) =>
                        `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            isActive
                                ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`
                    }
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
          용어 사전
                </NavLink>

                <button
                    onClick={toggle}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    {theme === 'dark' ? (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
              라이트 모드
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
              다크 모드
                        </>
                    )}
                </button>
            </div>
        </aside>
    )
}
