import { useEffect, useState } from 'react'
import { glossary } from '../../data/glossary'

const categoryLabel: Record<string, string> = {
    process: '프로세스 / 스케줄러',
    memory: '메모리 관리',
    network: '네트워크',
    interrupt: '인터럽트 / 비동기',
    sync: '동기화',
    driver: '드라이버',
    debug: '디버깅 / 성능',
    general: '일반',
    fs: '파일시스템',
    security: '보안',
    virt: '가상화',
}

const categoryColor: Record<string, string> = {
    process: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    memory: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    network: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    interrupt: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
    sync: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    driver: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    debug: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    general: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
    fs: 'bg-lime-100 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300',
    security: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300',
    virt: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
}

const allCategories = Object.keys(categoryLabel)

export default function Glossary() {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeCategory, setActiveCategory] = useState<string | null>(null)

    useEffect(() => {
        const hash = window.location.hash.split('#')[1]
        if (hash) {
            const el = document.getElementById(hash)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [])

    const sorted = [...glossary].sort((a, b) => a.term.localeCompare(b.term, 'ko'))

    const filtered = sorted.filter(term => {
        const matchesCategory = activeCategory === null || term.category === activeCategory
        if (!matchesCategory) return false
        if (!searchQuery.trim()) return true
        const q = searchQuery.toLowerCase()
        return (
            term.term.toLowerCase().includes(q) ||
            (term.aliases ?? []).some(a => a.toLowerCase().includes(q)) ||
            term.definition.toLowerCase().includes(q)
        )
    })

    return (
        <div className="max-w-4xl mx-auto px-6 py-10">
            <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mb-2">용어 사전</div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">커널 용어 사전</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
                리눅스 커널을 이해하는 데 필요한 핵심 용어 {glossary.length}개
            </p>

            {/* 검색 */}
            <div className="relative mb-4">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="용어명 또는 정의 검색..."
                    className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-blue-400 dark:focus:border-blue-600 transition-colors"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* 카테고리 필터 칩 */}
            <div className="flex flex-wrap gap-2 mb-8">
                <button
                    onClick={() => setActiveCategory(null)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        activeCategory === null
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-600'
                    }`}
                >
                    전체 ({glossary.length})
                </button>
                {allCategories.map(cat => {
                    const count = glossary.filter(t => t.category === cat).length
                    if (count === 0) return null
                    return (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                                activeCategory === cat
                                    ? `${categoryColor[cat]} border-current`
                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-600'
                            }`}
                        >
                            {categoryLabel[cat]} ({count})
                        </button>
                    )
                })}
            </div>

            {/* 결과 수 */}
            {(searchQuery || activeCategory) && (
                <p className="text-xs text-gray-400 dark:text-gray-600 mb-4">
                    {filtered.length}개 용어
                </p>
            )}

            <div className="space-y-3">
                {filtered.map(term => (
                    <div
                        key={term.id}
                        id={term.id}
                        className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 scroll-mt-6"
                    >
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                                <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{term.term}</span>
                                {term.aliases && term.aliases.length > 0 && (
                                    <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">
                                        ({term.aliases.join(', ')})
                                    </span>
                                )}
                            </div>
                            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${categoryColor[term.category]}`}>
                                {categoryLabel[term.category]}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{term.definition}</p>
                        {term.topicRef && (
                            <a
                                href={`#/topic/${term.topicRef}`}
                                className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                → 관련 토픽 보기
                            </a>
                        )}
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-sm text-gray-400">
                        검색 결과가 없습니다
                    </div>
                )}
            </div>
        </div>
    )
}
