import { useState, useCallback } from 'react'

export function useAnimationStep(totalSteps: number) {
    const [step, setStep] = useState(0)
    const [playing, setPlaying] = useState(false)

    const next = useCallback(() => {
        setStep((s) => Math.min(s + 1, totalSteps - 1))
    }, [totalSteps])

    const prev = useCallback(() => {
        setStep((s) => Math.max(s - 1, 0))
    }, [])

    const reset = useCallback(() => {
        setStep(0)
        setPlaying(false)
    }, [])

    const togglePlay = useCallback(() => {
        setPlaying((p) => !p)
    }, [])

    return { step, playing, next, prev, reset, togglePlay, isFirst: step === 0, isLast: step === totalSteps - 1 }
}
