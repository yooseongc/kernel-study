import { Link } from 'react-router-dom'
import { kernelTopics } from '../../data/kernelTopics'

export default function Home() {
    return (
        <div className="max-w-5xl mx-auto px-6 py-10">
            {/* Hero */}
            <div className="mb-12">
                <div className="inline-block text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-full px-3 py-1 mb-4">
          리눅스 커널 내부 시각화 학습
                </div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
          커널 스터디
                    <span className="text-blue-600 dark:text-blue-400 ml-3 text-2xl font-normal">Kernel Study</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-lg max-w-2xl leading-relaxed">
          리눅스 커널의 핵심 동작을 인터랙티브 시각화로 배워봅니다.
          마치 커널 개발자가 옆에서 직접 설명해주는 것처럼 — 개념, 구조, 흐름을 한눈에.
                </p>
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-600">
          검색하려면 <kbd className="border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> 를 누르세요
                </p>
            </div>

            {/* 안내 메시지 */}
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 mb-10 flex gap-4">
                <div className="text-3xl">🐧</div>
                <div>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">어떻게 사용하나요?</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            왼쪽 사이드바에서 원하는 토픽을 선택하세요. 각 페이지는{' '}
                        <span className="text-blue-600 dark:text-blue-400">인터랙티브 다이어그램</span>,{' '}
                        <span className="text-orange-500 dark:text-orange-400">단계별 애니메이션</span>,{' '}
                        <span className="text-green-600 dark:text-green-400">실제 커널 소스 코드</span>와 함께
            개념을 설명합니다.
            D3 기반 그래프와 Three.js 3D 시각화가 혼합되어 있습니다.
                    </p>
                </div>
            </div>

            {/* 토픽 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {kernelTopics.map((topic) => (
                    <Link
                        key={topic.id}
                        to={topic.route}
                        className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all duration-200 p-5 flex gap-4"
                    >
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/40 flex items-center justify-center font-mono text-sm font-bold text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {String(topic.number).padStart(2, '0')}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white text-sm leading-snug mb-1">
                                {topic.title}
                            </h2>
                            <p className="text-xs text-gray-500 leading-relaxed">{topic.description}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {topic.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5 font-mono">
                    #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <p className="text-center text-xs text-gray-400 dark:text-gray-700 mt-10">
        kernel-study · React + TypeScript + D3 + Three.js + Mermaid
            </p>
        </div>
    )
}
