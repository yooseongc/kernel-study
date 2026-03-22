import { CodeBlock } from '../../components/viz/CodeBlock'
import { useTheme } from '../../hooks/useTheme'
import { T } from '../../components/ui/GlossaryTooltip'
import { Section } from '../../components/ui/Section'
import { Prose } from '../../components/ui/Prose'
import { InfoTable, type TableRow } from '../../components/ui/InfoTable'
import { LearningCard } from '../../components/ui/LearningCard'
import { TopicNavigation } from '../../components/ui/TopicNavigation'
import { ProcTreeChart } from '../../components/concepts/debug/ProcTreeChart'
import { NetworkBottleneckChart } from '../../components/concepts/debug/NetworkBottleneckChart'
import { FlameGraphViz } from '../../components/concepts/debug/FlameGraphViz'
import * as snippets from './codeSnippets'

// ─────────────────────────────────────────────────────────────────────────────
// Code strings
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Table data
// ─────────────────────────────────────────────────────────────────────────────

const procCmdRows: TableRow[] = [
    { cells: ['cat /proc/net/dev', 'NIC별 RX/TX 패킷/바이트/에러'] },
    { cells: ['cat /proc/net/softnet_stat', 'CPU별 패킷 처리 통계'] },
    { cells: ['cat /proc/interrupts', 'IRQ별 CPU 분산 현황'] },
    { cells: ['cat /proc/<pid>/maps', '프로세스 가상 주소 맵'] },
    { cells: ['sysctl net.core.rmem_max', '소켓 수신 버퍼 최대값'] },
]

const printkRows: TableRow[] = [
    { cells: ['0 (KERN_EMERG)', 'pr_emerg()', '시스템 불능'] },
    { cells: ['1 (KERN_ALERT)', 'pr_alert()', '즉각 조치 필요'] },
    { cells: ['2 (KERN_CRIT)', 'pr_crit()', '심각한 오류'] },
    { cells: ['3 (KERN_ERR)', 'pr_err()', '오류'] },
    { cells: ['4 (KERN_WARNING)', 'pr_warn()', '경고'] },
    { cells: ['6 (KERN_INFO)', 'pr_info()', '정보'] },
    { cells: ['7 (KERN_DEBUG)', 'pr_debug()', '디버그'] },
]

