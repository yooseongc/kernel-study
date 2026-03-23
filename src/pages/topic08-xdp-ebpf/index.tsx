import { KernelRef } from '../../components/ui/KernelRef'
import { XdpVsNormalDiagram } from '../../components/concepts/ebpf/XdpVsNormalDiagram'
import { EbpfPipelineDiagram } from '../../components/concepts/ebpf/EbpfPipelineDiagram'
import * as snippets from './codeSnippets'
import { CodeBlock, InfoTable, LearningCard, Prose, Section, T, TopicNavigation , useTheme , type TableRow } from '@study-ui/components'

// ─────────────────────────────────────────────────────────────────────────────
// XDP DDoS 예제 코드
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 8.2  XDP 모드 비교
// ─────────────────────────────────────────────────────────────────────────────
const xdpModeRows: TableRow[] = [
    { cells: ['Native XDP', '드라이버 내부 (DMA 직후)', '최고 (~100Mpps)', '드라이버 지원 필요'] },
    { cells: ['Generic XDP', 'sk_buff 할당 후', '낮음 (fallback)', '모든 드라이버'] },
    { cells: ['Offloaded XDP', 'NIC 하드웨어', '최고+', '스마트NIC 필요'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// 8.4  eBPF verifier
// ─────────────────────────────────────────────────────────────────────────────
const verifierRows: TableRow[] = [
    { cells: ['무한 루프 금지', '모든 경로가 종료됨을 보장 (backward jump 제한)'] },
    { cells: ['메모리 안전성', '범위 밖 메모리 접근 금지, 포인터 검증'] },
    { cells: ['초기화 검사', '미초기화 레지스터 사용 금지'] },
    { cells: ['helper 함수만', '허가된 커널 함수만 호출 가능'] },
    { cells: ['스택 크기', '최대 512B'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// 8.5  eBPF Maps
// ─────────────────────────────────────────────────────────────────────────────
const mapRows: TableRow[] = [
    { cells: ['BPF_MAP_TYPE_HASH', '해시테이블', 'IP별 카운터, 연결 추적'] },
    { cells: ['BPF_MAP_TYPE_ARRAY', '배열', '통계, 설정값'] },
    { cells: ['BPF_MAP_TYPE_RINGBUF', '링 버퍼', '이벤트 스트림 → 사용자 공간'] },
    { cells: ['BPF_MAP_TYPE_LRU_HASH', 'LRU 해시', 'conntrack 캐시'] },
    { cells: ['BPF_MAP_TYPE_PERF_EVENT_ARRAY', 'perf 이벤트', 'tracing 데이터 수집'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// 8.6  BTF / CO-RE / libbpf
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 8.7  TC BPF vs XDP
// ─────────────────────────────────────────────────────────────────────────────
const tcVsXdpRows: TableRow[] = [
    { cells: ['실행 위치', '드라이버 (sk_buff 전)', 'sk_buff 이후'] },
    { cells: ['방향', '수신만', '수신 + 송신'] },
    { cells: ['sk_buff 접근', '불가', '가능'] },
    { cells: ['Netfilter 연동', '불가', '가능'] },
    { cells: ['성능', '최고', '높음'] },
    { cells: ['용도', 'DDoS 방어, 로드밸런서', '복잡한 필터링, QoS'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// 8.8  bcc Tools
// ─────────────────────────────────────────────────────────────────────────────

const bccToolRows: TableRow[] = [
    { cells: ['execsnoop', '모든 execve 호출 실시간 추적', '숨겨진 프로세스 탐지'] },
    { cells: ['tcptracer', 'TCP 연결/종료 추적', '네트워크 연결 모니터링'] },
    { cells: ['biolatency', '블록 I/O 지연 히스토그램', '스토리지 성능 분석'] },
    { cells: ['opensnoop', '파일 open() 호출 추적', '파일 접근 감사'] },
    { cells: ['tcpconnect', '아웃바운드 TCP 연결', '악성 C2 통신 탐지'] },
    { cells: ['profile', 'CPU 프로파일링 (샘플링)', '핫스팟 함수 식별'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// 8.9  실무 활용 카드
// ─────────────────────────────────────────────────────────────────────────────
interface UseCaseCard {
    title: string
    subtitle: string
    description: string
    accentColor: string
    tags: string[]
}

const useCases: UseCaseCard[] = [
    {
        title: 'Cilium / eBPF CNI',
        subtitle: 'Kubernetes 네트워크 정책',
        description:
            'Kubernetes 네트워크 정책을 eBPF로 구현합니다. iptables 규칙 수만 개를 대체하여 O(1) 패킷 처리 성능과 수평 확장성을 제공합니다.',
        accentColor: '#06b6d4',
        tags: ['eBPF', 'CNI', 'k8s', 'iptables 대체'],
    },
    {
        title: 'Katran (Facebook)',
        subtitle: 'L4 로드밸런서',
        description:
            'XDP로 구현한 L4 로드밸런서로 10Mpps 이상의 처리량을 달성합니다. 기존 IPVS 대비 CPU 사용량이 크게 낮고 DSR(Direct Server Return) 지원합니다.',
        accentColor: '#f59e0b',
        tags: ['XDP', 'L4 LB', 'DSR', '10Mpps'],
    },
    {
        title: 'Falco / Tracee',
        subtitle: '컨테이너 보안 감사',
        description:
            'eBPF kprobe와 tracepoint로 시스템 콜을 실시간 감시합니다. 컨테이너 내부의 이상 동작(exec, file open, network)을 탐지하고 경고를 생성합니다.',
        accentColor: '#ef4444',
        tags: ['kprobe', 'tracepoint', 'seccomp', 'syscall 감사'],
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// 8.10  AF_XDP
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 8.11  seccomp-BPF
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 8.12 bpftrace
// ─────────────────────────────────────────────────────────────────────────────

const bpftraceProbeCards = [
    {
        title: 'kprobe: / uprobe:',
        color: '#f59e0b',
        desc: '커널/유저 함수 진입점. 임의 커널 함수에 동적 연결. 예: kprobe:tcp_sendmsg',
    },
    {
        title: 'kretprobe: / uretprobe:',
        color: '#06b6d4',
        desc: '함수 반환 시점. 반환값 확인 가능. 예: kretprobe:vfs_read { @read_bytes = hist(retval); }',
    },
    {
        title: 'tracepoint:',
        color: '#22c55e',
        desc: '커널 내장 정적 탐침. 안정적 ABI. 예: tracepoint:syscalls:sys_enter_read',
    },
    {
        title: 'profile:',
        color: '#8b5cf6',
        desc: '시간 기반 샘플링. CPU 프로파일링. 예: profile:hz:99 { @[kstack] = count(); }',
    },
]

const bpftraceSyntaxCards = [
    { label: 'probe { action }', desc: '기본 구조' },
    { label: '@map[key] = count()', desc: '집계 맵' },
    { label: 'hist(expr)', desc: '2의 거듭제곱 히스토그램' },
    { label: 'lhist(expr, min, max, step)', desc: '선형 히스토그램' },
    { label: 'kstack / ustack', desc: '커널/유저 스택 트레이스' },
    { label: '/filter/', desc: '조건부 실행' },
    { label: 'comm, pid, tid, nsecs', desc: '내장 변수' },
]

const bpftraceVsBccRows: TableRow[] = [
    { cells: ['bpftrace', '탐색/일회성. 빠른 원라이너. 고수준 언어'] },
    { cells: ['bcc (Python)', '장기 실행 도구. 복잡한 로직. libbpf/CO-RE 대안 있음'] },
    { cells: ['bpftool', 'eBPF 프로그램/맵 관리. 커널 BTF 정보 접근'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 8.13  관련 커널 파라미터
// ─────────────────────────────────────────────────────────────────────────────
const bpfKernelParamRows: TableRow[] = [
    { cells: ['kernel.unprivileged_bpf_disabled', '2', '0=허용, 1=영구 차단, 2=부팅 시 허용→차단'] },
    { cells: ['net.core.bpf_jit_enable', '1', 'eBPF JIT 컴파일러 활성화 (0=해석, 1=JIT, 2=JIT+디버그)'] },
    { cells: ['net.core.bpf_jit_harden', '0', 'JIT 하드닝. 1이면 상수 블라인딩 활성 (JIT spray 방지)'] },
    { cells: ['net.core.bpf_jit_kallsyms', '0', '1이면 JIT 컴파일된 BPF를 /proc/kallsyms에 노출'] },
    { cells: ['kernel.bpf_stats_enabled', '0', '1이면 BPF 프로그램 실행 통계 수집'] },
    { cells: ['net.core.optmem_max', '20480', '소켓 옵션 메모리 최대값 (AF_XDP UMEM에 영향)'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topic07() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">Topic 08</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">XDP, eBPF, 고성능 패킷 처리</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    XDP, eBPF &amp; High-Performance Packet Processing
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    XDP 개념, eBPF VM/verifier/맵, AF_XDP, seccomp-BPF, BTF/CO-RE
                </p>
            </header>

            <LearningCard
                topicId="08-xdp-ebpf"
                items={[
                    'XDP가 NIC 드라이버 레벨에서 패킷을 처리해 커널 스택 오버헤드를 제거하는 원리를 이해합니다',
                    'eBPF 프로그램이 검증기를 통과해 JIT 컴파일되고 훅에 연결되는 실행 모델을 배웁니다',
                    'TC BPF와 XDP의 차이, Maps를 통한 사용자 공간과의 데이터 공유를 파악합니다',
                ]}
            />

            {/* 8.1 XDP 개념과 위치 */}
            <Section id="s81" title="8.1  XDP 개념과 위치">
                <Prose>
                    <T id="xdp">XDP</T>(eXpress Data Path)는 드라이버가 패킷을 수신하는 즉시 —{' '}
                    <T id="sk_buff">sk_buff</T> 할당 전에 — 처리하는 고성능 경로입니다. 기존 커널 네트워크 스택 대비
                    10~100배 빠릅니다. 패킷이 DMA 버퍼에서 곧바로 <T id="ebpf">eBPF</T> 프로그램으로 넘어가기 때문에
                    메모리 할당 및 복사 오버헤드가 없습니다.
                    <div className="mt-2 flex flex-wrap gap-2">
                        <KernelRef path="include/linux/bpf.h" sym="bpf_prog" label="bpf_prog" />
                        <KernelRef path="include/uapi/linux/bpf.h" sym="xdp_md" label="xdp_md" />
                    </div>
                </Prose>
                <XdpVsNormalDiagram />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                        {
                            action: 'XDP_DROP',
                            desc: '패킷 즉시 폐기 (DDoS 방어)',
                            color: 'text-red-600 dark:text-red-400',
                            bg: 'bg-red-50 dark:bg-red-900/20',
                            border: 'border-red-200 dark:border-red-800/50',
                        },
                        {
                            action: 'XDP_PASS',
                            desc: '일반 네트워크 스택으로 전달',
                            color: 'text-green-600 dark:text-green-400',
                            bg: 'bg-green-50 dark:bg-green-900/20',
                            border: 'border-green-200 dark:border-green-800/50',
                        },
                        {
                            action: 'XDP_TX',
                            desc: '수신 NIC로 즉시 반송',
                            color: 'text-purple-600 dark:text-purple-400',
                            bg: 'bg-purple-50 dark:bg-purple-900/20',
                            border: 'border-purple-200 dark:border-purple-800/50',
                        },
                        {
                            action: 'XDP_REDIRECT',
                            desc: '다른 NIC나 CPU로 전달',
                            color: 'text-cyan-600 dark:text-cyan-400',
                            bg: 'bg-cyan-50 dark:bg-cyan-900/20',
                            border: 'border-cyan-200 dark:border-cyan-800/50',
                        },
                    ].map((item) => (
                        <div key={item.action} className={`rounded-lg border ${item.border} ${item.bg} px-3 py-3`}>
                            <div className={`font-mono text-xs font-bold mb-1 ${item.color}`}>{item.action}</div>
                            <div className="text-gray-600 dark:text-gray-400 text-xs leading-snug">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 8.2 XDP 모드 비교 */}
            <Section id="s82" title="8.2  XDP 모드 비교">
                <InfoTable headers={['모드', '위치', '성능', '드라이버 요구']} rows={xdpModeRows} />
                <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-xs text-blue-800 dark:text-blue-200">
                    <span className="font-bold text-blue-700 dark:text-blue-300">권장:</span> 프로덕션에서는 Native XDP를 사용하세요.
                    드라이버 지원 여부는{' '}
                    <span className="font-mono text-blue-700 dark:text-blue-300">ip link set dev eth0 xdp obj prog.o</span>으로 확인할 수
                    있습니다. 실패 시 Generic으로 자동 fallback 됩니다.
                </div>
            </Section>

            {/* 8.3 eBPF 실행 모델 */}
            <Section id="s83" title="8.3  eBPF 실행 모델">
                <Prose>
                    <T id="ebpf">eBPF</T>(extended Berkeley Packet Filter)는 커널에서 안전하게 사용자 정의 코드를
                    실행하는 범용 VM입니다. <T id="xdp">XDP</T>뿐만 아니라 <T id="kprobe">kprobe</T>, tracepoint,
                    <T id="cgroup">cgroup</T>, perf 등 다양한 지점에서 동작합니다. JIT 컴파일을 통해 네이티브에 가까운 성능을 냅니다.
                </Prose>
                <EbpfPipelineDiagram />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {[
                        {
                            step: 'eBPF C 코드',
                            detail: 'restricted C — 포인터 연산 제한, 전역 함수 금지',
                            color: '#3b82f6',
                        },
                        { step: 'clang/llvm', detail: 'target bpf — ELF 오브젝트로 컴파일', color: '#8b5cf6' },
                        {
                            step: 'eBPF 바이트코드',
                            detail: '64bit RISC ISA, 11개 레지스터, 512B 스택',
                            color: '#06b6d4',
                        },
                        {
                            step: 'verifier',
                            detail: '정적 분석으로 안전성 보장 — 통과 못 하면 로드 거부',
                            color: '#f59e0b',
                        },
                        { step: 'JIT 컴파일', detail: 'x86-64 / ARM64 네이티브 코드로 변환', color: '#10b981' },
                        { step: '커널 실행', detail: 'hook 지점에서 패킷/이벤트마다 호출됨', color: '#22c55e' },
                    ].map((item) => (
                        <div
                            key={item.step}
                            className="rounded-lg px-3 py-2.5"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold mb-0.5" style={{ color: item.color }}>
                                {item.step}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 leading-snug">{item.detail}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 8.4 eBPF verifier */}
            <Section id="s84" title="8.4  eBPF verifier">
                <Prose>
                    verifier는 <T id="ebpf">eBPF</T> 프로그램이 커널을 크래시시킬 수 없음을 정적 분석으로 보장합니다.
                    모든 가능한 실행 경로를 추적하며 안전하지 않은 접근을 거부합니다.
                </Prose>
                <InfoTable headers={['검사 항목', '설명']} rows={verifierRows} />
                <div className="rounded-lg border border-yellow-200 dark:border-yellow-800/40 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-xs text-yellow-800 dark:text-yellow-200">
                    <span className="font-bold text-yellow-700 dark:text-yellow-300">주의:</span> verifier 통과를 위해서는 모든 포인터 접근
                    전에 경계 검사를 수행해야 합니다. 컴파일러 최적화로 제거된 경계 검사를 verifier가 추적하지 못하는
                    경우 로드가 거부될 수 있습니다.
                </div>
            </Section>

            {/* 8.5 eBPF 맵 */}
            <Section id="s85" title="8.5  eBPF 맵 (Maps)">
                <Prose>
                    <T id="ebpf">eBPF</T> 프로그램과 사용자 공간, 또는 프로그램 간 데이터 공유를 위한 key-value
                    저장소입니다. 커널과 사용자 공간 모두에서 읽고 쓸 수 있으며 fd를 통해 접근합니다.
                </Prose>
                <InfoTable headers={['타입', '구조', '용도']} rows={mapRows} />
                <CodeBlock code={snippets.xdpDdosCode} language="c" filename="xdp_ddos.c" />
            </Section>

            {/* 8.6 BTF와 CO-RE */}
            <Section id="s86" title="8.6  BTF와 CO-RE — 이식 가능한 eBPF">
                <Prose>
                    전통적인 eBPF 프로그램은 커널 헤더에 의존해 컴파일해야 했습니다. 커널 버전이 다르면 구조체 오프셋이
                    달라져 재컴파일이 필요했습니다. BTF(BPF Type Format)와 CO-RE(Compile Once – Run Everywhere)가 이
                    문제를 해결합니다.
                </Prose>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {[
                        {
                            title: 'BTF',
                            color: '#3b82f6',
                            items: [
                                '커널에 내장된 타입 정보 (DWARF 대안)',
                                '/sys/kernel/btf/vmlinux에서 조회 가능',
                                '구조체 필드 오프셋, 타입 정보 포함',
                            ],
                        },
                        {
                            title: 'CO-RE',
                            color: '#10b981',
                            items: [
                                'libbpf가 로드 시점에 구조체 오프셋을 현재 커널에 맞게 재배치',
                                'BPF_CORE_READ() 매크로 사용',
                                '한 번 컴파일 → 여러 커널 버전에서 실행',
                            ],
                        },
                        {
                            title: 'libbpf',
                            color: '#8b5cf6',
                            items: [
                                'eBPF 로더 라이브러리',
                                'skeleton 자동 생성으로 타입 안전한 사용자 공간 코드',
                                '맵 관리, BTF 처리, 프로그램 로드 자동화',
                            ],
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-lg px-4 py-3 space-y-2"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold text-sm" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <ul className="space-y-1">
                                {card.items.map((item, i) => (
                                    <li key={i} className="text-gray-600 dark:text-gray-400 leading-snug flex gap-1.5">
                                        <span style={{ color: card.color }} className="shrink-0">
                                            ·
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <CodeBlock code={snippets.coreKprobeCode} language="c" filename="ebpf/kprobe_example.bpf.c" />
                <CodeBlock code={snippets.bpftoolCode} language="bash" filename="# bpftool 사용법" />
            </Section>

            {/* 8.7 TC BPF vs XDP */}
            <Section id="s87" title="8.7  TC BPF vs XDP 비교">
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                                {['항목', 'XDP', 'TC BPF'].map((h, i) => (
                                    <th
                                        key={i}
                                        className={`px-4 py-2.5 text-left font-semibold text-xs ${
                                            i === 1
                                                ? 'text-yellow-600 dark:text-yellow-400'
                                                : i === 2
                                                    ? 'text-purple-600 dark:text-purple-400'
                                                    : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {tcVsXdpRows.map((row, ri) => (
                                <tr
                                    key={ri}
                                    className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                                >
                                    <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 font-semibold">
                                        {row.cells[0]}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-yellow-600 dark:text-yellow-400">
                                        {row.cells[1]}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-purple-600 dark:text-purple-400">
                                        {row.cells[2]}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-bold text-gray-700 dark:text-gray-300">선택 기준:</span> 단순 DDoS
                    방어·로드밸런싱은 XDP, <T id="netfilter">Netfilter</T> 연동이 필요하거나 egress 처리가 필요한 복잡한 정책은 TC BPF를
                    사용합니다. 두 가지를 함께 사용하는 것도 가능합니다.
                </div>
            </Section>

            {/* 8.8 실무 활용 사례 */}
            <Section id="s88" title="8.8  실무 활용 사례">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {useCases.map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3 hover:shadow-lg transition-shadow"
                        >
                            <div>
                                <div className="text-xs font-mono font-bold mb-0.5" style={{ color: card.accentColor }}>
                                    {card.title}
                                </div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs">{card.subtitle}</div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                {card.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {card.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                        style={{
                                            background: card.accentColor + (isDark ? '22' : '11'),
                                            color: card.accentColor,
                                            border: `1px solid ${card.accentColor}44`,
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 8.9 bcc Tools */}
            <Section id="s89" title="8.9  bcc Tools — 즉시 사용 가능한 eBPF 도구">
                <Prose>
                    <T id="bcc">BCC</T>(BPF Compiler Collection)는 <T id="ebpf">eBPF</T> 기반 관찰 도구 모음입니다. 커널 컴파일 없이
                    실시간으로 시스템 내부를 관찰합니다.
                </Prose>
                <InfoTable headers={['도구', '기능', '사용 예시']} rows={bccToolRows} />
                <CodeBlock code={snippets.bccToolsCode} language="bash" filename="# bcc tools 실전 사용" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                        {
                            title: 'kprobe',
                            color: '#f59e0b',
                            items: [
                                '임의 커널 함수에 동적 훅',
                                '함수 시그니처가 바뀌면 깨짐',
                                '강력하지만 커널 버전 의존',
                                '예: kprobe/tcp_connect, kretprobe/vfs_read',
                            ],
                        },
                        {
                            title: 'tracepoint',
                            color: '#06b6d4',
                            items: [
                                '커널이 명시적으로 제공하는 안정적 훅 포인트',
                                'ABI 안정성 보장',
                                '커널 버전 간 이식 가능',
                                '예: tracepoint:syscalls:sys_enter_read, tracepoint:net:netif_rx',
                            ],
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-lg px-4 py-3 space-y-2"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold text-sm" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <ul className="space-y-1">
                                {card.items.map((item, i) => (
                                    <li key={i} className="text-gray-600 dark:text-gray-400 leading-snug flex gap-1.5">
                                        <span style={{ color: card.color }} className="shrink-0">
                                            ·
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 8.10 AF_XDP */}
            <Section id="s810" title="8.10  AF_XDP — 유저공간 패킷 처리">
                <Prose>
                    AF_XDP는 <T id="xdp">XDP</T>가 받은 패킷을 커널 네트워크 스택을 완전히 우회하고 유저공간에서 직접
                    처리하는 소켓 타입입니다. DPDK에 근접한 성능을 표준 커널 인터페이스로 달성합니다.
                </Prose>

                {/* XDP_REDIRECT → AF_XDP 흐름 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {[
                        {
                            step: '단계 1',
                            color: '#3b82f6',
                            desc: 'NIC가 패킷 수신 → XDP 프로그램이 XDP_REDIRECT로 AF_XDP 소켓으로 전달',
                        },
                        {
                            step: '단계 2',
                            color: '#10b981',
                            desc: '패킷이 UMEM(유저공간이 mmap한 메모리)에 직접 기록 → 복사 없음',
                        },
                        {
                            step: '단계 3',
                            color: '#f59e0b',
                            desc: '유저 프로그램이 ring buffer를 폴링해 패킷 처리 → 커널 syscall 최소화',
                        },
                    ].map((item) => (
                        <div
                            key={item.step}
                            className="rounded-lg px-4 py-3 space-y-1.5"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold" style={{ color: item.color }}>
                                {item.step}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 leading-snug">{item.desc}</div>
                        </div>
                    ))}
                </div>

                {/* DPDK vs AF_XDP 비교 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {[
                        {
                            title: 'DPDK',
                            color: '#ef4444',
                            items: [
                                '커널 드라이버 완전 우회 (PMD)',
                                '최고 성능 (100Mpps+)',
                                'NIC를 독점, 커널 네트워크 스택 불가',
                                '별도 라이브러리, 높은 진입 장벽',
                            ],
                        },
                        {
                            title: 'AF_XDP',
                            color: '#06b6d4',
                            items: [
                                '커널 드라이버 유지, 스택과 공존 가능',
                                '매우 높은 성능 (수십 Mpps)',
                                '특정 큐만 유저공간 처리, 나머지는 일반 스택',
                                '표준 소켓 API, 비교적 쉬운 통합',
                            ],
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-lg px-4 py-3 space-y-2"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold text-sm" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <ul className="space-y-1">
                                {card.items.map((item, i) => (
                                    <li key={i} className="text-gray-600 dark:text-gray-400 leading-snug flex gap-1.5">
                                        <span style={{ color: card.color }} className="shrink-0">
                                            ·
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <CodeBlock code={snippets.afXdpCode} language="c" filename="# AF_XDP 소켓 기본 구조" />

                {/* 실사용 사례 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {[
                        {
                            title: '고성능 로드밸런서',
                            color: '#06b6d4',
                            desc: 'Cloudflare의 Unimog — AF_XDP로 L4 로드밸런싱, DPDK 불필요',
                        },
                        {
                            title: '패킷 캡처',
                            color: '#8b5cf6',
                            desc: 'AF_XDP 기반 tcpdump 대체 — 패킷 손실 없는 고속 캡처',
                        },
                        {
                            title: '유저공간 방화벽',
                            color: '#f59e0b',
                            desc: 'XDP_REDIRECT로 선택적 패킷 전달, 나머지는 커널 스택 유지',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-lg px-4 py-3 space-y-1.5"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 leading-snug">{card.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 8.11 seccomp-BPF */}
            <Section id="s811" title="8.11  seccomp-BPF — 시스템 콜 필터링">
                <Prose>
                    <T id="seccomp">seccomp</T>(Secure Computing)은 프로세스가 사용할 수 있는 시스템 콜을 제한하는 Linux 보안 기능입니다.
                    seccomp-BPF는 BPF 프로그램으로 허용/거부 규칙을 정밀하게 표현합니다. Docker, Chrome, systemd의 보안
                    기반입니다.
                </Prose>

                {/* 동작 원리 */}
                <div
                    className="rounded-lg px-4 py-3 text-xs font-mono space-y-1"
                    style={{
                        background: isDark ? '#1e293b' : '#f8fafc',
                        border: '1px solid ' + (isDark ? '#334155' : '#e2e8f0'),
                    }}
                >
                    {[
                        { text: '프로세스가 syscall 호출', indent: 0, color: isDark ? '#e2e8f0' : '#1e293b' },
                        {
                            text: '→ 커널이 seccomp BPF 프로그램 실행',
                            indent: 1,
                            color: isDark ? '#94a3b8' : '#475569',
                        },
                        {
                            text: '→ 프로그램이 syscall 번호와 인자 검사',
                            indent: 1,
                            color: isDark ? '#94a3b8' : '#475569',
                        },
                        { text: '→ ALLOW: 정상 실행', indent: 2, color: '#22c55e' },
                        { text: '→ KILL:  프로세스 즉시 종료 (SIGSYS)', indent: 2, color: '#ef4444' },
                        { text: '→ ERRNO: 에러 반환 (실제 실행 안 함)', indent: 2, color: '#f59e0b' },
                        { text: '→ TRAP:  SIGSYS로 유저공간 핸들러 호출', indent: 2, color: '#8b5cf6' },
                    ].map((line, i) => (
                        <div key={i} style={{ paddingLeft: `${line.indent * 1.5}rem`, color: line.color }}>
                            {line.text}
                        </div>
                    ))}
                </div>

                <CodeBlock code={snippets.seccompBpfCode} language="c" filename="# seccomp-BPF 적용" />
                <CodeBlock code={snippets.seccompDockerCode} language="bash" filename="# Docker / libseccomp 실전" />

                {/* 실사용 사례 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {[
                        {
                            title: 'Docker / K8s',
                            color: '#06b6d4',
                            desc: '기본 seccomp 프로파일로 위험한 syscall(ptrace, mount 등) 차단. 컨테이너 탈출 방어',
                        },
                        {
                            title: 'Chrome / Firefox',
                            color: '#f59e0b',
                            desc: '렌더러 프로세스에 seccomp 적용. 렌더링에 필요한 syscall만 허용 → 샌드박스',
                        },
                        {
                            title: 'systemd',
                            color: '#8b5cf6',
                            desc: '서비스별 SystemCallFilter= 설정. 웹서버가 reboot() 호출 불가',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-lg px-4 py-3 space-y-1.5"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 leading-snug">{card.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 8.12 bpftrace */}
            <Section id="s812" title="8.12  bpftrace — 커널 추적 원라이너">
                <Prose>
                    <T id="bpftrace">bpftrace</T>는 DTrace에서 영감을 받은 고수준 커널 추적 언어입니다. <T id="ebpf">eBPF</T> 프로그램을
                    자동으로 생성해 kprobe, uprobe, tracepoint, USDT를 단 한 줄 명령으로 탐색할 수 있습니다.{' '}
                    <code>bpftool</code>, <code>bcc</code>와 함께 현대 리눅스 관측성(observability)의 핵심 도구입니다.
                </Prose>

                {/* 프로브 유형 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {bpftraceProbeCards.map((card) => (
                        <div
                            key={card.title}
                            className="rounded-lg px-4 py-3 space-y-1.5"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <div className="text-gray-600 dark:text-gray-400 leading-snug">{card.desc}</div>
                        </div>
                    ))}
                </div>

                {/* 원라이너 예시 */}
                <CodeBlock code={snippets.bpftraceOnelinersCode} language="bash" filename="# bpftrace 실용 원라이너" />

                {/* 문법 핵심 요소 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800 text-xs overflow-hidden">
                    <div className="grid grid-cols-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 font-semibold text-gray-700 dark:text-gray-300">
                        <span>문법 요소</span>
                        <span>설명</span>
                    </div>
                    {bpftraceSyntaxCards.map((row) => (
                        <div
                            key={row.label}
                            className="grid grid-cols-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                            <code className="text-blue-600 dark:text-blue-400">{row.label}</code>
                            <span className="text-gray-600 dark:text-gray-400">{row.desc}</span>
                        </div>
                    ))}
                </div>

                {/* bcc / bpftool 비교 */}
                <InfoTable headers={['도구', '특징']} rows={bpftraceVsBccRows} />
            </Section>

            <Section id="s813" title="8.13  관련 커널 파라미터">
                <Prose>
                    XDP와 eBPF 동작에 영향을 미치는 주요 커널 파라미터입니다.
                    보안과 성능 사이의 균형을 조절할 때 활용합니다.
                </Prose>
                <InfoTable headers={['파라미터', '기본값', '설명']} rows={bpfKernelParamRows} />
                <CodeBlock code={snippets.bpfKernelParamCode} language="bash" filename="# XDP/eBPF 관련 파라미터 확인" />
            </Section>

            <TopicNavigation topicId="08-xdp-ebpf" />
        </div>
    )
}
