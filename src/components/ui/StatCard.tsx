type StatColor = 'blue' | 'purple' | 'green' | 'amber' | 'red' | 'gray' | 'cyan' | 'teal' | 'orange' | 'rose'

interface Props {
    title: string
    value: string
    desc?: string
    color?: StatColor
    children?: React.ReactNode
}

const colorMap: Record<StatColor, { border: string; bg: string; title: string; value: string }> = {
    blue: {
        border: 'border-blue-200 dark:border-blue-800',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        title: 'text-blue-600 dark:text-blue-400',
        value: 'text-blue-700 dark:text-blue-300',
    },
    purple: {
        border: 'border-purple-200 dark:border-purple-800',
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        title: 'text-purple-600 dark:text-purple-400',
        value: 'text-purple-700 dark:text-purple-300',
    },
    green: {
        border: 'border-green-200 dark:border-green-800',
        bg: 'bg-green-50 dark:bg-green-950/30',
        title: 'text-green-600 dark:text-green-400',
        value: 'text-green-700 dark:text-green-300',
    },
    amber: {
        border: 'border-amber-200 dark:border-amber-800',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        title: 'text-amber-600 dark:text-amber-400',
        value: 'text-amber-700 dark:text-amber-300',
    },
    red: {
        border: 'border-red-200 dark:border-red-800',
        bg: 'bg-red-50 dark:bg-red-950/30',
        title: 'text-red-600 dark:text-red-400',
        value: 'text-red-700 dark:text-red-300',
    },
    gray: {
        border: 'border-gray-200 dark:border-gray-700',
        bg: 'bg-gray-50 dark:bg-gray-800/50',
        title: 'text-gray-600 dark:text-gray-400',
        value: 'text-gray-700 dark:text-gray-300',
    },
    cyan: {
        border: 'border-cyan-200 dark:border-cyan-800',
        bg: 'bg-cyan-50 dark:bg-cyan-950/30',
        title: 'text-cyan-600 dark:text-cyan-400',
        value: 'text-cyan-700 dark:text-cyan-300',
    },
    teal: {
        border: 'border-teal-200 dark:border-teal-800',
        bg: 'bg-teal-50 dark:bg-teal-950/30',
        title: 'text-teal-600 dark:text-teal-400',
        value: 'text-teal-700 dark:text-teal-300',
    },
    orange: {
        border: 'border-orange-200 dark:border-orange-800',
        bg: 'bg-orange-50 dark:bg-orange-950/30',
        title: 'text-orange-600 dark:text-orange-400',
        value: 'text-orange-700 dark:text-orange-300',
    },
    rose: {
        border: 'border-rose-200 dark:border-rose-800',
        bg: 'bg-rose-50 dark:bg-rose-950/30',
        title: 'text-rose-600 dark:text-rose-400',
        value: 'text-rose-700 dark:text-rose-300',
    },
}

export function StatCard({ title, value, desc, color = 'blue', children }: Props) {
    const c = colorMap[color]
    return (
        <div className={`rounded-xl border ${c.border} ${c.bg} p-4 space-y-1.5`}>
            <div className={`text-xs font-semibold uppercase tracking-wide ${c.title}`}>{title}</div>
            <div className={`text-lg font-bold font-mono ${c.value}`}>{value}</div>
            {desc && <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</div>}
            {children}
        </div>
    )
}
