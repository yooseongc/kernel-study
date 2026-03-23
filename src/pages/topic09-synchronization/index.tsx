import { KernelRef } from '../../components/ui/KernelRef'
import { RaceConditionViz, raceAnimSteps } from '../../components/concepts/sync/RaceConditionViz'
import { LockComparisonChart } from '../../components/concepts/sync/LockComparisonChart'
import { RcuGracePeriodViz } from '../../components/concepts/sync/RcuGracePeriodViz'
import * as snippets from './codeSnippets'
import { Alert, AnimatedDiagram, CodeBlock, InfoBox, InfoTable, Prose, Section, T , useTheme , type TableRow , TopicPage } from '@study-ui/components'

// ─────────────────────────────────────────────────────────────────────────────
// Code snippets
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Table data
// ─────────────────────────────────────────────────────────────────────────────

const spinlockRows: TableRow[] = [
    { cells: ['대기 방식', '바쁜 대기 (CPU 소모)'] },
    { cells: ['sleep 가능', '불가 (인터럽트 컨텍스트 OK)'] },
    { cells: ['적합한 임계 구역', '수 µs 이하'] },
    { cells: ['SMP 고려', '필요 (UP에서는 no-op)'] },
]

const rwlockRows: TableRow[] = [
    { cells: ['읽기 + 읽기', '동시 가능 ✓'] },
    { cells: ['읽기 + 쓰기', '불가 ✗'] },
    { cells: ['쓰기 + 쓰기', '불가 ✗'] },
]

const atomicRows: TableRow[] = [
    { cells: ['atomic_read(&v)', '원자적 읽기'] },
    { cells: ['atomic_set(&v, i)', '원자적 쓰기'] },
    { cells: ['atomic_inc(&v)', '+1 원자적'] },
    { cells: ['atomic_dec_and_test(&v)', '−1 후 0이면 true'] },
    { cells: ['atomic_cmpxchg(&v, old, new)', 'CAS (Compare-And-Swap)'] },
    { cells: ['atomic64_t', '64비트 버전'] },
]