const bottleneckTableRows: TableRow[] = [
    { cells: ['NIC 드롭', 'ethtool -S eth0 | grep drop', 'rx_ring_size 증가, 다중 큐'] },
    { cells: ['softnet 드롭', '/proc/net/softnet_stat col2', 'net.core.netdev_max_backlog 증가'] },
    { cells: ['conntrack 가득', 'conntrack -S', 'nf_conntrack_max 증가'] },
    { cells: ['소켓 버퍼', 'ss -nmp', 'rmem_max/wmem_max 증가'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// 11.12  Flame Graph
// ─────────────────────────────────────────────────────────────────────────────

const cpuTypeRows: TableRow[] = [
    { cells: ['on-CPU', 'CPU를 실제로 쓰는 시간', 'perf, bpftrace profile:'] },
    { cells: ['off-CPU', '블로킹(락, I/O) 대기 시간', 'offcputime (bcc), wakeuptime'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topic10() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">Topic 11</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">성능 분석과 디버깅</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">Performance Analysis & Debugging</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    dmesg, <T id="proc">/proc</T>, /sys, Oops/Panic, <T id="perf">perf</T>, <T id="ftrace">ftrace</T>,{' '}
                    <T id="lockdep">lockdep</T>, <T id="kasan">KASAN</T>, kdump, container 디버깅
                </p>
            </header>

            <LearningCard
                topicId="11-debugging"
                items={[
                    'perf stat/record/report로 CPU 성능 이벤트를 수집하고 분석하는 방법을 이해합니다',
                    'ftrace와 kprobe를 이용해 커널 함수 호출을 실시간으로 추적하는 기법을 배웁니다',
                    'Kernel Oops 메시지를 해석하고 /proc, /sys 인터페이스로 시스템 상태를 진단하는 방법을 파악합니다',
                ]}
            />

            {/* 11.1 /proc와 /sys 활용 */}
            <Section id="s111" title="11.1  /proc와 /sys 활용">
                <Prose>
                    <code className="font-mono text-blue-600 dark:text-blue-400">/proc</code>와{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">/sys</code>는 커널이 제공하는 가상
                    파일시스템입니다. 런타임 커널 상태를 파일 인터페이스로 노출하여 사용자 공간에서 커널 내부 정보를
                    읽거나 파라미터를 조정할 수 있습니다.
                </Prose>
                <ProcTreeChart />
                <InfoTable headers={['명령어', '설명']} rows={procCmdRows} />
                <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 font-mono">
                        /proc/net/ — 네트워크 상태 파일
                    </h3>
                    <CodeBlock code={snippets.procNetCode} language="bash" filename="# /proc/net/ 실전 활용" />
                </div>
            </Section>

            {/* 11.2 dmesg와 커널 로그 */}
            <Section id="s112" title="11.2  dmesg와 커널 로그">
                <Prose>
                    <code className="font-mono text-blue-600 dark:text-blue-400">printk()</code>로 출력된 커널 메시지는
                    ring buffer에 저장됩니다. <code className="font-mono text-blue-600 dark:text-blue-400">dmesg</code>{' '}
                    명령으로 버퍼를 읽을 수 있으며 로그 레벨로 필터링할 수 있습니다.
                </Prose>
                <CodeBlock code={snippets.dmesgCode} language="bash" filename="dmesg 명령어" />
                <InfoTable headers={['레벨', '매크로', '용도']} rows={printkRows} />
            </Section>

            {/* 11.3 Oops / Panic 읽는 법 */}
            <Section id="s113" title="11.3  Oops / Panic 읽는 법">
                <Prose>
                    커널 버그 발생 시 Oops 메시지가 출력됩니다. NULL 포인터 역참조, 스택 오버플로우 등 심각한 오류는
                    시스템 Panic으로 이어질 수 있습니다. Oops 메시지를 읽는 능력이 커널 디버깅의 핵심입니다.
                </Prose>
                <CodeBlock code={snippets.oopsExample} language="bash" filename="Oops 예시 출력" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'RIP',
                            color: '#ef4444',
                            desc: '오류 발생한 정확한 코드 위치. addr2line 또는 gdb로 심볼로 변환하여 소스 라인을 찾을 수 있습니다.',
                        },
                        {
                            title: '레지스터',
                            color: '#f59e0b',
                            desc: 'RAX=0은 NULL 포인터를 의미합니다. CR2는 page fault 주소를 저장합니다. RIP, RSP, RBP를 조합하면 실행 컨텍스트를 파악할 수 있습니다.',
                        },
                        {
                            title: 'Call Trace',
                            color: '#3b82f6',
                            desc: '호출 스택 역추적. 맨 위가 오류 지점이며 아래로 갈수록 이전 호출자입니다. ? 표시는 불확실한 프레임입니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.4 kdump / crash */}
            <Section id="s114" title="11.4  kdump / crash — 프로덕션 크래시 사후 분석">
                <Prose>
                    서버가 Kernel Panic으로 재부팅된 후, kdump가 저장한 메모리 덤프(vmcore)를 crash 유틸리티로
                    분석합니다. 라이브 디버깅 없이 사후 분석 가능합니다.
                </Prose>
                <CodeBlock code={snippets.kdumpSetupCode} language="bash" filename="# kdump 설정" />
                <CodeBlock code={snippets.crashAnalysisCode} language="bash" filename="# crash 유틸리티로 vmcore 분석" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: '1. Kernel Panic 발생',
                            color: '#ef4444',
                            desc: 'kexec가 미리 로드한 crash 커널로 즉시 전환합니다. 기존 메모리 내용이 보존됩니다.',
                        },
                        {
                            title: '2. kdump 실행',
                            color: '#f59e0b',
                            desc: 'crash 커널이 부팅된 후 메모리 덤프를 /var/crash에 저장하고 재부팅합니다.',
                        },
                        {
                            title: '3. crash 분석',
                            color: '#3b82f6',
                            desc: 'vmcore + vmlinux로 크래시 시점의 메모리 상태를 완전히 복원하여 분석합니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.5 perf 기초 */}
            <Section id="s115" title="11.5  perf 기초">
                <Prose>
                    <code className="font-mono text-blue-600 dark:text-blue-400">perf</code>는 커널 내장 프로파일링
                    도구입니다. CPU 성능 카운터, 소프트웨어 이벤트, 트레이스포인트를 지원하며 FlameGraph와 함께 사용하면
                    핫스팟을 직관적으로 파악할 수 있습니다.
                </Prose>
                <CodeBlock code={snippets.perfCode} language="bash" filename="perf 명령어" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { cmd: 'perf top', desc: '실시간 CPU 핫스팟', color: '#3b82f6' },
                        { cmd: 'perf record', desc: '샘플 수집', color: '#8b5cf6' },
                        { cmd: 'perf report', desc: '결과 분석', color: '#10b981' },
                        { cmd: 'perf stat', desc: '이벤트 카운트', color: '#f59e0b' },
                    ].map((item) => (
                        <div
                            key={item.cmd}
                            className="rounded-lg px-3 py-2.5"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}44`,
                            }}
                        >
                            <div className="font-mono text-xs font-bold mb-1" style={{ color: item.color }}>
                                {item.cmd}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 text-xs">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.6 ftrace */}
            <Section id="s116" title="11.6  ftrace">
                <Prose>
                    <T id="ftrace">ftrace</T>는 커널 함수 호출 추적 도구입니다.{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">/sys/kernel/debug/tracing/</code>{' '}
                    인터페이스를 통해 제어하며 특정 함수, PID, 이벤트를 타겟팅하여 정밀하게 추적할 수 있습니다.
                </Prose>
                <CodeBlock code={snippets.ftraceCode} language="bash" filename="ftrace 설정" />
                <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
                    <span className="font-bold text-blue-600 dark:text-blue-400">팁:</span>{' '}
                    <code className="font-mono">function_graph</code> tracer를 사용하면 함수 호출 트리와 실행 시간을
                    함께 볼 수 있습니다. 네트워크 병목 분석 시 <code className="font-mono">tcp_*</code> 필터와 조합하면
                    매우 효과적입니다.
                </div>
            </Section>

            {/* 11.7 네트워크 병목 분석 */}
            <Section id="s117" title="11.7  네트워크 병목 분석">
                <Prose>
                    네트워크 성능 문제는 NIC 드롭부터 애플리케이션 처리 지연까지 여러 계층에서 발생합니다. 체크
                    우선순위에 따라 순서대로 점검하면 빠르게 병목 지점을 찾을 수 있습니다.
                </Prose>
                <NetworkBottleneckChart />
                <InfoTable headers={['위치', '확인 방법', '조치']} rows={bottleneckTableRows} />
            </Section>

            {/* 11.8 sar */}
            <Section id="s118" title="11.8  sar를 이용한 시스템 모니터링">
                <Prose>
                    <code className="font-mono text-blue-600 dark:text-blue-400">sar</code>(System Activity Reporter)는
                    CPU, 메모리, 네트워크, 디스크 통계를 시계열로 수집합니다. cron으로 자동 수집하면 문제 발생 시점의
                    시스템 상태를 사후 분석할 수 있습니다.
                </Prose>
                <CodeBlock code={snippets.sarCode} language="bash" filename="sar 명령어" />
            </Section>

            {/* 11.9 컨테이너 환경 디버깅 */}
            <Section id="s119" title="11.9  컨테이너 환경 디버깅">
                <Prose>
                    컨테이너(Docker/K8s)는 cgroup과 namespace로 격리됩니다. OOM, 성능 저하 문제의 원인이 컨테이너
                    내부인지 호스트인지 구분하는 방법입니다.
                </Prose>
                <CodeBlock code={snippets.containerCgroupCode} language="bash" filename="# 컨테이너 cgroup 디버깅" />
                <CodeBlock code={snippets.containerNamespaceCode} language="bash" filename="# namespace 디버깅" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'OOM 진단',
                            color: '#ef4444',
                            desc: 'memory.max 초과 → OOMKilled. memory.events를 확인하고 limit을 상향하거나 코드를 최적화합니다.',
                        },
                        {
                            title: 'CPU Throttle',
                            color: '#f59e0b',
                            desc: 'cpu.max quota 소진 → 응답 지연. cpu.stat의 throttled_time 값을 확인합니다.',
                        },
                        {
                            title: '네트워크 격리 문제',
                            color: '#3b82f6',
                            desc: 'nsenter로 컨테이너 내부에서 직접 ip, ss, tcpdump를 실행하여 네임스페이스 내부 상태를 진단합니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.10 lockdep */}
            <Section id="s1110" title="11.10  lockdep — 잠금 순서 검증기">
                <Prose>
                    <code className="font-mono text-blue-600 dark:text-blue-400">lockdep</code>은 커널에 내장된 동적
                    분석 도구로, 프로그램 실행 중 잠금 획득 순서를 추적하고{' '}
                    <strong className="text-gray-800 dark:text-gray-200">데드락 가능성</strong>을 런타임에 감지합니다.{' '}
                    <T id="lockdep">lockdep</T>은 실제 데드락이 발생하기 전에 경고합니다.
                </Prose>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-white dark:bg-gray-900 p-4 space-y-2">
                        <div className="text-xs font-mono font-bold text-red-500 dark:text-red-400">
                            데드락 발생 상황
                        </div>
                        <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre">{`CPU 0:            CPU 1:
lock(A)           lock(B)
lock(B) ← 대기   lock(A) ← 대기
          (서로 기다리며 교착)`}</pre>
                    </div>
                    <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-white dark:bg-gray-900 p-4 space-y-2">
                        <div className="text-xs font-mono font-bold text-green-600 dark:text-green-400">
                            lockdep 감지
                        </div>
                        <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre">{`lockdep가 잠금 순서 그래프 유지:
  A → B (CPU 0이 A 보유 중 B 획득)
  B → A (CPU 1이 B 보유 중 A 획득)
  → 사이클 감지 → 즉시 경고!
  (실제 교착 전에 잡아냄)`}</pre>
                    </div>
                </div>
                <CodeBlock code={snippets.lockdepEnableCode} language="bash" filename="# lockdep 활성화 및 분석" />
                <CodeBlock code={snippets.lockdepCodeCode} language="c" filename="# lockdep 친화적 코드 작성" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'AB-BA 데드락',
                            color: '#ef4444',
                            desc: '두 잠금을 반대 순서로 획득하는 패턴 감지',
                        },
                        {
                            title: '인터럽트 안전성',
                            color: '#f59e0b',
                            desc: '인터럽트 핸들러에서 프로세스 컨텍스트 잠금 획득 시도 감지',
                        },
                        {
                            title: '재귀 잠금',
                            color: '#8b5cf6',
                            desc: '같은 잠금을 두 번 획득하려는 시도 감지',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.11 KASAN */}
            <Section id="s1111" title="11.11  KASAN — 메모리 버그 탐지기">
                <Prose>
                    <strong className="text-gray-800 dark:text-gray-200">
                        <T id="kasan">KASAN</T> (Kernel Address Sanitizer)
                    </strong>
                    은 커널의 메모리 안전성 버그를 런타임에 탐지합니다.{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">use-after-free</code>,{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">out-of-bounds</code> 접근 같은 버그는
                    재현이 어렵고 보안 취약점으로 이어집니다. <T id="kasan">KASAN</T>은 이를 즉시 잡아냅니다.
                </Prose>
                <InfoTable
                    headers={['버그 유형', '설명', '위험성']}
                    rows={[
                        { cells: ['Use-after-free', '해제된 메모리 접근', '커널 익스플로잇의 주요 경로'] },
                        { cells: ['Out-of-bounds read', '버퍼 경계 밖 읽기', '정보 유출'] },
                        { cells: ['Out-of-bounds write', '버퍼 경계 밖 쓰기', '메모리 손상, 패닉'] },
                        { cells: ['Use-before-init', '초기화 전 메모리 사용', '예측 불가 동작'] },
                    ]}
                />
                <CodeBlock code={snippets.kasanEnableCode} language="bash" filename="# KASAN 활성화" />
                <CodeBlock code={snippets.kasanBugCode} language="c" filename="# KASAN이 잡는 버그 예시" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'KASAN',
                            color: '#ef4444',
                            desc: '메모리 접근 버그 (use-after-free, out-of-bounds) 탐지',
                        },
                        {
                            title: 'KMSAN (Kernel Memory Sanitizer)',
                            color: '#8b5cf6',
                            desc: '초기화되지 않은 메모리 사용 탐지',
                        },
                        {
                            title: 'kmemleak',
                            color: '#10b981',
                            desc: '커널 메모리 누수 탐지. cat /sys/kernel/debug/kmemleak 으로 조회',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 11.12 Flame Graph */}
            <Section id="s1112" title="11.12  Flame Graph — CPU 병목 시각화">
                <Prose>
                    <strong className="text-gray-800 dark:text-gray-200">Flame Graph</strong>는 Brendan Gregg가 개발한{' '}
                    <strong>CPU 시간 사용 시각화</strong> 기법입니다. 함수 콜스택을 수평 방향으로 쌓아, 폭이 넓을수록
                    CPU를 많이 사용함을 직관적으로 표현합니다.{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">perf record</code> →{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">perf script</code> →{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">FlameGraph</code> 스크립트
                    파이프라인으로 생성합니다.
                </Prose>

                <FlameGraphViz />

                {/* Pipeline code */}
                <CodeBlock code={snippets.flameGenCode} language="bash" filename="# Flame Graph 생성 파이프라인" />

                {/* on-CPU vs off-CPU table */}
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">on-CPU vs off-CPU</p>
                <InfoTable headers={['유형', '측정 대상', '도구']} rows={cpuTypeRows} />
            </Section>

            {/* 11.13 관련 커널 파라미터 */}
            <Section id="s1113" title="11.13  관련 커널 파라미터">
                <Prose>
                    디버깅과 성능 분석에 영향을 미치는 주요 커널 파라미터입니다. 개발/테스트 환경에서는 제한을
                    완화하고, 프로덕션에서는 보안을 고려하여 설정합니다.
                </Prose>
                <InfoTable headers={['파라미터', '기본값', '설명']} rows={snippets.debugParamRows} />
                <CodeBlock code={snippets.debugParamCheckCode} language="bash" filename="# 디버깅 파라미터 확인/변경" />
            </Section>

            <TopicNavigation topicId="11-debugging" />
        </div>
    )
}
