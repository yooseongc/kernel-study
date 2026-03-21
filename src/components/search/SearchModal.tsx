import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { kernelTopics } from '../../data/kernelTopics'
import { glossary } from '../../data/glossary'

interface SearchResult {
  type: 'topic' | 'glossary'
  id: string
  title: string
  subtitle: string
  href: string
}

function search(query: string): SearchResult[] {
    if (!query.trim()) return []
    const q = query.toLowerCase()

    const topicResults: SearchResult[] = kernelTopics
        .filter(t =>
            t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q))
        )
        .map(t => ({
            type: 'topic',
            id: t.id,
            title: t.title,
            subtitle: t.description,
            href: t.route,
        }))

    const glossaryResults: SearchResult[] = glossary
        .filter(g =>
            g.term.toLowerCase().includes(q) ||
      g.definition.toLowerCase().includes(q) ||
      (g.aliases ?? []).some(a => a.toLowerCase().includes(q))
        )
        .slice(0, 6)
        .map(g => ({
            type: 'glossary',
            id: g.id,
            title: g.term,
            subtitle: g.definition.slice(0, 80) + '...',
            href: `/glossary#${g.id}`,
        }))

    return [...topicResults, ...glossaryResults]
}

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: Props) {
    // key 프롭으로 재마운트되므로 open 시 항상 초기 상태로 시작 — useEffect 불필요
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
        setActiveIdx(0)  // 쿼리 변경 시 이벤트 핸들러에서 직접 리셋 (effect 불필요)
    }

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
        if (e.key === 'Enter' && results[activeIdx]) go(results[activeIdx].href)
        if (e.key === 'Escape') onClose()
    }

    if (!open) return null

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
                        placeholder="토픽 또는 용어 검색..."
                        className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none text-sm"
                    />
                    <kbd className="text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">ESC</kbd>
                </div>

                {/* Results */}
                {results.length > 0 && (
                    <ul className="max-h-80 overflow-y-auto py-2">
                        {results.map((r, i) => (
                            <li key={r.id}>
                                <button
                                    onClick={() => go(r.href)}
                                    onMouseEnter={() => setActiveIdx(i)}
                                    className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                                        i === activeIdx ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <span className={`mt-0.5 shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                                        r.type === 'topic'
                                            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                                            : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                                    }`}>
                                        {r.type === 'topic' ? '토픽' : '용어'}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">{r.subtitle}</div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
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
