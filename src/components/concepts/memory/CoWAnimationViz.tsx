import { useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// 3.11  CoW — Copy-on-Write 3단계 애니메이션 컴포넌트
// ─────────────────────────────────────────────────────────────────────────────

export function CoWAnimationViz() {
    const [cowStep, setCowStep] = useState(0)

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                {['fork() 직후', '쓰기 시도 (Page Fault)', '복사 완료 (독립 페이지)'].map((label, i) => (
                    <button
                        key={i}
                        onClick={() => setCowStep(i)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            cowStep === i
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        Step {i} — {label}
                    </button>
                ))}
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4 min-h-[260px]">
                {cowStep === 0 && (
                    <div className="space-y-4">
                        <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                            Step 0 — fork() 직후: 물리 페이지 공유
                        </div>
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
                            {/* Parent */}
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    부모 프로세스
                                </div>
                                <div className="rounded-lg border border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950 px-4 py-2 text-xs font-mono text-purple-700 dark:text-purple-300">
                                    VMA
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">↓</div>
                                <div className="rounded-lg border border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950 px-4 py-2 text-xs font-mono text-purple-700 dark:text-purple-300">
                                    PTE (RO)
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">↘</div>
                            </div>
                            {/* Shared physical page */}
                            <div className="flex flex-col items-center gap-1">
                                <div className="rounded-xl border-2 border-purple-500 dark:border-purple-400 bg-purple-100 dark:bg-purple-900 px-6 py-4 text-sm font-bold text-purple-800 dark:text-purple-200 text-center">
                                    물리 페이지 A<br />
                                    <span className="text-xs font-normal">(공유, 읽기 전용)</span>
                                </div>
                                <div className="text-xs text-center mt-1 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-semibold">
                                    물리 메모리: 1 페이지 (공유)
                                </div>
                            </div>
                            {/* Child */}
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    자식 프로세스
                                </div>
                                <div className="rounded-lg border border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950 px-4 py-2 text-xs font-mono text-purple-700 dark:text-purple-300">
                                    VMA
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">↓</div>
                                <div className="rounded-lg border border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-950 px-4 py-2 text-xs font-mono text-purple-700 dark:text-purple-300">
                                    PTE (RO)
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">↙</div>
                            </div>
                        </div>
                    </div>
                )}

                {cowStep === 1 && (
                    <div className="space-y-4">
                        <div className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">
                            Step 1 — 자식이 해당 주소에 쓰기 시도 → Page Fault
                        </div>
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    부모 프로세스
                                </div>
                                <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                                    VMA
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">↓</div>
                                <div className="rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                                    PTE (RO)
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-2">
                                <div className="rounded-xl border-2 border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-950 px-6 py-4 text-sm font-bold text-red-700 dark:text-red-300 text-center">
                                    물리 페이지 A<br />
                                    <span className="text-xs font-normal">(RO — 쓰기 불가!)</span>
                                </div>
                                <div className="rounded-lg border border-red-400 dark:border-red-600 bg-red-100 dark:bg-red-900 px-4 py-2 text-xs font-bold text-red-700 dark:text-red-300 text-center animate-pulse">
                                    ⚡ 쓰기 → Page Fault (Protection Fault)
                                    <br />
                                    <span className="font-normal">커널: do_wp_page() 호출</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-xs font-semibold text-red-500 dark:text-red-400">
                                    자식 프로세스 ✎ 쓰기
                                </div>
                                <div className="rounded-lg border border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950 px-4 py-2 text-xs font-mono text-red-700 dark:text-red-300">
                                    VMA
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">↓</div>
                                <div className="rounded-lg border border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950 px-4 py-2 text-xs font-mono text-red-700 dark:text-red-300">
                                    PTE (RO) ← FAULT
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {cowStep === 2 && (
                    <div className="space-y-4">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                            Step 2 — 커널이 페이지 복사 완료: 독립 페이지
                        </div>
                        <div className="flex flex-col md:flex-row gap-6 items-center justify-center">
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    부모 프로세스
                                </div>
                                <div className="rounded-lg border border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-4 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                                    VMA
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">↓</div>
                                <div className="rounded-lg border border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-4 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                                    PTE (RW)
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">↓</div>
                                <div className="rounded-lg border-2 border-emerald-500 dark:border-emerald-400 bg-emerald-100 dark:bg-emerald-900 px-4 py-3 text-xs font-bold text-emerald-800 dark:text-emerald-200 text-center">
                                    물리 페이지 A<br />
                                    <span className="font-normal">(RW, 독립)</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                <div className="text-center px-3 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                    물리 메모리: 2 페이지 (독립)
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    자식 프로세스
                                </div>
                                <div className="rounded-lg border border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-4 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                                    VMA
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">↓</div>
                                <div className="rounded-lg border border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-4 py-2 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                                    PTE (RW)
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">↓</div>
                                <div className="rounded-lg border-2 border-emerald-500 dark:border-emerald-400 bg-emerald-100 dark:bg-emerald-900 px-4 py-3 text-xs font-bold text-emerald-800 dark:text-emerald-200 text-center">
                                    물리 페이지 B<br />
                                    <span className="font-normal">(새로 복사, RW)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between">
                <button
                    onClick={() => setCowStep((s) => Math.max(0, s - 1))}
                    disabled={cowStep === 0}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    ← 이전
                </button>
                <button
                    onClick={() => setCowStep((s) => Math.min(2, s + 1))}
                    disabled={cowStep === 2}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    다음 →
                </button>
            </div>
        </div>
    )
}
