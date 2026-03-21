import { useEffect, useRef, useState, RefObject } from 'react'

interface TocItem {
    id: string
    text: string
    level: number
}

interface TableOfContentsProps {
    scrollRef: RefObject<HTMLElement | null>
    collapsed?: boolean
}

export function TableOfContents({ scrollRef, collapsed = false }: TableOfContentsProps) {
    const [items, setItems] = useState<TocItem[]>([])
    const [activeId, setActiveId] = useState<string>('')
    const observerRef = useRef<IntersectionObserver | null>(null)

    // 현재 페이지의 h2/h3 수집
    useEffect(() => {
        const collect = () => {
            const headings = Array.from(
                document.querySelectorAll<HTMLHeadingElement>('main h2, main h3')
            )
            headings.forEach((el, i) => {
                if (!el.id) {
                    el.id = `toc-${i}-${el.textContent?.slice(0, 20).replace(/\s+/g, '-').toLowerCase() ?? i}`
                }
            })
            setItems(headings.map(el => ({
                id: el.id,
                text: el.textContent?.trim() ?? '',
                level: el.tagName === 'H2' ? 2 : 3,
            })))
        }

        const mo = new MutationObserver(collect)
        const main = document.querySelector('main')
        if (main) mo.observe(main, { childList: true, subtree: true })
        collect()
        return () => mo.disconnect()
    }, [])

    // 활성 섹션 추적
    useEffect(() => {
        if (items.length === 0) return
        observerRef.current?.disconnect()
        const root = scrollRef.current ?? null

        observerRef.current = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter(e => e.isIntersecting)
                if (visible.length > 0) {
                    const top = visible.sort(
                        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
                    )[0]
                    setActiveId(top.target.id)
                }
            },
            { root, rootMargin: '-10% 0px -70% 0px', threshold: 0 }
        )

        items.forEach(({ id }) => {
            const el = document.getElementById(id)
            if (el) observerRef.current!.observe(el)
        })

        return () => observerRef.current?.disconnect()
    }, [items, scrollRef])

    const scrollTo = (id: string) => {
        const el = document.getElementById(id)
        if (!el) return
        const container = scrollRef.current
        if (container) {
            const offset = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 80
            container.scrollTo({ top: offset, behavior: 'smooth' })
        }
    }

    if (collapsed || items.length === 0) {
        return <div className="hidden xl:block w-0 shrink-0" />
    }

    return (
        <aside className="hidden xl:flex w-52 shrink-0 flex-col overflow-y-auto border-l border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <div className="sticky top-0 px-3 pt-5 pb-3">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 px-1">
                    On this page
                </div>
                <ul className="space-y-0.5">
                    {items.map(item => (
                        <li key={item.id}>
                            <button
                                onClick={() => scrollTo(item.id)}
                                className={[
                                    'w-full text-left text-xs leading-snug px-2 py-1 rounded transition-colors',
                                    item.level === 3 ? 'pl-4' : '',
                                    activeId === item.id
                                        ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 font-medium'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                                ].join(' ')}
                            >
                                {item.text}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    )
}
