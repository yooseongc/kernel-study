import { useState } from 'react'
import { MermaidDiagram } from '../../components/viz/MermaidDiagram'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { D3Container } from '../../components/viz/D3Container'
import { AnimatedDiagram } from '../../components/viz/AnimatedDiagram'
import { T } from '../../components/ui/GlossaryTooltip'
import { Section } from '../../components/ui/Section'
import { Prose } from '../../components/ui/Prose'
import { LearningCard } from '../../components/ui/LearningCard'
import { TopicNavigation } from '../../components/ui/TopicNavigation'
import { renderRingDiagram, ringData } from '../../components/concepts/overview/RingDiagram'
import type { RingInfo } from '../../components/concepts/overview/RingDiagram'
import { renderSwitchCostChart } from '../../components/concepts/overview/SwitchCostChart'
import { renderSubsystemGraph } from '../../components/concepts/overview/SubsystemGraph'
import { SyscallFlowViz } from '../../components/concepts/overview/SyscallFlowViz'
import {
    syscallFlowChart,
    kernelStructureChart,
    taskStructCode,
    syscallAnimSteps,
    syscallEntryCode,
    syscallCatalogCode,
    syscallTableRows,
    forkCompareRows,
} from './chartData'

export default function Topic01Overview() {
    const [selectedRing, setSelectedRing] = useState<RingInfo>(ringData[1]) // default: Ring 0

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">Topic 01</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">리눅스 커널 개요와 전체 구조</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Linux Kernel Overview &amp; Architecture
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    커널은 하드웨어와 소프트웨어 사이에서 중재자 역할을 합니다. 이 페이지에서는 커널이 무엇을 하는지,
                    어떤 구조로 이루어져 있는지를 시각적으로 살펴봅니다.
                </p>
            </header>

            <LearningCard
                topicId="01-overview"
                items={[
                    '커널이 하는 일과 유저/커널 공간의 경계를 이해합니다',
                    '시스템 콜이 어떻게 유저 프로그램과 커널을 연결하는지 배웁니다',
                    '모놀리식 커널과 커널 모듈 구조, 소스 트리의 큰 그림을 파악합니다',
                ]}
            />

            {/* 섹션 1: 커널이란 */}
            <Section id="s11" title="1.1  커널이 하는 일">
                <Prose>
                    커널(Kernel)은 운영체제의 핵심 부분으로, 하드웨어 자원(CPU, 메모리, I/O)을 관리하고 여러 프로세스가
                    이 자원을 공유할 수 있도록 추상화합니다. 유저 프로그램은 커널 없이는 하드웨어에 직접 접근할 수
                    없습니다.
                </Prose>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { icon: '⚙️', title: '프로세스 관리', desc: '생성, 스케줄링, 종료' },
                        { icon: '🧠', title: '메모리 관리', desc: '가상 주소, 페이지, 할당' },
                        { icon: '📁', title: '파일 시스템', desc: 'VFS, ext4, 디바이스' },
                        { icon: '🌐', title: '네트워크', desc: 'TCP/IP, 소켓, NIC' },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4"
                        >
                            <div className="text-2xl mb-2">{item.icon}</div>
                            <div className="font-semibold text-gray-900 dark:text-gray-200 text-sm">{item.title}</div>
                            <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 섹션 2: 유저/커널 공간 */}
            <Section id="s12" title="1.2  유저 공간과 커널 공간">
                <div className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-xl text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="text-lg">💡</span>
                    <span>
                        x86 CPU는 <strong>권한 레벨(Ring 0~3)</strong>을 제공합니다. 유저 프로그램은 Ring 3(최소 권한),
                        커널은 Ring 0(최대 권한)에서 실행됩니다. 이 경계를 넘는 것이 바로{' '}
                        <strong>
                            <T id="syscall">시스템 콜</T>
                        </strong>
                        입니다.
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <MermaidDiagram chart={syscallFlowChart} />
                </div>
            </Section>

            {/* 섹션 3: CPU 권한 레벨 */}
            <Section id="s13" title="1.3  CPU 권한 레벨 — Ring 0 ~ 3">
                <Prose>
                    x86 CPU는 하드웨어 수준에서 4단계{' '}
                    <strong className="text-gray-900 dark:text-gray-100">보호 링(Protection Ring)</strong>을 제공합니다.
                    숫자가 낮을수록 더 많은 권한을 가지며, 커널(Ring 0)과 유저 프로그램(Ring 3) 사이의 하드웨어 경계가
                    메모리/권한 보호의 핵심입니다. 링을 클릭하면 자세한 정보가 표시됩니다.
                </Prose>

                {/* 동심원 다이어그램 + 상세 패널 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <D3Container
                            renderFn={(svg, w, h) => renderRingDiagram(svg, w, h, setSelectedRing)}
                            deps={[]}
                            height={360}
                        />
                    </div>

                    {/* 선택된 링 상세 */}
                    <div
                        className="rounded-xl border p-5 space-y-3 transition-colors"
                        style={{ borderColor: selectedRing.color + '66', background: selectedRing.color + '0d' }}
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold font-mono"
                                style={{
                                    background: selectedRing.color + '33',
                                    color: selectedRing.textColor,
                                    border: `2px solid ${selectedRing.color}`,
                                }}
                            >
                                {selectedRing.ring.replace('Ring ', 'R')}
                            </span>
                            <div>
                                <div className="font-bold text-gray-900 dark:text-gray-100">{selectedRing.ring}</div>
                                <div className="text-xs" style={{ color: selectedRing.color }}>
                                    {selectedRing.sublabel}
                                </div>
                            </div>
                            {!selectedRing.used && (
                                <span className="ml-auto text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 rounded-full px-2 py-0.5">
                                    리눅스 미사용
                                </span>
                            )}
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                실행 주체
                            </div>
                            <div className="text-sm text-gray-700 dark:text-gray-300">{selectedRing.who}</div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                권한 / 특징
                            </div>
                            <ul className="space-y-1">
                                {selectedRing.permissions.map((p) => (
                                    <li
                                        key={p}
                                        className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                                    >
                                        <span style={{ color: selectedRing.color }} className="mt-0.5 shrink-0">
                                            ▸
                                        </span>
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 링 전환 트리거 표 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            Ring 전환이 일어나는 시점
                        </span>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                        <div className="p-4">
                            <div className="text-xs font-bold text-red-600 dark:text-red-400 mb-2">
                                Ring 3 → Ring 0 (진입)
                            </div>
                            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                                {[
                                    ['시스템 콜', 'SYSCALL / INT 0x80 명령'],
                                    ['하드웨어 인터럽트', 'NIC, 키보드, 타이머 IRQ'],
                                    ['CPU 예외', 'Page Fault, Division by Zero'],
                                ].map(([trigger, detail]) => (
                                    <li key={trigger}>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{trigger}</span>
                                        <span className="text-xs block text-gray-500">{detail}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="p-4">
                            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">
                                Ring 0 → Ring 3 (복귀)
                            </div>
                            <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                                {[
                                    ['syscall 처리 완료', 'SYSRET / IRET 명령'],
                                    ['인터럽트 핸들러 종료', 'IRET으로 복귀'],
                                    ['예외 처리 완료', '정상 처리 후 복귀 또는 시그널 전송'],
                                ].map(([trigger, detail]) => (
                                    <li key={trigger}>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{trigger}</span>
                                        <span className="text-xs block text-gray-500">{detail}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* 전환 비용 차트 */}
                <div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        연산별 지연 시간 비교{' '}
                        <span className="text-xs font-normal text-gray-400">
                            (Ring 전환이 일반 함수 호출보다 왜 느린가)
                        </span>
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <D3Container renderFn={renderSwitchCostChart} height={260} />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        * 수치는 현대 x86 CPU 기준 근사값입니다. Meltdown/Spectre 패치 이후 syscall 비용은 더
                        증가했습니다.
                    </p>
                </div>
            </Section>

            {/* 섹션 4: 커널 서브시스템 그래프 */}
            <Section id="s14" title="1.4  커널 서브시스템 구조 (인터랙티브)">
                <p className="text-sm text-gray-500">노드를 드래그하거나 스크롤로 확대/축소할 수 있습니다.</p>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <D3Container renderFn={renderSubsystemGraph} height={420} zoomable />
                </div>
            </Section>

            {/* 섹션 5: 전체 구조 Mermaid */}
            <Section id="s15" title="1.5  전체 계층 구조">
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 overflow-x-auto">
                    <MermaidDiagram chart={kernelStructureChart} />
                </div>
            </Section>

            {/* 섹션 6: task_struct */}
            <Section id="s16" title="1.6  task_struct — 프로세스의 본체">
                <Prose>
                    커널에서 모든 프로세스/스레드는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        task_struct
                    </code>
                    라는 거대한 구조체로 표현됩니다. 여기에는 PID, 메모리 정보, 열린 파일, 스케줄링 정보 등이 모두
                    포함됩니다.
                </Prose>
                <CodeBlock code={taskStructCode} language="c" filename="include/linux/sched.h" />
            </Section>

            {/* 섹션 7: 시스템 콜 전체 흐름 애니메이션 */}
            <Section id="s17" title="1.7  시스템 콜의 전체 흐름 — 유저에서 커널로">
                <Prose>
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        write(fd, buf, n)
                    </code>{' '}
                    한 번의 호출이 커널 안에서 어떤 경로를 거치는지 단계별로 살펴봅니다. 각 단계마다 어느 영역이
                    활성화되는지 강조됩니다.
                </Prose>

                <AnimatedDiagram
                    steps={syscallAnimSteps}
                    renderStep={(step) => <SyscallFlowViz step={step} />}
                    autoPlayInterval={2200}
                />

                <CodeBlock code={syscallEntryCode} language="c" filename="arch/x86/entry/entry_64.S + kernel/sys.c" />

                {/* 성능 수치 인포 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        {
                            title: 'syscall 비용',
                            value: '~100 ns',
                            desc: 'Ring 전환 + 레지스터 저장/복원. 일반 함수 호출(~1 ns)보다 약 100배 비쌉니다. Meltdown/Spectre 패치 이후 더 증가했습니다.',
                            color: 'amber',
                        },
                        {
                            title: 'vDSO 최적화',
                            value: '~5 ns',
                            desc: 'gettimeofday, clock_gettime 등은 커널 진입 없이 매핑된 메모리에서 직접 실행됩니다. Ring 전환 비용이 없습니다.',
                            color: 'green',
                        },
                        {
                            title: 'io_uring',
                            value: '배치 syscall',
                            desc: '반복적인 Ring 전환 오버헤드를 공유 링 버퍼(submission/completion queue)로 최소화합니다.',
                            color: 'purple',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className={`rounded-xl border p-4 space-y-1.5
                ${card.color === 'amber' ? 'bg-amber-950/20 border-amber-800/50' : ''}
                ${card.color === 'green' ? 'bg-green-950/20 border-green-800/50' : ''}
                ${card.color === 'purple' ? 'bg-purple-950/20 border-purple-800/50' : ''}
              `}
                        >
                            <div
                                className={`text-xs font-semibold uppercase tracking-wide
                  ${card.color === 'amber' ? 'text-amber-400' : ''}
                  ${card.color === 'green' ? 'text-green-400' : ''}
                  ${card.color === 'purple' ? 'text-purple-400' : ''}
                `}
                            >
                                {card.title}
                            </div>
                            <div
                                className={`text-lg font-bold font-mono
                  ${card.color === 'amber' ? 'text-amber-300' : ''}
                  ${card.color === 'green' ? 'text-green-300' : ''}
                  ${card.color === 'purple' ? 'text-purple-300' : ''}
                `}
                            >
                                {card.value}
                            </div>
                            <div className="text-xs text-gray-400 leading-relaxed">{card.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 섹션 8: 주요 시스템 콜 카탈로그 */}
            <Section id="s18" title="1.8  주요 시스템 콜 카탈로그">
                <Prose>
                    유저 공간 프로그램이 커널 기능을 사용하는 유일한 공식 경로가 <T id="syscall">시스템 콜</T>입니다.
                    x86-64 리눅스에는 300개 이상의 syscall이 있지만, 대부분의 프로그램은 10여 개로 대부분의 작업을
                    처리합니다.
                </Prose>

                {/* 주요 syscall 비교 표 */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mt-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                                <th className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-200 font-mono">
                                    시스템 콜
                                </th>
                                <th className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-200 text-right whitespace-nowrap">
                                    번호(x86-64)
                                </th>
                                <th className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-200">역할</th>
                                <th className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-200">
                                    관련 개념
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {syscallTableRows.map((row, i) => (
                                <tr
                                    key={row.name}
                                    className={`border-t border-gray-100 dark:border-gray-800 ${
                                        i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                                    }`}
                                >
                                    <td className="px-4 py-2.5 font-mono text-blue-600 dark:text-blue-300 font-medium whitespace-nowrap">
                                        {row.name}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-gray-500 dark:text-gray-400 text-right">
                                        {row.nr}
                                    </td>
                                    <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{row.role}</td>
                                    <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                                        {row.concepts}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* syscall 번호 확인 CodeBlock */}
                <CodeBlock code={syscallCatalogCode} language="bash" filename="strace / perf / /proc" />

                {/* syscall 진입 흐름 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {[
                        {
                            title: '빠른 경로 (vDSO)',
                            body: 'gettimeofday(), clock_gettime() 등 일부 syscall은 커널 진입 없이 유저 공간에서 직접 실행됩니다 (vDSO 매핑). Ring 전환이 없어 성능이 극대화됩니다.',
                            color: 'green',
                        },
                        {
                            title: '일반 경로',
                            body: 'syscall 어셈블리 명령 → CPU 특권 레벨 전환(Ring3→Ring0) → entry_SYSCALL_64 → syscall 테이블 참조 → 핸들러 실행 → sysret → 유저 복귀',
                            color: 'blue',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className={`rounded-xl border p-4 space-y-1.5 ${
                                card.color === 'green'
                                    ? 'bg-green-950/20 border-green-800/50'
                                    : 'bg-blue-950/20 border-blue-800/50'
                            }`}
                        >
                            <div
                                className={`text-xs font-semibold uppercase tracking-wide ${
                                    card.color === 'green' ? 'text-green-400' : 'text-blue-400'
                                }`}
                            >
                                {card.title}
                            </div>
                            <div className="text-xs text-gray-400 leading-relaxed">{card.body}</div>
                        </div>
                    ))}
                </div>

                {/* fork() vs clone() vs vfork() 비교 */}
                <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        fork() vs clone() vs vfork() 비교
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                                    <th className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-200 font-mono">
                                        함수
                                    </th>
                                    <th className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-200">
                                        POSIX
                                    </th>
                                    <th className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-200">
                                        메모리 공유
                                    </th>
                                    <th className="px-4 py-2.5 font-semibold text-gray-700 dark:text-gray-200">
                                        주요 용도
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {forkCompareRows.map((row, i) => (
                                    <tr
                                        key={row.fn}
                                        className={`border-t border-gray-100 dark:border-gray-800 ${
                                            i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                                        }`}
                                    >
                                        <td className="px-4 py-2.5 font-mono text-blue-600 dark:text-blue-300 font-medium whitespace-nowrap">
                                            {row.fn}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{row.posix}</td>
                                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{row.memory}</td>
                                        <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                                            {row.usage}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Section>

            <TopicNavigation topicId="01-overview" />
        </div>
    )
}
