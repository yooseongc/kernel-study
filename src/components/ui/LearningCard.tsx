import { Link } from 'react-router-dom'
import { kernelTopics } from '../../data/kernelTopics'

interface LearningCardProps {
    topicId: string
    items: string[] // "이 토픽에서 배우는 것" 3줄 bullet
}

export function LearningCard({ topicId, items }: LearningCardProps) {
    const topic = kernelTopics.find((t) => t.id === topicId)
    const prereqs = topic?.prerequisites.map((id) => kernelTopics.find((t) => t.id === id)).filter(Boolean) ?? []

    return (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-5 space-y-4">
            <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                    이 토픽에서 배우는 것
                </div>
                <ul className="space-y-1.5">
                    {items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                            <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-300">
                                {i + 1}
                            </span>
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            {prereqs.length > 0 && (
                <div className="border-t border-blue-200 dark:border-blue-800/50 pt-3">
                    <div className="text-xs font-semibold uppercase tracking-widest text-blue-500 dark:text-blue-500 mb-2">
                        선수 지식
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {prereqs.map(
                            (t) =>
                                t && (
                                    <Link
                                        key={t.id}
                                        to={t.route}
                                        className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                                    >
                                        Topic {String(t.number).padStart(2, '0')} · {t.title}
                                    </Link>
                                ),
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
