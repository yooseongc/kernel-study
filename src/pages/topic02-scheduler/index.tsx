import * as snippets from './codeSnippets'
import { KernelRef } from '../../components/ui/KernelRef'
import { ProcessStateDiagram } from '../../components/concepts/scheduler/ProcessStateDiagram'
import { CfsTreeViz } from '../../components/concepts/scheduler/CfsTreeViz'
import { ContextSwitchViz } from '../../components/concepts/scheduler/ContextSwitchViz'
import { CgroupTreeViz } from '../../components/concepts/scheduler/CgroupTreeViz'
import { Alert, AnimatedDiagram, CodeBlock, InfoBox, InfoTable, Prose, Section, T , TopicPage , SubSection , InlineCode , CardGrid } from '@study-ui/components'
import type { TableColumn } from '@study-ui/components'

// ── 2.7 컨텍스트 스위치 steps ───────────────────────────────────────────────
const contextSwitchSteps = [
    {
        label: '① Process A 실행 중',
        description:
            'CPU가 Process A의 코드를 실행하고 있습니다. 레지스터(PC, SP, 범용 레지스터)는 모두 A의 상태입니다.',
    },
    {
        label: '② 타이머 인터럽트 발생',
        description: '10ms마다 발생하는 타이머 IRQ가 CPU를 가로챕니다. 커널의 인터럽트 핸들러가 실행됩니다.',
    },
    {
        label: '③ Process A 컨텍스트 저장',
        description:
            'switch_to() 매크로가 현재 레지스터 값을 A의 task_struct.thread에 저장합니다. A의 vruntime이 증가합니다.',
    },
    {
        label: '④ CFS — 다음 프로세스 선택',
        description: 'pick_next_task_fair()가 런큐 RB트리에서 가장 왼쪽 노드(최소 vruntime)를 O(1)로 선택합니다.',
    },
    {
        label: '⑤ Process B 컨텍스트 복원',
        description:
            'B의 task_struct.thread에서 레지스터를 CPU에 로드합니다. 페이지 테이블도 B의 것으로 교체(CR3 레지스터)됩니다.',
    },
    {
        label: '⑥ Process B 실행 중',
        description: 'CPU가 B가 마지막으로 실행하던 지점(PC가 가리키는 명령)부터 재개합니다. A는 런큐에서 대기합니다.',
    },
]

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────
export default function Topic02Scheduler() {
    return (
        <TopicPage topicId="02-scheduler" learningItems={[
                    'task_struct 구조체가 프로세스와 스레드를 어떻게 통일 표현하는지 이해합니다',
                    'CFS(Completely Fair Scheduler)의 가중치·vruntime 계산 방식을 배웁니다',
                    '컨텍스트 스위치 시 CPU 레지스터와 메모리 컨텍스트가 어떻게 교환되는지 파악합니다',
                ]}>
            {/* Header */}

            {/* 2.1 프로세스와 스레드 */}
            <Section id="s21" title="2.1  프로세스와 스레드">
                <Prose>
                    리눅스 커널의 관점에서 프로세스와 스레드는 근본적으로 같은 존재입니다. 둘 다{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                        task_struct
                    </code>
                    로 표현되며, 차이는 오직{' '}
                    <strong className="text-gray-900 dark:text-gray-100">어떤 자원을 공유하느냐</strong>에 있습니다.
                    스레드는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                        clone()
                    </code>{' '}
                    호출 시
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                        CLONE_THREAD
                    </code>{' '}
                    플래그로 생성한 "자원 공유 프로세스"입니다.
                    <div className="mt-2 flex flex-wrap gap-2">
                        <KernelRef path="include/linux/sched.h" sym="task_struct" label="task_struct" />
                        <KernelRef path="kernel/sched/sched.h" sym="sched_entity" label="sched_entity" />
                    </div>
                </Prose>

                {/* 비교 테이블 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            프로세스 vs 스레드 비교
                        </span>
                    </div>
                    <InfoTable
                        headers={[
                            { header: '구분', cellClassName: 'text-gray-500 dark:text-gray-400 font-semibold' },
                            { header: '프로세스', headerClassName: 'text-blue-600 dark:text-blue-400', cellClassName: 'text-gray-700 dark:text-gray-300' },
                            { header: '스레드', headerClassName: 'text-green-600 dark:text-green-400', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        ] satisfies TableColumn[]}
                        rows={[
                            { cells: ['생성 시스템 콜', 'fork()', 'clone(CLONE_THREAD)'] },
                            { cells: ['주소 공간', '독립적 (mm_struct 복사)', '공유 (같은 mm_struct)'] },
                            { cells: ['파일 디스크립터', '독립적 (복사)', '공유'] },
                            { cells: ['신호 처리', '독립적', '같은 스레드 그룹'] },
                            { cells: ['생성 비용', '높음', '낮음'] },
                            { cells: ['PID/TGID', 'PID == TGID', 'PID != TGID (TGID = 메인 스레드)'] },
                        ]}
                    />
                </div>

                {/* 팁 박스 */}
                <Alert variant="tip">
                    리눅스에서 스레드는 특별한 존재가 아닙니다.{' '}
                    <code className="bg-yellow-100 dark:bg-yellow-900/50 px-1 rounded font-mono text-xs">
                        clone()
                    </code>{' '}
                    시스템 콜로 생성된, 자원을 공유하는 프로세스일 뿐입니다.
                </Alert>
            </Section>

            {/* 2.2 task_struct */}
            <Section id="s22" title="2.2  task_struct 심층 탐색">
                <Prose>
                    커널에서 모든 프로세스/스레드는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        task_struct
                    </code>
                    라는 거대한 구조체로 표현됩니다. 실제 커널 소스에서 이 구조체는 수백 개의 필드를 가지며,
                    스케줄링·메모리·파일·시그널 등 모든 정보를 담습니다.
                </Prose>
                <CodeBlock code={snippets.taskStructCode} language="c" filename="include/linux/sched.h" />

                <Prose>
                    스케줄링 핵심은 내부에 포함된{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        sched_entity
                    </code>{' '}
                    구조체에 있습니다. <T id="cfs">CFS</T>가 사용하는{' '}
                    <strong className="text-gray-900 dark:text-gray-100">vruntime</strong>이 여기 저장됩니다.
                </Prose>
                <CodeBlock code={snippets.schedEntityCode} language="c" filename="include/linux/sched.h" />
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="include/linux/sched.h" sym="task_struct" />
                        <KernelRef path="include/linux/sched.h" sym="sched_entity" />
                        <KernelRef path="kernel/fork.c" sym="copy_process" />
                    </div>
                </InfoBox>
            </Section>

            {/* 2.3 프로세스 상태 전이 */}
            <Section id="s23" title="2.3  프로세스 상태 전이">
                <Prose>
                    프로세스는 생애 주기 동안 여러 상태 사이를 전이합니다.
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        task_struct.__state
                    </code>
                    에 현재 상태가 비트 플래그로 저장됩니다.
                </Prose>

                <ProcessStateDiagram />

                {/* 상태 설명 표 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            상태 코드 및 전환 트리거
                        </span>
                    </div>
                    <InfoTable
                        headers={[
                            { header: '상태 (ps)', mono: true, nowrap: true, cellClassName: 'text-blue-600 dark:text-blue-400' },
                            { header: '값', mono: true, nowrap: true, cellClassName: 'text-gray-500 dark:text-gray-400' },
                            { header: '설명', cellClassName: 'text-gray-700 dark:text-gray-300' },
                            { header: '진입 트리거', cellClassName: 'text-green-700 dark:text-green-400' },
                            { header: '탈출 트리거', cellClassName: 'text-orange-600 dark:text-orange-400' },
                        ] satisfies TableColumn[]}
                        rows={[
                            { cells: ['TASK_NEW', '—', '막 생성된 프로세스. 아직 런큐에 없음', 'fork() / clone()', '스케줄러가 런큐에 추가'] },
                            { cells: ['TASK_RUNNING', '0 / R', 'CPU 실행 중 또는 런큐 대기 중', '스케줄러 선택 / 슬립에서 깨어남', 'sleep(), exit(), SIGSTOP'] },
                            { cells: ['TASK_INTERRUPTIBLE', '1 / S', '시그널로 깨울 수 있는 슬립', 'wait_event(), sleep()', '시그널 수신 / 이벤트 완료'] },
                            { cells: ['TASK_UNINTERRUPTIBLE', '2 / D', '시그널로도 못 깨우는 슬립. 블록 I/O 전용', '블록 디바이스 I/O 대기 (디스크 read 등)', 'I/O 완료 (인터럽트)'] },
                            { cells: ['TASK_STOPPED', '4 / T', 'SIGSTOP 또는 디버거(ptrace)에 의해 정지', 'SIGSTOP, ptrace attach', 'SIGCONT 수신'] },
                            { cells: ['EXIT_ZOMBIE', '16 / Z', '종료됐지만 부모가 wait() 미호출. 좀비 상태', 'exit() 호출', '부모 프로세스의 wait() / waitpid()'] },
                        ]}
                    />
                </div>
            </Section>

            {/* 2.4.0 O(1) 스케줄러 역사 → CFS 전환 이유 */}
            <Section id="s24" title="2.4  스케줄러의 역사 — O(1)에서 CFS로">
                <Prose>
                    리눅스 스케줄러는 커널 2.6 시절의 O(1) 스케줄러에서 2.6.23(2007년)부터 <T id="cfs">CFS</T>로
                    교체되었습니다. 두 접근 방식의 차이를 이해하면 <T id="cfs">CFS</T> 설계 철학을 더 명확히 파악할 수
                    있습니다.
                </Prose>

                <CardGrid cols={2}>
                    {/* O(1) 스케줄러 */}
                    <div className="rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20 p-4 space-y-3">
                        <div className="font-semibold text-orange-800 dark:text-orange-300">
                            O(1) 스케줄러 (커널 2.6 ~ 2.6.22)
                        </div>
                        <div className="text-xs text-orange-700 dark:text-orange-400 leading-relaxed space-y-1.5">
                            <p>
                                140개의 우선순위 큐 배열을 유지. 비트맵으로 비어있지 않은 최고 우선순위 큐를 즉시 선택 →
                                런큐 선택이 O(1).
                            </p>
                            <p>
                                <strong>문제점:</strong> 인터랙티브 프로세스(게임·멀티미디어)와 배치 프로세스를 구분하는
                                휴리스틱 로직이 매우 복잡했습니다. 수면/실행 비율로 인터랙티브성을 추정했지만 엣지
                                케이스에서 불규칙한 레이턴시가 발생했습니다.
                            </p>
                            <p>Ingo Molnar가 작성, 2001~2007년 사용.</p>
                        </div>
                        <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-2.5 font-mono text-xs text-orange-800 dark:text-orange-300">
                            <div>우선순위 큐 ×140 + 비트맵</div>
                            <div className="text-orange-500 dark:text-orange-500">→ 인터랙티브 휴리스틱 복잡도 ↑</div>
                        </div>
                    </div>

                    {/* CFS */}
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
                        <div className="font-semibold text-blue-800 dark:text-blue-300">
                            CFS — Completely Fair Scheduler (2.6.23+)
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed space-y-1.5">
                            <p>
                                Red-Black 트리를 vruntime 기준으로 정렬. 가장 왼쪽 노드(최소 vruntime)가 항상 다음 실행
                                대상.
                            </p>
                            <p>
                                <strong>공정성 원칙:</strong> 모든 프로세스가 이상적으로 동시에 실행되는 것처럼
                                vruntime을 균등하게 증가시킵니다. 인터랙티브·배치 구분 없이 단일 알고리즘으로 처리.
                            </p>
                            <p>Con Kolivas의 SD 스케줄러 아이디어를 Ingo Molnar가 발전시켜 메인라인에 통합.</p>
                        </div>
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2.5 font-mono text-xs text-blue-800 dark:text-blue-300">
                            <div>Red-Black 트리 (vruntime 정렬)</div>
                            <div className="text-blue-500 dark:text-blue-500">→ 단일 알고리즘, 공정성 보장</div>
                        </div>
                    </div>
                </CardGrid>
            </Section>

            {/* 2.5 CFS 스케줄러 */}
            <Section id="s25_cfs" title="2.5  CFS 스케줄러 — vruntime과 Red-Black 트리">
                <Prose>
                    <T id="cfs">CFS</T>(Completely Fair Scheduler)는 모든 프로세스에게 공정한 CPU 시간을 주기 위해{' '}
                    <strong className="text-gray-900 dark:text-gray-100">vruntime(가상 실행 시간)</strong>을 사용합니다.
                    vruntime이 가장 작은 프로세스 = 가장 덜 실행된 프로세스 = 다음 실행 대상. 이를 빠르게 찾기 위해{' '}
                    <strong className="text-gray-900 dark:text-gray-100"><T id="red_black_tree">Red-Black 트리</T>(자가 균형 BST)</strong>를
                    사용합니다. 트리의 가장 왼쪽 노드가 항상 다음 실행 대상입니다.
                </Prose>

                <Alert variant="tip">
                    vruntime은 실제 실행 시간을 nice 값(우선순위)으로 보정한 값입니다. nice=-20(높은 우선순위)은
                    vruntime이 천천히 증가하고, nice=+19(낮은 우선순위)는 빠르게 증가합니다.
                </Alert>

                <CfsTreeViz />

                {/* nice / priority / weight 관계 */}
                <SubSection>nice / priority / weight — CFS 핵심 수식</SubSection>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    nice 값은 프로세스의 상대적 CPU 우선순위를 나타냅니다.{' '}
                    <strong className="text-gray-900 dark:text-gray-100">
                        -20이 최고 우선순위, +19가 최저 우선순위
                    </strong>
                    이며, 커널은 이를 내부적으로 weight(가중치)로 변환하여 vruntime 증가 속도를 조절합니다.
                </p>

                <CardGrid cols={2}>
                    {/* nice → weight 테이블 */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                nice → weight 변환 (대표값)
                            </span>
                        </div>
                        <InfoTable
                            headers={[
                                { header: 'nice', mono: true, cellClassName: 'text-purple-600 dark:text-purple-400' },
                                { header: 'weight', align: 'text-right', mono: true, cellClassName: 'text-gray-900 dark:text-gray-100' },
                                { header: '상대 비율', align: 'text-right', mono: true, cellClassName: 'text-green-600 dark:text-green-400' },
                            ] satisfies TableColumn[]}
                            rows={[
                                { cells: ['-20', '88761', '×86.7'] },
                                { cells: ['-10', '9548', '×9.3'] },
                                { cells: ['0 (기본)', '1024', '×1.0'] },
                                { cells: ['+10', '110', '×0.11'] },
                                { cells: ['+19', '15', '×0.015'] },
                            ]}
                            rowClassName={(row) => row.cells[0] === '0 (기본)' ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
                        />
                    </div>

                    {/* vruntime 공식 설명 */}
                    <div className="space-y-3">
                        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/20 p-4">
                            <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">
                                vruntime 계산 공식
                            </div>
                            <div className="rounded-lg bg-indigo-100 dark:bg-indigo-900/40 p-3 font-mono text-xs text-indigo-900 dark:text-indigo-200 text-center">
                                vruntime += delta_exec × (NICE_0_LOAD / weight)
                            </div>
                            <ul className="mt-3 text-xs text-indigo-700 dark:text-indigo-400 space-y-1.5 leading-relaxed">
                                <li>
                                    • <strong>NICE_0_LOAD = 1024</strong> (nice 0의 기준 weight)
                                </li>
                                <li>
                                    • weight가 클수록(낮은 nice) vruntime 증가가 <strong>느림</strong> → 더 많이 실행
                                </li>
                                <li>
                                    • weight가 작을수록(높은 nice) vruntime 증가가 <strong>빠름</strong> → 덜 실행
                                </li>
                                <li>• nice 값 1 차이 ≈ CPU 시간 약 10% 차이</li>
                            </ul>
                        </div>
                    </div>
                </CardGrid>

                <CodeBlock code={snippets.prioToWeightCode} language="c" filename="kernel/sched/fair.c" />
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="kernel/sched/fair.c" sym="pick_next_task_fair" />
                        <KernelRef path="kernel/sched/fair.c" sym="update_curr" />
                        <KernelRef path="kernel/sched/sched.h" sym="cfs_rq" />
                    </div>
                </InfoBox>
            </Section>

            {/* Run Queue */}
            <Section id="s26_rq" title="2.6  Run Queue — Per-CPU 실행 대기열">
                <Prose>
                    CFS가 "다음에 실행할 태스크"를 선택하는 곳이 바로 <strong className="text-gray-800 dark:text-gray-200">
                    Run Queue(rq)</strong> <KernelRef path="kernel/sched/sched.h" sym="rq" />입니다.
                    각 CPU는 자신만의 run queue를 갖고 있으며, 이 안에 CFS run queue(cfs_rq), RT run queue(rt_rq),
                    Deadline run queue(dl_rq) 등이 포함됩니다.
                </Prose>
                <CodeBlock code={`/* kernel/sched/sched.h — Per-CPU Run Queue */
struct rq {
    unsigned int         nr_running;    /* 이 CPU에서 실행 가능한 태스크 수 */
    struct cfs_rq        cfs;           /* CFS 스케줄러의 Red-Black 트리 */
    struct rt_rq         rt;            /* RT 스케줄러의 우선순위 큐 */
    struct dl_rq         dl;            /* Deadline 스케줄러의 큐 */
    struct task_struct  *curr;          /* 현재 실행 중인 태스크 */
    struct task_struct  *idle;          /* 유휴 태스크 (swapper) */
    u64                  clock;         /* rq 로컬 클럭 */
    spinlock_t           __lock;        /* rq 접근 보호 잠금 */
    /* ... */
};

/* CFS Run Queue — vruntime 기반 Red-Black 트리 */
struct cfs_rq {
    struct rb_root_cached tasks_timeline; /* RB 트리 (leftmost 캐싱) */
    unsigned int          nr_running;     /* CFS에 등록된 태스크 수 */
    u64                   min_vruntime;   /* 트리 내 최소 vruntime */
    struct sched_entity  *curr;           /* 현재 실행 중인 엔티티 */
    /* ... */
};`} language="c" filename="kernel/sched/sched.h" />
                <InfoTable
                    headers={['구성 요소', '역할', '선택 알고리즘']}
                    rows={[
                        { cells: ['cfs_rq', '일반 태스크 (SCHED_NORMAL/BATCH)', 'vruntime 최소인 태스크 선택 — O(1) leftmost'] },
                        { cells: ['rt_rq', '실시간 태스크 (SCHED_FIFO/RR)', '고정 우선순위 0~99 중 가장 높은 태스크'] },
                        { cells: ['dl_rq', '데드라인 태스크 (SCHED_DEADLINE)', '마감이 가장 가까운 태스크 (EDF)'] },
                    ]}
                />
                <Prose>
                    스케줄러가 <code className="bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono">
                    __schedule()</code>을 호출하면, 먼저 dl_rq → rt_rq → cfs_rq 순서로 확인하여 가장 우선순위가 높은
                    태스크를 선택합니다. CFS 태스크는 cfs_rq의 Red-Black 트리에서 leftmost 노드(vruntime 최소)를 O(1)로 꺼냅니다.
                </Prose>
                <Prose>
                    <strong className="text-gray-800 dark:text-gray-200">로드 밸런싱</strong>: 멀티코어 환경에서 각 CPU의 rq에
                    태스크가 편중되면 성능이 저하됩니다. 커널의 load balancer가 주기적으로 CPU 간 태스크를 이동(migration)하여
                    부하를 균등하게 분산합니다. <code className="bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono">
                    /proc/schedstat</code>에서 각 CPU의 run queue 통계를 확인할 수 있습니다.
                </Prose>
                <CodeBlock code={`# Per-CPU run queue 상태 확인
cat /proc/schedstat
# cpu0: 실행 횟수, 대기 시간, 타임슬라이스 등

# 특정 프로세스의 스케줄링 정보
cat /proc/<pid>/sched
# se.vruntime         : 12345678.901234
# nr_switches          : 5678
# nr_voluntary_switches: 4000  (자발적 양보)
# nr_involuntary_switches: 1678  (타임슬라이스 만료)

# 실시간 run queue 길이 모니터
cat /proc/loadavg
# 0.15 0.10 0.05 2/150 1234
# (1분/5분/15분 평균, 실행중/전체 스레드, 최근 PID)`} language="bash" filename="# run queue 상태 확인" />
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="kernel/sched/sched.h" sym="rq" />
                        <KernelRef path="kernel/sched/core.c" sym="__schedule" />
                        <KernelRef path="kernel/sched/fair.c" sym="pick_next_task_fair" />
                    </div>
                </InfoBox>
            </Section>

            {/* 2.7 컨텍스트 스위치 */}
            <Section id="s27" title="2.7  컨텍스트 스위치 단계별 애니메이션">
                <Prose>
                    <T id="context_switch">컨텍스트 스위치</T>는 커널이 현재 실행 중인 프로세스를 바꾸는 과정입니다. CPU
                    레지스터 전체를 저장하고 복원해야 하므로 일반 함수 호출보다 수백~수천 배 비쌉니다. 아래
                    애니메이션으로 각 단계를 살펴보세요.
                </Prose>
                <AnimatedDiagram
                    steps={contextSwitchSteps}
                    renderStep={(step) => <ContextSwitchViz step={step} />}
                    autoPlayInterval={2500}
                />
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="kernel/sched/core.c" sym="__schedule" />
                        <KernelRef path="kernel/sched/core.c" sym="context_switch" />
                        <KernelRef path="arch/x86/entry/entry_64.S" label="entry_64.S" />
                    </div>
                </InfoBox>
            </Section>

            {/* 2.5.1 __schedule() 콜스택 */}
            <Section id="s271" title="2.7.1  __schedule() 콜스택 분석">
                <Prose>
                    자발적·비자발적 <T id="context_switch">컨텍스트 스위치</T> 모두{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        __schedule()
                    </code>
                    을 공통 진입점으로 사용합니다. 내부에서{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        pick_next_task()
                    </code>
                    가 스케줄러 클래스를{' '}
                    <strong className="text-gray-900 dark:text-gray-100">
                        STOP → DEADLINE → RT → CFS(FAIR) → IDLE
                    </strong>{' '}
                    순서로 탐색하여 다음 실행할 태스크를 결정합니다.
                </Prose>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs text-center">
                    {[
                        { label: 'STOP', color: 'red', desc: '마이그레이션\n스레드' },
                        { label: 'DEADLINE', color: 'orange', desc: 'EDF 실시간\n태스크' },
                        { label: 'RT', color: 'yellow', desc: 'FIFO / RR\n실시간' },
                        { label: 'CFS (FAIR)', color: 'blue', desc: '일반 프로세스\n대부분 여기' },
                        { label: 'IDLE', color: 'gray', desc: '실행할\n태스크 없을 때' },
                    ].map(({ label, color, desc }, i) => (
                        <div
                            key={label}
                            className={`rounded-xl border p-3 space-y-1.5
              ${color === 'red' ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20' : ''}
              ${color === 'orange' ? 'border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/20' : ''}
              ${color === 'yellow' ? 'border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-950/20' : ''}
              ${color === 'blue' ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20' : ''}
              ${color === 'gray' ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900' : ''}
            `}
                        >
                            <div
                                className={`font-bold font-mono
                ${color === 'red' ? 'text-red-700 dark:text-red-300' : ''}
                ${color === 'orange' ? 'text-orange-700 dark:text-orange-300' : ''}
                ${color === 'yellow' ? 'text-yellow-700 dark:text-yellow-300' : ''}
                ${color === 'blue' ? 'text-blue-700 dark:text-blue-300' : ''}
                ${color === 'gray' ? 'text-gray-500 dark:text-gray-400' : ''}
              `}
                            >
                                {i + 1}. {label}
                            </div>
                            <div
                                className={`leading-relaxed whitespace-pre-line
                ${color === 'red' ? 'text-red-600 dark:text-red-400' : ''}
                ${color === 'orange' ? 'text-orange-600 dark:text-orange-400' : ''}
                ${color === 'yellow' ? 'text-yellow-600 dark:text-yellow-400' : ''}
                ${color === 'blue' ? 'text-blue-600 dark:text-blue-400' : ''}
                ${color === 'gray' ? 'text-gray-400 dark:text-gray-500' : ''}
              `}
                            >
                                {desc}
                            </div>
                        </div>
                    ))}
                </div>

                <CodeBlock code={snippets.scheduleCode} language="c" filename="kernel/sched/core.c" />
            </Section>

            {/* 2.6 CPU Affinity와 CPU Pinning */}
            <Section id="s28" title="2.8  CPU Affinity와 CPU Pinning">
                <Prose>
                    기본적으로 <T id="cfs">CFS</T>는 런큐에서 어느 CPU든 프로세스를 실행할 수 있습니다. 하지만{' '}
                    <strong className="text-gray-900 dark:text-gray-100">CPU affinity(CPU 친화성)</strong>를 설정하면
                    특정 프로세스가 실행될 수 있는 CPU를 제한할 수 있습니다. 커널 내부적으로{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        task_struct.cpus_mask
                    </code>
                    에 비트마스크로 저장됩니다.
                </Prose>

                <CardGrid cols={2}>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                설정 방법
                            </span>
                        </div>
                        <InfoTable
                            headers={[
                                { header: '방법', mono: true, cellClassName: 'text-blue-600 dark:text-blue-400' },
                                { header: '사용', cellClassName: 'text-gray-600 dark:text-gray-400' },
                            ] satisfies TableColumn[]}
                            rows={[
                                { cells: ['taskset -c 0,1 ./app', 'CPU 0·1에서만 실행'] },
                                { cells: ['taskset -p 0x3 <pid>', '실행 중 프로세스 변경'] },
                                { cells: ['sched_setaffinity()', '프로그램 내에서 직접 설정'] },
                                { cells: ['cgroups cpuset', '컨테이너/그룹 단위 격리'] },
                                { cells: ['numactl --cpunodebind=0', 'NUMA 노드 단위 바인딩'] },
                            ]}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 p-4">
                            <div className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                                CPU Pinning 사용 사례
                            </div>
                            <ul className="text-xs text-green-700 dark:text-green-400 space-y-1.5 leading-relaxed">
                                <li>
                                    • <strong>네트워크 패킷 처리</strong>: NIC 인터럽트와 같은 CPU에 수신 스레드 고정 →
                                    cache miss 최소화
                                </li>
                                <li>
                                    • <strong>실시간 오디오/영상</strong>: 전용 CPU로 레이턴시 jitter 제거
                                </li>
                                <li>
                                    • <strong>NUMA 최적화</strong>: 메모리가 있는 노드의 CPU에 프로세스 고정
                                </li>
                                <li>
                                    • <strong>인터럽트 격리</strong>:{' '}
                                    <code className="font-mono bg-green-100 dark:bg-green-900/40 px-1 rounded">
                                        /proc/irq/N/smp_affinity
                                    </code>
                                    와 함께 사용
                                </li>
                            </ul>
                        </div>
                        <Alert variant="warning">
                            CPU를 너무 좁게 고정하면 과부하 시 다른 CPU로 분산이 불가능해집니다. 프로덕션에서는
                            모니터링과 함께 적용하세요.
                        </Alert>
                    </div>
                </CardGrid>
            </Section>

            {/* 2.7 SMP와 NUMA */}
            <Section id="s29" title="2.9  SMP와 NUMA — 멀티코어 환경의 스케줄링">
                <Prose>
                    현대 서버는 단일 CPU가 아닙니다. 리눅스 스케줄러는 멀티코어·멀티소켓 환경을 지원하기 위해
                    <strong className="text-gray-900 dark:text-gray-100"> SMP</strong>와{' '}
                    <strong className="text-gray-900 dark:text-gray-100"><T id="numa">NUMA</T></strong>를 이해해야 합니다.
                </Prose>

                <CardGrid cols={2}>
                    {/* SMP */}
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
                        <div className="font-semibold text-blue-800 dark:text-blue-300">
                            SMP — Symmetric Multi-Processing
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed space-y-1.5">
                            <p>
                                모든 CPU 코어가 동일한 물리 메모리를 공유하는 구조. 서버 한 소켓 내부의 일반적인 형태.
                            </p>
                            <p>
                                커널은 CPU마다 독립적인 <strong>런큐(run queue)</strong>를 유지합니다.{' '}
                                <T id="cfs">CFS</T>는 주기적으로 런큐 간 <strong>load balancing</strong>을 수행해 부하를
                                균등하게 분산합니다.
                            </p>
                            <p>런큐 간 태스크 이전 비용: 캐시 미스(L1/L2 재적재) 발생.</p>
                        </div>
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2.5 font-mono text-xs text-blue-800 dark:text-blue-300">
                            <div className="font-semibold mb-1"># 현재 런큐 상태 확인</div>
                            <div>cat /proc/sched_debug</div>
                            <div>watch -n1 mpstat -P ALL</div>
                        </div>
                    </div>

                    {/* NUMA */}
                    <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/20 p-4 space-y-3">
                        <div className="font-semibold text-purple-800 dark:text-purple-300">
                            NUMA — Non-Uniform Memory Access
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed space-y-1.5">
                            <p>
                                멀티소켓 서버에서 각 CPU 소켓은 자신만의 <strong>로컬 메모리</strong>를 갖습니다. 다른
                                소켓의 메모리(원격 메모리) 접근은 수백 ns 느립니다.
                            </p>
                            <p>
                                커널의 <strong>NUMA balancer</strong>는 프로세스가 자주 접근하는 메모리를 해당 CPU의
                                로컬 노드로 마이그레이션합니다.
                            </p>
                            <p>잘못된 NUMA 배치는 네트워크/DB 성능을 30~40% 저하시킬 수 있습니다.</p>
                        </div>
                        <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2.5 font-mono text-xs text-purple-800 dark:text-purple-300">
                            <div className="font-semibold mb-1"># NUMA 토폴로지 확인</div>
                            <div>numactl --hardware</div>
                            <div>numastat -p &lt;pid&gt;</div>
                        </div>
                    </div>
                </CardGrid>

                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            SMP vs NUMA 비교
                        </span>
                    </div>
                    <InfoTable
                        headers={[
                            { header: '항목', cellClassName: 'text-gray-600 dark:text-gray-400 font-semibold' },
                            { header: 'SMP', headerClassName: 'text-blue-600 dark:text-blue-400', cellClassName: 'text-gray-700 dark:text-gray-300' },
                            { header: 'NUMA', headerClassName: 'text-purple-600 dark:text-purple-400', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        ] satisfies TableColumn[]}
                        rows={[
                            { cells: ['메모리 접근 속도', '균일 (모든 코어 동일)', '비균일 (로컬 빠름, 원격 느림)'] },
                            { cells: ['일반 적용 범위', '단일 소켓 멀티코어', '멀티 소켓 서버'] },
                            { cells: ['커널 런큐', 'CPU당 1개', 'CPU당 1개 + NUMA node 그루핑'] },
                            { cells: ['스케줄러 최적화', 'Load balancing', 'NUMA balancing + memory migration'] },
                            { cells: ['실무 예시', '일반 데스크탑/서버', '고성능 서버 (EPYC, Xeon SP)'] },
                        ]}
                    />
                </div>
            </Section>

            {/* 2.8 RT 스케줄러 */}
            <Section id="s210" title="2.10  RT 스케줄러 — SCHED_FIFO와 SCHED_RR">
                <Prose>
                    <T id="cfs">CFS</T>는 공정성(fairness)을 목표로 하지만, 일부 태스크는{' '}
                    <strong className="text-gray-900 dark:text-gray-100">데드라인 보장</strong>이 필요합니다. 리눅스
                    커널은 <T id="cfs">CFS</T> 외에 Real-Time 스케줄러를 제공합니다. RT 태스크는 <T id="cfs">CFS</T>{' '}
                    태스크보다 <em>항상</em> 먼저 실행됩니다.
                </Prose>

                {/* 스케줄러 클래스 계층 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            스케줄러 클래스 우선순위 (높음 → 낮음)
                        </span>
                    </div>
                    <InfoTable
                        headers={['정책', '우선순위 범위', '동작', '사용 사례']}
                        rows={[
                            { cells: [<span key="dl" className="font-mono font-bold text-red-600 dark:text-red-400">SCHED_DEADLINE</span>, '—', 'EDF 기반. 주기·데드라인·실행시간 명시', '실시간 제어 시스템'] },
                            { cells: [<span key="ff" className="font-mono font-bold text-red-600 dark:text-red-400">SCHED_FIFO</span>, 'RT 1~99', '선점 없음. 더 높은 우선순위 태스크가 나올 때까지 실행', '오디오 서버, 실시간 센서'] },
                            { cells: [<span key="rr" className="font-mono font-bold text-red-600 dark:text-red-400">SCHED_RR</span>, 'RT 1~99', 'FIFO + 타임슬라이스. 같은 우선순위 간 라운드로빈', '같은 우선순위 RT 태스크'] },
                            { cells: [<span key="nr" className="font-mono font-bold text-blue-600 dark:text-blue-400">SCHED_NORMAL (CFS)</span>, '100~139 (nice -20~19)', 'vruntime 기반 공정 스케줄링', '일반 서버/데스크탑 프로세스'] },
                            { cells: [<span key="id" className="text-gray-500 dark:text-gray-500">SCHED_IDLE</span>, '가장 낮음', 'idle 시에만 실행. nice +19보다도 낮음', '백그라운드 배치 작업'] },
                        ]}
                    />
                </div>

                <CardGrid cols={2}>
                    <div className="space-y-3">
                        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4">
                            <div className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                                ⚠️ RT 스케줄러의 위험성
                            </div>
                            <div className="text-xs text-red-700 dark:text-red-400 leading-relaxed space-y-1.5">
                                <p>
                                    <code className="font-mono bg-red-100 dark:bg-red-900/40 px-1 rounded">
                                        SCHED_FIFO
                                    </code>{' '}
                                    태스크가 CPU-bound 루프에 빠지면 다른 모든 CFS 태스크가 굶어 죽습니다(starvation).
                                </p>
                                <p>
                                    이를 방지하기 위해 커널은 <strong>RT throttling</strong>을 적용합니다: 기본적으로
                                    1초 중 950ms만 RT 태스크에 허용 (
                                    <code className="font-mono bg-red-100 dark:bg-red-900/40 px-1 rounded">
                                        /proc/sys/kernel/sched_rt_period_us
                                    </code>
                                    ).
                                </p>
                            </div>
                        </div>
                        <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                            <div className="text-gray-500 dark:text-gray-500 mb-1"># RT 정책으로 프로그램 실행</div>
                            <div>chrt -f 50 ./my_rt_app</div>
                            <div className="mt-1 text-gray-500 dark:text-gray-500"># 현재 프로세스 정책 확인</div>
                            <div>chrt -p &lt;pid&gt;</div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4 space-y-3">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            SCHED_FIFO vs SCHED_RR
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed space-y-3">
                            <div>
                                <div className="font-semibold text-orange-600 dark:text-orange-400 mb-1">
                                    SCHED_FIFO
                                </div>
                                <p>
                                    자발적으로 양보(yield/sleep)하거나, 더 높은 우선순위 RT 태스크가 생기기 전까지 CPU를
                                    독점. 같은 우선순위 태스크와도 공유하지 않음.
                                </p>
                            </div>
                            <div>
                                <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">SCHED_RR</div>
                                <p>
                                    SCHED_FIFO와 동일하지만 같은 우선순위의 RT 태스크끼리는 타임슬라이스(기본 100ms)를
                                    나눠 씁니다. 더 공평한 RT 스케줄링.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardGrid>
            </Section>

            {/* 2.9 cgroups */}
            <Section id="s211" title="2.11  cgroups — 프로세스 자원 제어의 핵심">
                <Prose>
                    <strong className="text-gray-900 dark:text-gray-100">
                        <T id="cgroup">cgroups</T>(Control Groups)
                    </strong>
                    는 프로세스 그룹에 CPU·메모리·I/O·네트워크 등의 자원 제한을 걸 수 있는 커널 기능입니다. Docker,
                    Kubernetes, systemd 모두 <T id="cgroup">cgroups</T> 위에서 동작합니다. 커널 내부에서는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        task_struct.cgroups
                    </code>
                    가 해당 태스크의 cgroup 멤버십을 관리합니다.
                </Prose>

                {/* v1 vs v2 비교 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            cgroup v1 vs v2
                        </span>
                    </div>
                    <InfoTable
                        headers={[
                            { header: '항목', nowrap: true, cellClassName: 'text-gray-600 dark:text-gray-400 font-semibold' },
                            { header: 'v1 (레거시)', cellClassName: 'text-gray-500 dark:text-gray-500' },
                            { header: 'v2 (통합, 권장)', headerClassName: 'text-blue-600 dark:text-blue-400', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        ] satisfies TableColumn[]}
                        rows={[
                            { cells: ['마운트 구조', '서브시스템별 별도 마운트', '단일 통합 계층 (/sys/fs/cgroup/)'] },
                            { cells: ['계층 구조', '서브시스템마다 독립적 트리', '모든 서브시스템이 동일 트리 공유'] },
                            { cells: ['스레드 지원', '스레드별 소속 가능', 'v2.1+에서 thread-mode 지원'] },
                            { cells: ['주요 파일', 'cpu.shares, memory.limit_in_bytes', 'cpu.max, cpu.weight, memory.max'] },
                            { cells: ['현재 지원', '커널 유지, 새 기능 없음', '커널 5.x+ 기본, systemd 244+ 전환'] },
                        ]}
                    />
                </div>

                {/* cgroup 계층 D3 트리 */}
                <CgroupTreeViz />

                {/* 파일시스템 구조 */}
                <CodeBlock code={snippets.cgroupFsCode} language="bash" filename="/sys/fs/cgroup/" />

                {/* 생성/사용 예제 */}
                <CodeBlock code={snippets.cgroupCreateCode} language="bash" filename="cgroup 생성 및 자원 제한 예제" />

                {/* task_struct 연결 */}
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    커널 내부에서 각 태스크는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                        css_set
                    </code>
                    을 통해 여러 서브시스템의 <T id="cgroup">cgroup</T> 상태를 참조합니다. 같은{' '}
                    <T id="cgroup">cgroup</T> 조합을 공유하는 태스크끼리는 동일한 css_set을 재사용합니다.
                </p>
                <CodeBlock
                    code={snippets.cgroupTaskStructCode}
                    language="c"
                    filename="include/linux/sched.h / include/linux/cgroup.h"
                />

                {/* CPU 서브시스템 주요 파일 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            CPU 서브시스템 주요 제어 파일 (v2)
                        </span>
                    </div>
                    <InfoTable
                        headers={[
                            { header: '파일', mono: true, cellClassName: 'text-blue-600 dark:text-blue-400 font-bold' },
                            { header: '형식', mono: true, cellClassName: 'text-green-600 dark:text-green-400' },
                            { header: '의미', cellClassName: 'text-gray-600 dark:text-gray-400' },
                        ] satisfies TableColumn[]}
                        rows={[
                            { cells: ['cpu.max', '"200000 1000000"', 'period(µs) 중 quota만큼 CPU 사용. "max"는 제한 없음'] },
                            { cells: ['cpu.weight', '"100"', '1~10000, 기본 100. CFS cpu.shares의 v2 대체'] },
                            { cells: ['cpu.stat', '읽기 전용', 'usage_usec, throttled_usec 등 통계'] },
                            { cells: ['cpuset.cpus', '"0-3"', '사용할 CPU 코어 범위'] },
                            { cells: ['cpuset.mems', '"0"', 'NUMA 메모리 노드 제한'] },
                        ]}
                    />
                </div>

                <Alert variant="info" title="Docker 컨테이너">
                    내부적으로{' '}
                    <InlineCode></InlineCode>,{' '}
                    <InlineCode></InlineCode>{' '}
                    옵션을 cgroup v2의{' '}
                    <InlineCode></InlineCode>,{' '}
                    <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded font-mono text-xs">
                        memory.max
                    </code>
                    로 변환합니다. Kubernetes의 resource limits도 마찬가지입니다.
                </Alert>
            </Section>

            {/* 2.10 스케줄러 통계와 분석 */}
            <Section id="s212" title="2.12  스케줄러 통계와 분석">
                <Prose>
                    스케줄링 문제(높은 레이턴시, CPU 불균형)는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        /proc/schedstat
                    </code>
                    과{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        /proc/sched_debug
                    </code>
                    로 진단합니다.
                </Prose>

                <CodeBlock
                    code={snippets.schedstatCode}
                    language="bash"
                    filename="# /proc/schedstat — CPU별 스케줄링 통계"
                />
                <CodeBlock code={snippets.schedDebugCode} language="bash" filename="# /proc/sched_debug — 런큐 상태" />

                {/* 로드밸런싱 */}
                <Prose>
                    SMP 시스템에서 특정 CPU만 바쁘고 다른 CPU는 노는 불균형을 방지하기 위해 커널은 주기적으로 런큐를
                    재조정합니다.
                </Prose>

                <CodeBlock
                    code={snippets.loadBalanceCode}
                    language="c"
                    filename="kernel/sched/fair.c — load_balance 핵심"
                />

                {/* 스케줄링 도메인 카드 */}
                <CardGrid cols={3}>
                    <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-2">
                        <div className="font-semibold text-blue-800 dark:text-blue-300 text-sm">
                            SMT (Hyper-Threading)
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                            같은 물리 코어의 논리 CPU들. 캐시 완전 공유. 가장 빠른 마이그레이션.
                        </div>
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1.5 font-mono text-xs text-blue-700 dark:text-blue-300 break-all">
                            /sys/devices/system/cpu/cpu0/topology/thread_siblings
                        </div>
                    </div>

                    <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 p-4 space-y-2">
                        <div className="font-semibold text-green-800 dark:text-green-300 text-sm">MC (Multi-Core)</div>
                        <div className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                            같은 소켓의 코어들. LLC(L3) 공유. 빠른 마이그레이션.
                        </div>
                        <div className="rounded-lg bg-green-100 dark:bg-green-900/30 px-2.5 py-1.5 font-mono text-xs text-green-700 dark:text-green-300 break-all">
                            /sys/devices/system/cpu/cpu0/topology/core_siblings
                        </div>
                    </div>

                    <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/20 p-4 space-y-2">
                        <div className="font-semibold text-purple-800 dark:text-purple-300 text-sm">NUMA Node</div>
                        <div className="text-xs text-purple-700 dark:text-purple-400 leading-relaxed">
                            다른 소켓/메모리 노드. 원격 메모리 접근 비용. 마이그레이션 신중히.
                        </div>
                        <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 px-2.5 py-1.5 font-mono text-xs text-purple-700 dark:text-purple-300">
                            numactl --hardware
                        </div>
                    </div>
                </CardGrid>
            </Section>

            {/* 2.11 SCHED_DEADLINE */}
            <Section id="s213" title="2.13  SCHED_DEADLINE — 실시간 데드라인 스케줄링">
                <Prose>
                    <p>
                        SCHED_FIFO와 SCHED_RR은 고정 우선순위 기반으로 동작하지만, <strong><T id="sched_deadline">SCHED_DEADLINE</T></strong>은 각
                        태스크에 <code>runtime</code> / <code>deadline</code> / <code>period</code>를 명시하여
                        CBS(Constant Bandwidth Server) 알고리즘으로 CPU 대역폭을 수학적으로 보장합니다. EDF(Earliest
                        Deadline First) 정책에 따라 절대 데드라인이 가장 임박한 태스크를 우선 선점하므로, 멀티미디어
                        코덱이나 산업용 제어 루프처럼 실시간 응답이 필수적인 환경에 적합합니다.
                    </p>
                </Prose>

                {/* 3개 파라미터 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-2">
                        <div className="font-semibold text-blue-800 dark:text-blue-300 text-sm font-mono">
                            sched_runtime
                        </div>
                        <div className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                            주기마다 태스크가 사용할 수 있는 <strong>최대 CPU 시간</strong>. 이 값을 소진하면 다음
                            주기까지 실행이 스로틀됩니다.
                        </div>
                        <div className="rounded-lg bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1.5 font-mono text-xs text-blue-700 dark:text-blue-300">
                            예: 5,000,000 ns (5 ms)
                        </div>
                    </div>
                    <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4 space-y-2">
                        <div className="font-semibold text-orange-800 dark:text-orange-300 text-sm font-mono">
                            sched_deadline
                        </div>
                        <div className="text-xs text-orange-700 dark:text-orange-400 leading-relaxed">
                            런타임을 소진해야 하는 <strong>절대 시점 기한</strong>. EDF는 이 값이 가장 작은(가장 임박한)
                            태스크를 먼저 선택합니다.
                        </div>
                        <div className="rounded-lg bg-orange-100 dark:bg-orange-900/40 px-2.5 py-1.5 font-mono text-xs text-orange-700 dark:text-orange-300">
                            예: 10,000,000 ns (10 ms)
                        </div>
                    </div>
                    <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-4 space-y-2">
                        <div className="font-semibold text-green-800 dark:text-green-300 text-sm font-mono">
                            sched_period
                        </div>
                        <div className="text-xs text-green-700 dark:text-green-400 leading-relaxed">
                            태스크 실행 <strong>주기</strong>. runtime / period ≤ 1 조건이 반드시 충족되어야 하며, 위반
                            시 설정이 거부됩니다.
                        </div>
                        <div className="rounded-lg bg-green-100 dark:bg-green-900/40 px-2.5 py-1.5 font-mono text-xs text-green-700 dark:text-green-300">
                            예: 20,000,000 ns (20 ms · 50 Hz)
                        </div>
                    </div>
                </div>

                {/* 정책 비교 표 */}
                <div className="mt-6 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">스케줄링 정책 비교</h3>
                    <InfoTable
                        headers={['정책', '기준', '선점', '용도']}
                        rows={[
                            { cells: ['SCHED_OTHER', 'CFS vruntime', 'CFS', '일반 프로세스'] },
                            { cells: ['SCHED_FIFO', '고정 우선순위', '더 높은 RT만', '단순 RT'] },
                            { cells: ['SCHED_RR', '고정 우선순위 + 타임슬라이스', '더 높은 RT만', 'RT 라운드로빈'] },
                            {
                                cells: [
                                    'SCHED_DEADLINE',
                                    'EDF (최소 deadline 우선)',
                                    '더 급박한 deadline',
                                    '멀티미디어·제어',
                                ],
                            },
                        ]}
                    />
                </div>

                {/* Admission Control */}
                <div className="mt-6 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-4 space-y-2">
                    <div className="font-semibold text-red-800 dark:text-red-300 text-sm">Admission Control</div>
                    <div className="text-xs text-red-700 dark:text-red-400 leading-relaxed">
                        새 DEADLINE 태스크를 추가할 때 커널은{' '}
                        <InlineCode color="red"></InlineCode>{' '}
                        조건을 검사합니다. 이 조건을 초과하면{' '}
                        <InlineCode color="red"></InlineCode>를 반환하고 설정을
                        거부하여, CPU 과부하를 원천적으로 차단합니다. 즉, 시스템에 등록된 모든 DEADLINE 태스크의 대역폭
                        합이 1(100%)을 넘을 수 없습니다.
                    </div>
                </div>

                {/* 코드 예제 */}
                <div className="mt-6 space-y-4">
                    <CodeBlock code={snippets.deadlineSettattrCode} language="c" filename="sched_setattr() 예제" />
                    <CodeBlock code={snippets.deadlineChrtCode} language="bash" filename="chrt — SCHED_DEADLINE 실행" />
                </div>
            </Section>

            {/* ── 2.12 관련 커널 파라미터 ─────────────────────────────────── */}
            <Section id="s214" title="2.14  관련 커널 파라미터">
                <Prose>
                    CFS 스케줄러의 동작을 튜닝할 수 있는 주요 커널 파라미터입니다.
                    <code>sysctl</code> 또는 <code>/proc/sys/kernel</code>을 통해 런타임에 조정할 수 있습니다.
                </Prose>

                <InfoTable
                    headers={['파라미터', '기본값', '설명']}
                    rows={[
                        { cells: ['kernel.sched_min_granularity_ns', '750000 (0.75ms)', 'CFS 최소 실행 시간. 이보다 짧게 선점하지 않음'] },
                        { cells: ['kernel.sched_latency_ns', '6000000 (6ms)', 'CFS 스케줄링 주기. 모든 태스크가 한 번씩 실행되는 목표 시간'] },
                        { cells: ['kernel.sched_wakeup_granularity_ns', '1000000 (1ms)', '깨어난 태스크가 선점하려면 현재 태스크보다 이만큼 vruntime이 작아야 함'] },
                        { cells: ['kernel.sched_child_runs_first', '0', '1이면 fork 후 자식이 먼저 실행 (CoW 페이지 폴트 최적화)'] },
                        { cells: ['kernel.sched_nr_migrate', '32', '로드 밸런싱 시 한 번에 이동하는 최대 태스크 수'] },
                        { cells: ['kernel.sched_rt_runtime_us', '950000', 'RT 태스크가 사용 가능한 CPU 시간 비율 (950ms/1s)'] },
                    ]}
                />

                <CodeBlock code={snippets.schedParamsCode} language="bash" filename="스케줄러 파라미터 확인/변경" />
            </Section>
        </TopicPage>
    )
}
