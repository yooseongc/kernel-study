import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { kernelTopics } from '../../data/kernelTopics'
import { glossary } from '../../data/glossary'
import { sectionIndex } from '../../data/searchIndex'

interface SearchResult {
  type: 'topic' | 'glossary' | 'section'
  id: string
  title: string
  subtitle: string
  href: string
}

function score(text: string, q: string): number {
    if (!text) return 0
    const t = text.toLowerCase()
    if (t === q) return 4
    if (t.startsWith(q)) return 3
    if (t.includes(q)) return 2
    return 0
}

function search(query: string): SearchResult[] {
    if (!query.trim()) return []
    const q = query.toLowerCase()

    const topicResults: SearchResult[] = kernelTopics
        .map(t => ({
            s: Math.max(
                score(t.title, q) * 4,
                score(t.subtitle, q) * 3,
                ...t.tags.map(tag => score(tag, q) * 2),
                score(t.description, q)
            ),
            t,
        }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5)
        .map(({ t }) => ({
            type: 'topic' as const,
            id: t.id,
            title: t.title,
            subtitle: t.subtitle,
            href: t.route,
        }))

    const glossaryResults: SearchResult[] = glossary
        .map(g => ({
            s: Math.max(
                score(g.term, q) * 4,
                ...(g.aliases ?? []).map(a => score(a, q) * 3),
                score(g.definition, q)
            ),
            g,
        }))
        .filter(x => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 4)
        .map(({ g }) => ({
            type: 'glossary' as const,
            id: g.id,
            title: g.term,
            subtitle: g.definition.slice(0, 80) + '...',
            href: `/glossary#${g.id}`,
        }))

    const sectionResults: SearchResult[] = sectionIndex
        .filter(s => s.title.toLowerCase().includes(q))
        .slice(0, 4)
        .map(s => {
            const topic = kernelTopics.find(t => t.id === s.topicId)
            return {
                type: 'section' as const,
                id: s.sectionId,
                title: s.title,
                subtitle: topic?.title ?? s.topicId,
                href: s.route,
            }
        })

    return [...topicResults, ...glossaryResults, ...sectionResults]
}

const typeLabel: Record<string, string> = {
    topic: '토픽',
    glossary: '용어',
    section: '섹션',
}

const typeColor: Record<string, string> = {
    topic: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    glossary: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    section: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
}

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: Props) {
    const [query, setQuery] = useState('')
    const [activeIdx, setActiveIdx] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const navigate = useNavigate()
    const results = search(query)

    const go = (href: string) => {
        navigate(href)
        onClose()
    }

    const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value)
        setActiveIdx(0)
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
        if (e.key === 'Enter' && results[activeIdx]) go(results[activeIdx].href)
        if (e.key === 'Escape') onClose()
    }

    if (!open) return null

    // 결과를 타입별로 그룹화
    const groups: { type: string; items: SearchResult[] }[] = []
    for (const type of ['topic', 'glossary', 'section']) {
        const items = results.filter(r => r.type === type)
        if (items.length > 0) groups.push({ type, items })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
            <div
                className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        ref={inputRef}
                        autoFocus
                        value={query}
                        onChange={handleQueryChange}
                        onKeyDown={handleKey}
                        placeholder="토픽, 용어, 섹션 검색..."
                        className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none text-sm"
                    />
                    <kbd className="text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">ESC</kbd>
                </div>

                {/* Grouped results */}
                {groups.length > 0 && (
                    <div className="max-h-80 overflow-y-auto py-2">
                        {groups.map(({ type, items }) => {
                            const flatIdx = results.indexOf(items[0])
                            return (
                                <div key={type}>
                                    <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                                        {typeLabel[type]}
                                    </div>
                                    <ul>
                                        {items.map((r, localI) => {
                                            const i = flatIdx + localI
                                            return (
                                                <li key={r.id}>
                                                    <button
                                                        onClick={() => go(r.href)}
                                                        onMouseEnter={() => setActiveIdx(i)}
                                                        className={`w-full text-left px-4 py-2 flex items-start gap-3 transition-colors ${
                                                            i === activeIdx ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                                        }`}
                                                    >
                                                        <span className={`mt-0.5 shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${typeColor[type]}`}>
                                                            {typeLabel[type]}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.title}</div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">{r.subtitle}</div>
                                                        </div>
                                                    </button>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )
                        })}
                    </div>
                )}

                {query && results.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                        "{query}"에 대한 결과가 없습니다
                    </div>
                )}

                {!query && (
                    <div className="px-4 py-4 text-xs text-gray-400 dark:text-gray-600 flex gap-4">
                        <span>↑↓ 탐색</span>
                        <span>↵ 이동</span>
                        <span>ESC 닫기</span>
                    </div>
                )}
            </div>
        </div>
    )
}