const membarrierRows: TableRow[] = [
    { cells: ['Full barrier', 'smp_mb()', '배리어 앞뒤 모든 읽기/쓰기 순서 강제'] },
    { cells: ['Read barrier', 'smp_rmb()', '배리어 앞뒤 읽기 순서만 강제'] },
    { cells: ['Write barrier', 'smp_wmb()', '배리어 앞뒤 쓰기 순서만 강제'] },
    { cells: ['Acquire', 'smp_load_acquire()', '이후 읽기/쓰기가 앞으로 이동 못함'] },
    { cells: ['Release', 'smp_store_release()', '이전 읽기/쓰기가 뒤로 이동 못함'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topic08() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <TopicPage topicId="09-synchronization" learningItems={[
                    'Spinlock, Mutex, RWLock의 내부 구현과 올바른 선택 기준을 이해합니다',
                    'RCU(Read-Copy-Update)가 읽기 성능을 극대화하는 grace period 메커니즘을 배웁니다',
                    '멀티코어 환경에서 Cache Coherence와 메모리 배리어가 동기화에 미치는 영향을 파악합니다',
                ]}>
            {/* Header */}

            {/* 9.1 Race Condition */}
            <Section id="s91" title="9.1  Race Condition">
                <Prose>
                    두 스레드가 공유 자원에 동시 접근할 때 실행 순서에 따라 결과가 달라지는 문제입니다. 단순해 보이는{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">counter++</code>도
                    LOAD → ADD → STORE 3단계 명령어로 이뤄지기 때문에 중간에 컨텍스트 스위치가 발생하면 데이터가 손실될
                    수 있습니다.
                </Prose>

                <AnimatedDiagram
                    steps={raceAnimSteps}
                    renderStep={(step) => <RaceConditionViz step={step} />}
                    autoPlayInterval={2200}
                />

                <CodeBlock code={snippets.raceCode} language="c" filename="race_condition.c" />
            </Section>

            {/* 9.2 Spinlock */}
            <Section id="s92" title="9.2  Spinlock">
                <Prose>
                    짧은 임계 구역에 사용합니다. 락을 얻을 때까지 CPU를 소모하며 바쁜 대기(busy-wait)를 수행합니다.
                    sleep 불가 컨텍스트(인터럽트 핸들러)에서도 사용할 수 있습니다.
                    <div className="mt-2 flex flex-wrap gap-2">
                        <KernelRef path="include/linux/spinlock_types.h" sym="spinlock_t" label="spinlock_t" />
                        <KernelRef path="include/linux/rcupdate.h" sym="rcu_head" label="rcu_head" />
                    </div>
                </Prose>

                <CodeBlock code={snippets.spinlockCode} language="c" filename="spinlock.c" />

                <InfoTable headers={['항목', '값']} rows={spinlockRows} />

                <div className="rounded-lg border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-900/10 px-4 py-3 text-xs text-orange-800 dark:text-orange-200">
                    <span className="font-bold text-orange-700 dark:text-orange-300">주의:</span> <T id="spinlock">spinlock</T>을 보유한
                    상태에서 sleep하면 데드락이 발생합니다. 임계 구역이 긴 경우 <T id="mutex">Mutex</T>를 사용하세요.
                </div>
            </Section>

            {/* 9.3 Mutex */}
            <Section id="s93" title="9.3  Mutex">
                <Prose>
                    긴 임계 구역에 사용합니다. 락 대기 중 sleep하므로 CPU 낭비가 없습니다. 프로세스 컨텍스트에서만 사용
                    가능하며, 인터럽트 핸들러에서는 <T id="spinlock">Spinlock</T>과 달리 사용할 수 없습니다.
                </Prose>

                <CodeBlock code={snippets.mutexCode} language="c" filename="mutex.c" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                        {
                            label: 'Spinlock vs Mutex',
                            items: [
                                'Spinlock: 수 µs → CPU 낭비 허용, 인터럽트 컨텍스트 OK',
                                'Mutex: 수 ms 이상 → sleep으로 CPU 양보, 프로세스 컨텍스트만',
                            ],
                            color: '#3b82f6',
                        },
                        {
                            label: 'mutex_lock 변형',
                            items: [
                                'mutex_lock() — 중단 없음',
                                'mutex_lock_interruptible() — 시그널로 중단 가능',
                                'mutex_trylock() — 즉시 반환',
                            ],
                            color: '#8b5cf6',
                        },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="rounded-lg px-4 py-3 space-y-1.5"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}44`,
                            }}
                        >
                            <div className="font-bold text-xs" style={{ color: card.color }}>
                                {card.label}
                            </div>
                            {card.items.map((item, i) => (
                                <div key={i} className="text-gray-500 dark:text-gray-400 leading-snug">
                                    • {item}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </Section>

            {/* 9.4 RWLock */}
            <Section id="s94" title="9.4  RWLock (Reader-Writer Lock)">
                <Prose>
                    읽기는 동시에, 쓰기는 단독으로 수행합니다. 읽기가 많고 쓰기가 드문 자료구조에 적합합니다. 다수의
                    reader가 공존할 수 있어 읽기 경쟁이 심한 경우 <T id="mutex">Mutex</T>보다 효율적입니다.
                </Prose>

                <InfoTable headers={['동작', '허용']} rows={rwlockRows} />

                <CodeBlock code={snippets.rwlockCode} language="c" filename="rwlock.c" />

                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="include/linux/spinlock.h" sym="spinlock_t" />
                        <KernelRef path="kernel/locking/mutex.c" sym="mutex_lock" />
                        <KernelRef path="include/linux/rwlock.h" label="rwlock.h" />
                    </div>
                </InfoBox>
            </Section>

            {/* Lock comparison chart */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    락 종류별 상대적 오버헤드 비교
                </h3>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700">
                    <LockComparisonChart />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    RCU-R은 실질적으로 오버헤드가 거의 없습니다 (선점 비활성화만 수행).
                </p>
            </div>

            {/* 9.5 seqlock */}
            <Section id="s95" title="9.5  seqlock — 읽기 무잠금 동기화">
                <Prose>
                    <T id="seqlock">seqlock</T>은 읽기 쪽이 잠금 없이 시퀀스 카운터를 확인하는 방식입니다. 쓰기가 드물고
                    읽기가 매우 빈번한 경우(커널 timekeeping, jiffies 업데이트)에 최적입니다. 읽기 중 쓰기가 발생했으면
                    카운터가 달라지므로 재시도합니다.
                </Prose>

                <CodeBlock code={snippets.seqlockCode} language="c" filename="include/linux/seqlock.h 사용 예" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                        {
                            label: 'seqlock',
                            items: [
                                '읽기 무잠금 (카운터 확인만)',
                                '쓰기 중 읽기 → 재시도',
                                '읽기 성공 보장 없음',
                                '긴 임계구역 부적합',
                            ],
                            color: '#f97316',
                        },
                        {
                            label: 'RWLock',
                            items: ['읽기도 잠금 취득', '쓰기 중 읽기 → 블록', '읽기 항상 성공', '일반적 목적'],
                            color: '#22c55e',
                        },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="rounded-lg px-4 py-3 space-y-1.5"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}44`,
                            }}
                        >
                            <div className="font-bold text-xs" style={{ color: card.color }}>
                                {card.label}
                            </div>
                            {card.items.map((item, i) => (
                                <div key={i} className="text-gray-500 dark:text-gray-400 leading-snug">
                                    • {item}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </Section>

            {/* 9.6 rwsem */}
            <Section id="s96" title="9.6  rwsem — 슬립 가능한 읽기-쓰기 잠금">
                <Prose>
                    rwsem은 RWLock과 달리 경쟁 시 슬립합니다. 인터럽트 컨텍스트 밖(프로세스 컨텍스트)에서 사용하며, VFS
                    inode lock 등 커널 내부에서 광범위하게 사용됩니다.
                </Prose>

                <CodeBlock code={snippets.rwsemCode} language="c" filename="rwsem.c" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                        {
                            label: 'RWLock (rwlock_t)',
                            items: ['스핀 (바쁜 대기)', '인터럽트 컨텍스트 사용 가능', '슬립 불가', '짧은 임계구역'],
                            color: '#f97316',
                        },
                        {
                            label: 'rwsem',
                            items: [
                                '슬립 (프로세스 컨텍스트만)',
                                '슬립 가능',
                                '긴 임계구역',
                                'VFS inode lock 등에서 사용',
                            ],
                            color: '#8b5cf6',
                        },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="rounded-lg px-4 py-3 space-y-1.5"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}44`,
                            }}
                        >
                            <div className="font-bold text-xs" style={{ color: card.color }}>
                                {card.label}
                            </div>
                            {card.items.map((item, i) => (
                                <div key={i} className="text-gray-500 dark:text-gray-400 leading-snug">
                                    • {item}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </Section>

            {/* 9.7 Wait Queue */}
            <Section id="s97" title="9.7  Wait Queue — 블로킹 I/O의 핵심">
                <Prose>
                    <T id="wait_queue">Wait Queue</T>는 커널에서 "특정 조건이 될 때까지 이 프로세스를 재워라"를 구현하는
                    기본 메커니즘입니다. 소켓 read(), 파일 I/O, 디바이스 드라이버의 거의 모든 블로킹 동작이
                    <T id="wait_queue">wait queue</T> 위에 구현됩니다.
                </Prose>

                {/* 동작 흐름 카드 3단계 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            step: '단계 1 — 대기',
                            color: '#3b82f6',
                            lines: [
                                '프로세스 → wait_event_interruptible(wq, condition)',
                                '→ condition이 거짓이면 TASK_INTERRUPTIBLE로 설정',
                                '→ wait queue에 자신을 등록하고 schedule() 호출',
                                '→ CPU를 양보하고 슬립',
                            ],
                        },
                        {
                            step: '단계 2 — 깨우기',
                            color: '#8b5cf6',
                            lines: [
                                '다른 컨텍스트(IRQ/다른 프로세스) → 조건 변경',
                                '→ wake_up(&wq) / wake_up_interruptible(&wq)',
                                '→ wait queue의 모든 대기 프로세스를 TASK_RUNNING으로 변경',
                                '→ scheduler가 재스케줄링',
                            ],
                        },
                        {
                            step: '단계 3 — 재확인',
                            color: '#10b981',
                            lines: [
                                '깨어난 프로세스 → condition 재확인 (spurious wakeup 방지)',
                                '→ 거짓이면 다시 슬립 (루프)',
                                '→ 참이면 wait_event 반환, 실행 재개',
                            ],
                        },
                    ].map((card) => (
                        <div
                            key={card.step}
                            className="rounded-xl p-4 space-y-2"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}44`,
                            }}
                        >
                            <div className="text-xs font-bold" style={{ color: card.color }}>
                                {card.step}
                            </div>
                            <div className="space-y-1">
                                {card.lines.map((line, i) => (
                                    <div
                                        key={i}
                                        className="text-gray-500 dark:text-gray-400 text-xs font-mono leading-snug"
                                    >
                                        {line}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <CodeBlock
                    code={`#include <linux/wait.h>

/* wait queue 선언 */
static DECLARE_WAIT_QUEUE_HEAD(my_wq);
static int data_ready = 0;

/* 소비자: 데이터가 준비될 때까지 대기 */
ssize_t my_read(struct file *file, char __user *buf, size_t len, loff_t *off)
{
    /* 인터럽트 가능한 대기 (Ctrl+C로 중단 가능) */
    if (wait_event_interruptible(my_wq, data_ready != 0))
        return -ERESTARTSYS;  /* 시그널 수신 */

    /* 데이터 준비됨 → 읽기 처리 */
    data_ready = 0;
    return copy_to_user(buf, kernel_buf, len) ? -EFAULT : len;
}

/* 생산자: 데이터 준비 후 대기자 깨우기 */
irqreturn_t my_irq_handler(int irq, void *dev_id)
{
    /* 하드웨어에서 데이터 읽기 */
    read_hardware_data(kernel_buf);
    data_ready = 1;

    /* wait queue의 모든 대기자 깨우기 */
    wake_up_interruptible(&my_wq);
    return IRQ_HANDLED;
}

/* 타임아웃 있는 대기 */
int ret = wait_event_interruptible_timeout(my_wq,
                                            data_ready != 0,
                                            msecs_to_jiffies(5000));
if (ret == 0)   return -ETIMEDOUT;   /* 5초 타임아웃 */
if (ret < 0)    return -ERESTARTSYS; /* 시그널 */
/* ret > 0: 남은 jiffies, 조건 충족 */`}
                    language="c"
                    filename="drivers/wait_queue_example.c"
                />

                <InfoTable
                    headers={['함수', '인터럽트', '타임아웃', '사용']}
                    rows={[
                        { cells: ['wait_event(wq, cond)', '불가', '없음', '반드시 깨어나야 할 때'] },
                        { cells: ['wait_event_interruptible(wq, cond)', '가능', '없음', '대부분의 드라이버'] },
                        { cells: ['wait_event_timeout(wq, cond, timeout)', '불가', '있음', '하드웨어 폴링'] },
                        {
                            cells: [
                                'wait_event_interruptible_timeout(wq, cond, t)',
                                '가능',
                                '있음',
                                '소켓 타임아웃 등',
                            ],
                        },
                    ]}
                />
            </Section>

            {/* 9.8 Completion */}
            <Section id="s98" title="9.8  Completion — 일회성 완료 신호">
                <Prose>
                    Wait Queue가 "반복적인 조건 대기"라면,{' '}
                    <T id="completion">Completion</T>은
                    "딱 한 번의 완료 신호"에 최적화된 간단한 인터페이스입니다. 드라이버 초기화, 스레드 종료 대기, <T id="dma">DMA</T>
                    완료 신호에 주로 사용됩니다.
                </Prose>

                <CodeBlock
                    code={`#include <linux/completion.h>

/* 선언 및 초기화 */
static DECLARE_COMPLETION(dma_done);
/* 또는 동적으로: */
struct completion dma_done;
init_completion(&dma_done);

/* 대기자: DMA 완료 신호를 기다림 */
int my_dma_transfer(void)
{
    start_dma_hardware();

    /* 완료 신호 대기 (타임아웃 없음) */
    wait_for_completion(&dma_done);

    /* 또는 타임아웃 있는 버전 (5초) */
    unsigned long ret = wait_for_completion_timeout(&dma_done,
                                                     msecs_to_jiffies(5000));
    if (!ret) return -ETIMEDOUT;

    return process_dma_result();
}

/* 완료자: DMA 인터럽트 핸들러에서 신호 발송 */
irqreturn_t dma_irq_handler(int irq, void *dev_id)
{
    /* 대기 중인 스레드를 깨움 */
    complete(&dma_done);
    return IRQ_HANDLED;
}

/* 모듈 종료 시 작업 스레드 대기 */
static DECLARE_COMPLETION(thread_done);

int my_kthread(void *data) {
    /* 작업 수행 */
    do_work();
    complete(&thread_done);  /* 완료 신호 */
    return 0;
}

void cleanup(void) {
    kthread_stop(my_thread);
    wait_for_completion(&thread_done);  /* 스레드가 끝날 때까지 대기 */
}`}
                    language="c"
                    filename="include/linux/completion.h 사용 예"
                />

                {/* Wait Queue vs Completion 비교 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                        {
                            label: 'Wait Queue',
                            items: ['조건 기반 반복 대기', '다수 대기자', '복잡한 조건 표현식', '소켓/파일 I/O'],
                            color: '#3b82f6',
                        },
                        {
                            label: 'Completion',
                            items: ['일회성 완료 신호', '단순 "완료 여부"', '초기화/종료 동기화', 'DMA 완료'],
                            color: '#10b981',
                        },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="rounded-lg px-4 py-3 space-y-1.5"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}44`,
                            }}
                        >
                            <div className="font-bold text-xs" style={{ color: card.color }}>
                                {card.label}
                            </div>
                            {card.items.map((item, i) => (
                                <div key={i} className="text-gray-500 dark:text-gray-400 leading-snug">
                                    • {item}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </Section>

            {/* 9.9 Atomic Operations */}
            <Section id="s99" title="9.9  Atomic Operations">
                <Prose>
                    하드웨어 수준의 <T id="atomic">atomic</T> 연산으로 락 없이도 안전합니다. x86에서는 LOCK prefix를
                    통해 버스를 잠그고 단일 명령어로 읽기-수정-쓰기를 수행합니다. 단순 카운터나 플래그에 사용하기
                    적합합니다.
                </Prose>

                <InfoTable headers={['함수', '동작']} rows={atomicRows} />

                <div className="rounded-lg border border-cyan-200 dark:border-cyan-800/40 bg-cyan-50 dark:bg-cyan-900/10 px-4 py-3 text-xs text-cyan-800 dark:text-cyan-200">
                    <span className="font-bold text-cyan-700 dark:text-cyan-300">CAS 패턴:</span>{' '}
                    <code className="font-mono">atomic_cmpxchg(&v, old, new)</code>은 락-프리 알고리즘의 핵심입니다.
                    현재 값이 old와 같을 때만 new로 교체하며, 반환값으로 성공 여부를 판단합니다.
                </div>
            </Section>

            {/* 9.10 메모리 배리어 */}
            <Section id="s910" title="9.10  메모리 배리어 — CPU 재순서화 제어">
                <Prose>
                    현대 CPU는 성능을 위해 메모리 읽기/쓰기 순서를 재배치합니다. 멀티코어 환경에서 이 재배치가 동기화
                    버그를 일으킬 수 있어 <strong>메모리 배리어</strong>로 순서를 강제합니다.
                </Prose>

                <InfoTable headers={['배리어', '함수', '설명']} rows={membarrierRows} />

                <CodeBlock code={snippets.membarrierCode} language="c" filename="메모리 배리어 사용 예" />
            </Section>

            {/* 9.11 RCU */}
            <Section id="s911" title="9.11  RCU (Read-Copy-Update)">
                <Prose>
                    읽기가 극도로 많은 자료구조(라우팅 테이블, 프로세스 목록 등)를 위한 락-프리 동기화 메커니즘입니다.{' '}
                    <T id="rcu">RCU</T> 읽기 측은 lock이 전혀 없습니다.
                </Prose>

                {/* RCU 3단계 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            step: '1. Read',
                            api: 'rcu_read_lock()',
                            desc: '실제 락 없음. 그냥 <T id="preemption">선점(preemption)</T> 비활성화만 수행. O(1).',
                            color: '#06b6d4',
                        },
                        {
                            step: '2. Copy & Update',
                            api: 'rcu_assign_pointer()',
                            desc: '쓰기 측이 복사본을 만들어 수정한 뒤 포인터를 원자적으로 교체. 기존 reader는 구버전 계속 사용.',
                            color: '#8b5cf6',
                        },
                        {
                            step: '3. Reclaim',
                            api: 'synchronize_rcu()',
                            desc: 'Grace period: 모든 기존 reader가 완료될 때까지 대기. 이후 구버전 메모리를 안전하게 kfree.',
                            color: '#22c55e',
                        },
                    ].map((card) => (
                        <div
                            key={card.step}
                            className="rounded-xl p-4 space-y-2"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}44`,
                            }}
                        >
                            <div className="text-xs font-bold" style={{ color: card.color }}>
                                {card.step}
                            </div>
                            <code
                                className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                                style={{
                                    background: card.color + '22',
                                    color: card.color,
                                }}
                            >
                                {card.api}
                            </code>
                            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>

                <CodeBlock code={snippets.rcuCode} language="c" filename="rcu.c" />

                <div className="rounded-lg border border-green-200 dark:border-green-800/40 bg-green-50 dark:bg-green-900/10 px-4 py-3 text-xs text-green-800 dark:text-green-200">
                    <span className="font-bold text-green-700 dark:text-green-300">사용 예:</span> 커널 내부의{' '}
                    <code className="font-mono">task_list</code>, 라우팅 테이블, 네트워크 디바이스 목록은 모두
                    <T id="rcu">RCU</T>로 보호됩니다. 읽기 성능이 critical한 곳에서 RWLock 대비 큰 이점을 가집니다.
                </div>

                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="kernel/rcu/tree.c" sym="synchronize_rcu" />
                        <KernelRef path="include/linux/rcupdate.h" label="rcupdate.h" />
                        <KernelRef path="kernel/rcu/tree.c" sym="rcu_gp_kthread" />
                    </div>
                </InfoBox>
            </Section>

            {/* 9.12 RCU Grace Period */}
            <Section id="s912" title="9.12  RCU Grace Period — 독자 완전 탈출 후 메모리 해제">
                <Prose>
                    <T id="rcu">RCU</T> 업데이터는 새 버전 포인터로 교체(publish) 후, 기존 데이터를 즉시 해제할 수
                    없습니다. <strong>이미 구버전을 읽고 있는 독자(reader)</strong>가 있을 수 있기 때문입니다. Grace
                    Period는 "모든 현재 독자가 임계 구역을 벗어날 때까지 기다리는 시간"입니다.
                </Prose>

                {/* Grace Period 타임라인 SVG */}
                <RcuGracePeriodViz />

                {/* 핵심 개념 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        {
                            term: 'synchronize_rcu()',
                            color: '#8b5cf6',
                            desc: '블로킹. 현재 스레드가 Grace Period 완료까지 대기합니다. 모든 현재 독자가 rcu_read_unlock()을 호출할 때까지 리턴하지 않습니다.',
                        },
                        {
                            term: 'call_rcu(&head, func)',
                            color: '#3b82f6',
                            desc: '비블로킹. Grace Period 후 func(head) 콜백을 등록합니다. 호출 스레드는 즉시 리턴하며, 커널이 나중에 콜백을 실행합니다.',
                        },
                        {
                            term: 'quiescent state',
                            color: '#f97316',
                            desc: '독자가 임계 구역을 벗어난 상태. context switch, 유저 공간 실행, idle 등이 해당됩니다. 모든 CPU가 한 번씩 통과하면 Grace Period가 종료됩니다.',
                        },
                        {
                            term: 'rcu_gp_kthread',
                            color: '#22c55e',
                            desc: 'Grace Period 감시 커널 스레드. 모든 CPU가 quiescent state를 통과했는지 추적하여 Grace Period 완료를 선언합니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.term}
                            className="rounded-lg px-4 py-3 space-y-1.5"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}44`,
                            }}
                        >
                            <code className="font-mono font-bold text-xs" style={{ color: card.color }}>
                                {card.term}
                            </code>
                            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>

                {/* rcu_read_lock/unlock 의미 */}
                <div className="rounded-lg border border-cyan-800/40 bg-cyan-900/10 px-4 py-3 space-y-1.5 text-xs">
                    <div className="font-bold text-cyan-300 dark:text-cyan-300 text-cyan-700">
                        rcu_read_lock / rcu_read_unlock
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                        <code className="font-mono text-cyan-600 dark:text-cyan-400">rcu_read_lock()</code> → 선점
                        비활성화 (TREE_RCU) 또는 카운터 증가. 실제 락 획득 없음.
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">
                        <code className="font-mono text-cyan-600 dark:text-cyan-400">rcu_read_unlock()</code> → 선점
                        재활성화 → <strong className="text-gray-700 dark:text-gray-300">quiescent state 도달</strong>.
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 pt-1">
                        Grace Period는 "모든 CPU가 최소 한 번 선점을 허용"할 때 종료됩니다.
                    </div>
                </div>

                <CodeBlock code={snippets.rcuGracePeriodCode} language="c" filename="rcu_grace_period.c" />
            </Section>

            {/* 9.13 futex */}
            <Section id="s913" title="9.13  futex — 유저 공간 동기화의 핵심">
                <Prose>
                    <strong className="text-gray-800 dark:text-gray-200">futex</strong> (Fast Userspace muTEX){' '}
                    <KernelRef path="kernel/futex/core.c" sym="do_futex" />는 유저 공간 동기화 프리미티브의
                    핵심 빌딩 블록입니다. pthread_mutex, pthread_cond, Go의 sync.Mutex 등 대부분의 유저 공간 잠금이
                    내부적으로 futex 시스템 콜을 사용합니다.
                </Prose>
                <Prose>
                    futex의 핵심 아이디어는 <strong className="text-gray-800 dark:text-gray-200">fast path</strong>와{' '}
                    <strong className="text-gray-800 dark:text-gray-200">slow path</strong>의 분리입니다.
                    경합이 없는 경우(fast path)에는 유저 공간에서 atomic CAS 한 번으로 잠금을 획득하고,
                    경합이 발생할 때만(slow path) 커널로 진입하여 대기 큐에서 슬립합니다.
                </Prose>
                <InfoTable
                    headers={['연산', '시스템 콜', '동작']}
                    rows={[
                        { cells: ['FUTEX_WAIT', 'futex(addr, FUTEX_WAIT, val)', '*addr == val이면 슬립, 아니면 즉시 리턴 (spurious wakeup 방지)'] },
                        { cells: ['FUTEX_WAKE', 'futex(addr, FUTEX_WAKE, n)', 'addr에서 대기 중인 스레드 최대 n개 깨움'] },
                        { cells: ['FUTEX_LOCK_PI', 'futex(addr, FUTEX_LOCK_PI)', 'Priority Inheritance 지원 잠금 — RT 태스크 우선순위 역전 방지'] },
                        { cells: ['FUTEX_WAIT_BITSET', 'futex(addr, FUTEX_WAIT_BITSET, val, mask)', '비트마스크로 선택적 대기/깨움 (condition variable 구현)'] },
                    ]}
                />
                <CodeBlock code={`/* futex 기반 간단한 뮤텍스 (개념적 구현) */

/* Fast path: 유저 공간 atomic CAS */
int lock(int *futex_word) {
    /* 0(unlocked) → 1(locked) 시도 */
    if (atomic_cmpxchg(futex_word, 0, 1) == 0)
        return 0;  /* 성공 — 커널 진입 없음! */

    /* Slow path: 경합 발생 → 커널 대기 */
    while (atomic_xchg(futex_word, 2) != 0)
        futex(futex_word, FUTEX_WAIT, 2, ...);
    return 0;
}

int unlock(int *futex_word) {
    if (atomic_xchg(futex_word, 0) == 2)
        futex(futex_word, FUTEX_WAKE, 1, ...);
    return 0;
}

/* 상태값:  0 = unlocked
 *          1 = locked (대기자 없음)
 *          2 = locked (대기자 있음) */`} language="c" filename="futex 기반 뮤텍스 개념" />
                <Alert variant="tip" title="경합 없는 잠금은 syscall 0회">
                    대부분의 잠금 획득은 경합 없이 성공합니다. 이 경우 futex는 유저 공간 atomic 연산 하나로 완료되어
                    시스템 콜 오버헤드가 전혀 없습니다. 이것이 futex가 빠른 핵심 이유입니다.
                </Alert>
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="kernel/futex/core.c" sym="do_futex" />
                        <KernelRef path="kernel/futex/waitqueue.c" label="waitqueue.c" />
                        <KernelRef path="include/uapi/linux/futex.h" label="futex.h" />
                    </div>
                </InfoBox>
            </Section>

            {/* 9.14 멀티코어 환경에서 네트워크 성능 */}
            <Section id="s914" title="9.14  멀티코어 환경에서 네트워크 성능">
                <Prose>
                    여러 CPU가 동시에 패킷을 처리할 때 동기화 비용이 병목이 됩니다. 다음 기법들로 락 경합을
                    최소화합니다.
                </Prose>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'RSS (Receive Side Scaling)',
                            subtitle: 'NIC 하드웨어 분산',
                            desc: 'NIC 하드웨어가 패킷을 해시(src IP, dst IP, port)로 여러 수신 큐에 분배합니다. CPU당 큐를 할당하므로 큐 접근 시 락 경합이 없습니다.',
                            color: '#3b82f6',
                            tags: ['NIC', 'Interrupt affinity', 'IRQ balancing'],
                        },
                        {
                            title: 'RPS / RFS',
                            subtitle: '소프트웨어 RSS',
                            desc: 'NIC가 RSS를 지원하지 않는 경우 소프트웨어로 구현합니다. RFS는 패킷을 처리할 CPU를 해당 소켓을 소유한 프로세스가 실행 중인 CPU로 조정하여 cache locality를 개선합니다.',
                            color: '#8b5cf6',
                            tags: ['rps_cpus', 'rfs_flow_cnt', 'sk_buff'],
                        },
                        {
                            title: 'per-CPU 변수',
                            subtitle: 'DEFINE_PER_CPU',
                            desc: 'CPU마다 별도 복사본을 유지하므로 락이 필요 없습니다. 통계 카운터, per-CPU 캐시 등에 사용하며, 합산 시에만 전체를 순회합니다.',
                            color: '#10b981',
                            tags: ['per_cpu()', 'this_cpu_inc()', 'preempt_disable'],
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-3 hover:shadow-lg transition-shadow"
                        >
                            <div>
                                <div className="text-xs font-bold mb-0.5" style={{ color: card.color }}>
                                    {card.title}
                                </div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs">{card.subtitle}</div>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{card.desc}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {card.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                                        style={{
                                            background: card.color + (isDark ? '22' : '11'),
                                            color: card.color,
                                            border: `1px solid ${card.color}44`,
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

            {/* 9.15 관련 커널 파라미터 */}
            <Section id="s915" title="9.15  관련 커널 파라미터">
                <Prose>
                    동기화 및 락 디버깅과 관련된 주요 커널 파라미터입니다.
                    RT 태스크 제한, hung task 감지, 락 통계 수집 등 운영 환경에서 유용한 설정들입니다.
                </Prose>

                <InfoTable
                    headers={['파라미터', '기본값', '설명']}
                    rows={[
                        { cells: ['kernel.sched_rt_runtime_us', '950000', 'RT 태스크 CPU 시간 제한 (950ms/1s). -1이면 무제한'] },
                        { cells: ['kernel.hung_task_timeout_secs', '120', 'TASK_UNINTERRUPTIBLE 상태 경고 임계값(초)'] },
                        { cells: ['kernel.panic_on_warn', '0', '1이면 WARN() 발생 시 즉시 패닉'] },
                        { cells: ['kernel.panic', '0', '패닉 후 재부팅까지 대기 시간(초). 0이면 대기'] },
                        { cells: ['kernel.lock_stat', '0', '1이면 /proc/lock_stat으로 잠금 통계 수집'] },
                        { cells: ['kernel.max_lock_depth', '1024', 'lockdep 최대 추적 깊이'] },
                    ]}
                />

                <CodeBlock code={snippets.syncParamsCode} language="bash" filename="# 동기화 관련 파라미터 확인" />
            </Section>
        </TopicPage>
    )
}
