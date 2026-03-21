type InfoBoxColor = 'blue' | 'purple' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' | 'teal' | 'lime' | 'rose' | 'orange' | 'violet' | 'indigo' | 'emerald' | 'sky'

interface Props {
    color: InfoBoxColor
    title?: string
    children: React.ReactNode
    className?: string
}

const colorMap: Record<InfoBoxColor, { border: string; bg: string; title: string; text: string }> = {
    blue:    { border: 'border-blue-200 dark:border-blue-800',     bg: 'bg-blue-50 dark:bg-blue-950/20',     title: 'text-blue-800 dark:text-blue-300',   text: 'text-blue-700 dark:text-blue-400' },
    purple:  { border: 'border-purple-200 dark:border-purple-800', bg: 'bg-purple-50 dark:bg-purple-950/20', title: 'text-purple-800 dark:text-purple-300', text: 'text-purple-700 dark:text-purple-400' },
    green:   { border: 'border-green-200 dark:border-green-800',   bg: 'bg-green-50 dark:bg-green-950/20',   title: 'text-green-800 dark:text-green-300',  text: 'text-green-700 dark:text-green-400' },
    amber:   { border: 'border-amber-200 dark:border-amber-800',   bg: 'bg-amber-50 dark:bg-amber-950/20',   title: 'text-amber-800 dark:text-amber-300',  text: 'text-amber-700 dark:text-amber-400' },
    red:     { border: 'border-red-200 dark:border-red-800',       bg: 'bg-red-50 dark:bg-red-950/20',       title: 'text-red-800 dark:text-red-300',     text: 'text-red-700 dark:text-red-400' },
    gray:    { border: 'border-gray-200 dark:border-gray-700',     bg: 'bg-gray-50 dark:bg-gray-800/50',     title: 'text-gray-800 dark:text-gray-300',   text: 'text-gray-600 dark:text-gray-400' },
    cyan:    { border: 'border-cyan-200 dark:border-cyan-800',     bg: 'bg-cyan-50 dark:bg-cyan-950/20',     title: 'text-cyan-800 dark:text-cyan-300',   text: 'text-cyan-700 dark:text-cyan-400' },
    teal:    { border: 'border-teal-200 dark:border-teal-800',     bg: 'bg-teal-50 dark:bg-teal-950/20',     title: 'text-teal-800 dark:text-teal-300',   text: 'text-teal-700 dark:text-teal-400' },
    lime:    { border: 'border-lime-200 dark:border-lime-800',     bg: 'bg-lime-50 dark:bg-lime-950/20',     title: 'text-lime-800 dark:text-lime-300',   text: 'text-lime-700 dark:text-lime-400' },
    rose:    { border: 'border-rose-200 dark:border-rose-800',     bg: 'bg-rose-50 dark:bg-rose-950/20',     title: 'text-rose-800 dark:text-rose-300',   text: 'text-rose-700 dark:text-rose-400' },
    orange:  { border: 'border-orange-200 dark:border-orange-800', bg: 'bg-orange-50 dark:bg-orange-950/20', title: 'text-orange-800 dark:text-orange-300', text: 'text-orange-700 dark:text-orange-400' },
    violet:  { border: 'border-violet-200 dark:border-violet-800', bg: 'bg-violet-50 dark:bg-violet-950/20', title: 'text-violet-800 dark:text-violet-300', text: 'text-violet-700 dark:text-violet-400' },
    indigo:  { border: 'border-indigo-200 dark:border-indigo-800', bg: 'bg-indigo-50 dark:bg-indigo-950/20', title: 'text-indigo-800 dark:text-indigo-300', text: 'text-indigo-700 dark:text-indigo-400' },
    emerald: { border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950/20', title: 'text-emerald-800 dark:text-emerald-300', text: 'text-emerald-700 dark:text-emerald-400' },
    sky:     { border: 'border-sky-200 dark:border-sky-800',       bg: 'bg-sky-50 dark:bg-sky-950/20',       title: 'text-sky-800 dark:text-sky-300',     text: 'text-sky-700 dark:text-sky-400' },
}

export function InfoBox({ color, title, children, className = '' }: Props) {
    const c = colorMap[color]
    return (
        <div className={`rounded-xl border ${c.border} ${c.bg} p-4 ${className}`}>
            {title && (
                <div className={`text-sm font-semibold ${c.title} mb-2`}>{title}</div>
            )}
            <div className={`text-xs ${c.text} leading-relaxed`}>{children}</div>
        </div>
    )
}
