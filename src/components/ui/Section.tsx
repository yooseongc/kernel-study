import type { ReactNode } from 'react'

interface SectionProps {
    id: string
    title: string
    children: ReactNode
}

export function Section({ id, title, children }: SectionProps) {
    return (
        <section id={id} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                {title}
            </h2>
            {children}
        </section>
    )
}
