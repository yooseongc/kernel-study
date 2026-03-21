import { useState, useEffect } from 'react'
import type { RefObject } from 'react'

interface BackToTopProps {
    scrollRef: RefObject<HTMLElement | null>
}

export function BackToTop({ scrollRef }: BackToTopProps) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        const onScroll = () => setVisible(el.scrollTop > 300)
        el.addEventListener('scroll', onScroll, { passive: true })
        return () => el.removeEventListener('scroll', onScroll)
    }, [scrollRef])

    if (!visible) return null

    return (
        <button
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-blue-600 dark:bg-blue-500 text-white shadow-lg hover:bg-blue-700 dark:hover:bg-blue-400 transition-all duration-200 flex items-center justify-center"
            aria-label="맨 위로"
            title="맨 위로"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
        </button>
    )
}
