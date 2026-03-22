interface KernelRefProps {
    path: string // e.g. "include/linux/sched.h"
    sym?: string // e.g. "task_struct"
    label?: string // optional display label override
}

export function KernelRef({ path, sym, label }: KernelRefProps) {
    const href = sym
        ? `https://elixir.bootlin.com/linux/latest/source/${path}#L${sym}`
        : `https://elixir.bootlin.com/linux/latest/source/${path}`
    const display = label ?? (sym ? sym : (path.split('/').pop() ?? path))

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={`커널 소스: ${path}${sym ? ` (${sym})` : ''}`}
            className="inline-flex items-center gap-1 font-mono text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors no-underline"
        >
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
            </svg>
            {display}
        </a>
    )
}
