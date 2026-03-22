import { useEffect } from 'react'
import { useAnimationStep } from '../../hooks/useAnimationStep'

interface Step {
    label: string
    description: string
}

interface AnimatedDiagramProps {
    steps: Step[]
    renderStep: (step: number) => React.ReactNode
    autoPlayInterval?: number
}

export function AnimatedDiagram({ steps, renderStep, autoPlayInterval = 2000 }: AnimatedDiagramProps) {
    const { step, playing, next, prev, reset, togglePlay, isFirst, isLast } = useAnimationStep(steps.length)

    useEffect(() => {
        if (!playing) return
        if (isLast) {
            reset()
            return
        }
        const timer = setInterval(next, autoPlayInterval)
        return () => clearInterval(timer)
    }, [playing, isLast, next, reset, autoPlayInterval])

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 min-h-48">{renderStep(step)}</div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm text-gray-400">
                    <span className="font-mono">
                        Step {step + 1} / {steps.length}
                    </span>
                    <span className="font-semibold text-blue-400">{steps[step].label}</span>
                </div>
                <p className="text-sm text-gray-300">{steps[step].description}</p>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={reset}
                    disabled={isFirst && !playing}
                    className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 text-sm hover:bg-gray-600 disabled:opacity-40 transition"
                >
                    ↩ Reset
                </button>
                <button
                    onClick={prev}
                    disabled={isFirst}
                    className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 text-sm hover:bg-gray-600 disabled:opacity-40 transition"
                >
                    ← Prev
                </button>
                <button
                    onClick={togglePlay}
                    className="px-4 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-500 transition min-w-16"
                >
                    {playing ? '⏸ Pause' : '▶ Play'}
                </button>
                <button
                    onClick={next}
                    disabled={isLast}
                    className="px-3 py-1.5 rounded bg-gray-700 text-gray-200 text-sm hover:bg-gray-600 disabled:opacity-40 transition"
                >
                    Next →
                </button>
            </div>
        </div>
    )
}
