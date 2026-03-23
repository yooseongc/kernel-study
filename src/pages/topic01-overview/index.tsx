import { useState } from 'react'
import { renderRingDiagram, ringData } from '../../components/concepts/overview/RingDiagram'
import type { RingInfo } from '../../components/concepts/overview/RingDiagram'
import { renderSwitchCostChart } from '../../components/concepts/overview/SwitchCostChart'
import { renderSubsystemGraph } from '../../components/concepts/overview/SubsystemGraph'
import { SyscallFlowViz } from '../../components/concepts/overview/SyscallFlowViz'
import { KernelArchDiagram } from '../../components/concepts/overview/KernelArchDiagram'
import { KernelRef } from '../../components/ui/KernelRef'
import { Alert, AnimatedDiagram, CodeBlock, D3Container, InfoBox, InfoTable, MermaidDiagram, Prose, Section, StatCard, T , TopicPage , InlineCode , CardGrid } from '@study-ui/components'
import type { TableColumn } from '@study-ui/components'
import {
    syscallFlowChart,
    taskStructCode,
    syscallAnimSteps,
    syscallEntryCode,
    syscallCatalogCode,
    syscallTableRows,
    forkCompareRows,
    kernelParamRows,
    kernelParamCheckCode,
} from './chartData'

export default function Topic01Overview() {
    const [selectedRing, setSelectedRing] = useState<RingInfo>(ringData[1]) // default: Ring 0

    return (
        <TopicPage topicId="01-overview" learningItems={[
                    '커널이 하는 일과 유저/커널 공간의 경계를 이해합니다',
                    '시스템 콜이 어떻게 유저 프로그램과 커널을 연결하는지 배웁니다',
                    '모놀리식 커널과 커널 모듈 구조, 소스 트리의 큰 그림을 파악합니다',
                ]}>
            {/* Header */}

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
                <Alert variant="tip">
                    x86 CPU는 <strong>권한 레벨(Ring 0~3)</strong>을 제공합니다. 유저 프로그램은 Ring 3(최소 권한),
                    커널은 Ring 0(최대 권한)에서 실행됩니다. 이 경계를 넘는 것이 바로{' '}
                    <strong>
                        <T id="syscall">시스템 콜</T>
                    </strong>
                    입니다.
                </Alert>

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
                <CardGrid cols={2}>
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
                </CardGrid>

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

            {/* 섹션 5: 전체 계층 구조 (정적 카드 레이아웃) */}
            <Section id="s15" title="1.5  전체 계층 구조">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    드래그·휠로 확대/축소할 수 있습니다. 커널 공간(Ring 0)의 10개 서브시스템이 시스템 콜을 통해 유저
                    프로그램에 서비스를 제공합니다.
                </p>
                <KernelArchDiagram />
            </Section>

            {/* 섹션 6: task_struct */}
            <Section id="s16" title="1.6  task_struct — 프로세스의 본체">
                <Prose>
                    커널에서 모든 프로세스/스레드는{' '}
                    <T id="task_struct">task_struct</T>
                    라는 거대한 구조체로 표현됩니다. 여기에는 <T id="pid">PID</T>, 메모리 정보, 열린 파일, 스케줄링 정보 등이 모두
                    포함됩니다. <KernelRef path="include/linux/sched.h" sym="task_struct" />
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
                    활성화되는지 강조됩니다. <KernelRef path="arch/x86/entry/entry_64.S" sym="entry_SYSCALL_64" />
                </Prose>

                <AnimatedDiagram
                    steps={syscallAnimSteps}
                    renderStep={(step) => <SyscallFlowViz step={step} />}
                    autoPlayInterval={2200}
                />

                <CodeBlock code={syscallEntryCode} language="c" filename="arch/x86/entry/entry_64.S + kernel/sys.c" />

                {/* 성능 수치 인포 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <StatCard
                        title="syscall 비용"
                        value="~100 ns"
                        color="amber"
                        desc="Ring 전환 + 레지스터 저장/복원. 일반 함수 호출(~1 ns)보다 약 100배 비쌉니다. Meltdown/Spectre 패치 이후 더 증가했습니다."
                    />
                    <StatCard
                        title="vDSO 최적화"
                        value="~5 ns"
                        color="green"
                        desc="gettimeofday, clock_gettime 등은 커널 진입 없이 매핑된 메모리에서 직접 실행됩니다. Ring 전환 비용이 없습니다."
                    />
                    <StatCard
                        title="io_uring"
                        value="배치 syscall"
                        color="purple"
                        desc="반복적인 Ring 전환 오버헤드를 공유 링 버퍼(submission/completion queue)로 최소화합니다."
                    />
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
                <InfoTable
                    striped
                    className="mt-4"
                    headers={[
                        { header: '시스템 콜', mono: true, nowrap: true, cellClassName: 'text-blue-600 dark:text-blue-300 font-medium' },
                        { header: '번호(x86-64)', align: 'text-right', mono: true, nowrap: true, cellClassName: 'text-gray-500 dark:text-gray-400' },
                        { header: '역할', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        { header: '관련 개념', cellClassName: 'text-gray-500 dark:text-gray-400' },
                    ] satisfies TableColumn[]}
                    rows={syscallTableRows.map((row) => ({ cells: [row.name, String(row.nr), row.role, row.concepts] }))}
                />

                {/* syscall 번호 확인 CodeBlock */}
                <CodeBlock code={syscallCatalogCode} language="bash" filename="strace / perf / /proc" />

                {/* syscall 진입 흐름 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <InfoBox color="green" title="빠른 경로 (vDSO)">
                        gettimeofday(), clock_gettime() 등 일부 syscall은 커널 진입 없이 유저 공간에서 직접 실행됩니다
                        (vDSO 매핑). Ring 전환이 없어 성능이 극대화됩니다.
                    </InfoBox>
                    <InfoBox color="blue" title="일반 경로">
                        syscall 어셈블리 명령 → CPU 특권 레벨 전환(Ring3→Ring0) → entry_SYSCALL_64 → syscall 테이블 참조
                        → 핸들러 실행 → sysret → 유저 복귀
                    </InfoBox>
                </div>

                {/* fork() vs clone() vs vfork() 비교 */}
                <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        fork() vs clone() vs vfork() 비교
                    </p>
                    <InfoTable
                        striped
                        headers={[
                            { header: '함수', mono: true, nowrap: true, cellClassName: 'text-blue-600 dark:text-blue-300 font-medium' },
                            { header: 'POSIX', cellClassName: 'text-gray-700 dark:text-gray-300' },
                            { header: '메모리 공유', cellClassName: 'text-gray-700 dark:text-gray-300' },
                            { header: '주요 용도', cellClassName: 'text-gray-500 dark:text-gray-400' },
                        ] satisfies TableColumn[]}
                        rows={forkCompareRows.map((row) => ({ cells: [row.fn, row.posix, row.memory, row.usage] }))}
                    />
                </div>
            </Section>

            {/* 1.9 Kconfig */}
            <Section id="s19" title="1.9  Kconfig — 커널 설정 시스템">
                <Prose>
                    리눅스 커널은 수천 개의 설정 옵션(CONFIG_*)을 통해 어떤 기능을 포함할지 결정합니다.
                    <strong className="text-gray-800 dark:text-gray-200">Kconfig</strong> 시스템이 이 설정을 관리하며,
                    각 옵션은 <InlineCode></InlineCode>(내장),{' '}
                    <InlineCode></InlineCode>(모듈),{' '}
                    <InlineCode></InlineCode>(제외) 중 하나를 선택합니다.
                </Prose>
                <InfoTable
                    headers={['명령', '인터페이스', '설명']}
                    rows={[
                        { cells: ['make menuconfig', 'ncurses TUI', '터미널 기반 메뉴 설정 (가장 일반적)'] },
                        { cells: ['make defconfig', '없음', '현재 아키텍처의 기본 설정 생성'] },
                        { cells: ['make oldconfig', '텍스트 Q&A', '기존 .config 기반으로 새 옵션만 질문'] },
                        { cells: ['make localmodconfig', '없음', '현재 로드된 모듈만 포함 (최소 커널)'] },
                    ]}
                />
                <CodeBlock code={`# 현재 커널 설정 확인
cat /boot/config-$(uname -r) | grep CONFIG_KASAN
# CONFIG_KASAN=y

# 또는 /proc에서 (CONFIG_IKCONFIG_PROC=y 필요)
zcat /proc/config.gz | grep CONFIG_PREEMPT

# Kconfig 파일 문법 예시 (drivers/net/Kconfig)
# config IGB
#     tristate "Intel(R) 82575/82576 PCI-Express Gigabit Ethernet"
#     depends on PCI
#     select PHYLIB
#     help
#       This driver supports Intel(R) 82575/82576 gigabit ethernet.

# 의존성 확인
# depends on: 이 옵션이 활성화되려면 필요한 조건
# select: 이 옵션 활성화 시 자동으로 켜지는 옵션
# tristate: y/m/n 선택 가능 (bool은 y/n만)`} language="bash" filename="# Kconfig 시스템" />
            </Section>

            {/* 1.10 커널 빌드 */}
            <Section id="s110" title="1.10  커널 빌드 과정">
                <Prose>
                    커널 소스를 다운로드하고 컴파일하여 설치하는 전체 과정입니다.
                    배포판 커널 대신 직접 빌드하면 불필요한 드라이버를 제거하거나 디버깅 옵션(KASAN, lockdep)을 활성화할 수 있습니다.
                </Prose>
                <CodeBlock code={`# 1. 커널 소스 다운로드
wget https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-6.8.tar.xz
tar xf linux-6.8.tar.xz && cd linux-6.8

# 2. 설정 (.config 생성)
make defconfig                 # 아키텍처 기본값
# 또는
cp /boot/config-$(uname -r) .config
make olddefconfig              # 기존 설정 + 새 옵션 기본값

# 3. 필요 시 커스터마이징
make menuconfig
# → General setup → Preemption Model → Voluntary
# → Kernel hacking → KASAN, lockdep 등 활성화

# 4. 빌드 (병렬 컴파일)
make -j$(nproc)                # vmlinux + 모듈 빌드
# 또는 deb 패키지로 빌드 (Ubuntu/Debian)
make -j$(nproc) bindeb-pkg

# 5. 모듈 설치
sudo make modules_install      # /lib/modules/6.8.0/ 에 설치

# 6. 커널 설치
sudo make install              # /boot/vmlinuz-6.8.0 + initramfs 생성
# 또는 deb 패키지 설치
sudo dpkg -i ../linux-image-6.8.0_*.deb

# 7. 부트로더 업데이트
sudo update-grub               # GRUB 메뉴에 추가

# 8. 재부팅 후 확인
uname -r                       # 6.8.0`} language="bash" filename="# 커널 빌드 전체 과정" />
                <InfoTable
                    headers={['빌드 산출물', '경로', '설명']}
                    rows={[
                        { cells: ['vmlinux', '소스 루트', 'ELF 형식 커널 이미지 (디버깅용, 비압축)'] },
                        { cells: ['bzImage', 'arch/x86/boot/', '압축된 부팅 가능 커널 이미지'] },
                        { cells: ['*.ko', '각 드라이버 디렉터리', '커널 모듈 오브젝트 파일'] },
                        { cells: ['System.map', '소스 루트', '심볼 → 주소 매핑 (oops 분석용)'] },
                        { cells: ['.config', '소스 루트', '이번 빌드의 전체 설정 기록'] },
                    ]}
                />
                <Alert variant="tip" title="localmodconfig로 빌드 시간 단축">
                    make localmodconfig는 현재 시스템에 로드된 모듈만 포함하여 빌드 시간을 대폭 줄입니다.
                    일반 defconfig 대비 50~70% 빠르게 빌드할 수 있습니다.
                </Alert>
            </Section>

            {/* 섹션 11: 관련 커널 파라미터 */}
            <Section id="s111" title="1.11  관련 커널 파라미터">
                <Prose>
                    커널 동작을 제어하는 주요 sysctl 파라미터입니다.{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        /proc/sys/
                    </code>{' '}
                    또는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        sysctl
                    </code>{' '}
                    명령으로 런타임에 조회·변경할 수 있습니다.
                </Prose>
                <InfoTable headers={['파라미터', '기본값', '설명']} rows={kernelParamRows} />
                <CodeBlock code={kernelParamCheckCode} language="bash" filename="# 커널 파라미터 확인 명령" />
            </Section>
        </TopicPage>
    )
}
