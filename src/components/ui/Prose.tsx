import type { ReactNode } from 'react'

export function Prose({ children }: { children: ReactNode }) {
    return <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{children}</p>
}
