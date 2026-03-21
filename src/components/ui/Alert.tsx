interface Props {
    variant: 'tip' | 'warning' | 'info' | 'danger'
    title?: string
    children: React.ReactNode
}

const variantMap = {
    tip:     { border: 'border-amber-200 dark:border-amber-800/50',  bg: 'bg-amber-50 dark:bg-amber-950/20',  text: 'text-amber-800 dark:text-amber-200',  icon: '💡' },
    warning: { border: 'border-orange-200 dark:border-orange-800/50', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-800 dark:text-orange-200', icon: '⚠️' },
    info:    { border: 'border-blue-200 dark:border-blue-800/50',    bg: 'bg-blue-50 dark:bg-blue-950/20',    text: 'text-blue-800 dark:text-blue-200',    icon: 'ℹ️' },
    danger:  { border: 'border-red-200 dark:border-red-800/50',      bg: 'bg-red-50 dark:bg-red-950/20',      text: 'text-red-800 dark:text-red-200',      icon: '🚨' },
}

export function Alert({ variant, title, children }: Props) {
    const v = variantMap[variant]
    return (
        <div className={`flex gap-3 rounded-xl border ${v.border} ${v.bg} px-4 py-3 text-sm ${v.text}`}>
            <span className="shrink-0 text-base leading-snug" aria-hidden>{v.icon}</span>
            <div className="leading-relaxed">
                {title && <span className="font-semibold mr-1">{title}</span>}
                {children}
            </div>
        </div>
    )
}
