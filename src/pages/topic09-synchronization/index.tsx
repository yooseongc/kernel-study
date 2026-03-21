import { useState, useCallback } from 'react'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { D3Container } from '../../components/viz/D3Container'
import { AnimatedDiagram } from '../../components/viz/AnimatedDiagram'
import { useTheme } from '../../hooks/useTheme'
import * as d3 from 'd3'
import { themeColors } from '../../lib/colors'
import { T } from '../../components/ui/GlossaryTooltip'
import { Section } from '../../components/ui/Section'
import { Prose } from '../../components/ui/Prose'
import { InfoTable, type TableRow } from '../../components/ui/InfoTable'

// ─────────────────────────────────────────────────────────────────────────────
// 9.1  Race Condition — AnimatedDiagram step renderer
// ─────────────────────────────────────────────────────────────────────────────

interface RaceState {
  counter: number
  regA: number | null
  regB: number | null
  activeA: boolean
  activeB: boolean
  highlight: 'none' | 'a' | 'b' | 'danger'
  note: string
}

const raceStates: RaceState[] = [
    {
        counter: 0,
        regA: null,
        regB: null,
        activeA: false,
        activeB: false,
        highlight: 'none',
        note: '두 스레드 모두 대기 중. counter = 0',
    },
    {
        counter: 0,
        regA: 0,
        regB: null,
        activeA: true,
        activeB: false,
        highlight: 'a',
        note: 'Thread A가 counter(=0)를 레지스터로 읽음. 아직 쓰지 않음.',
    },
    {
        counter: 0,
        regA: 0,
        regB: 0,
        activeA: false,
        activeB: true,
        highlight: 'b',
        note: '컨텍스트 스위치! Thread B도 counter(=0)를 읽음. A의 결과는 아직 반영 안 됨.',
    },
    {
        counter: 1,
        regA: 0,
        regB: 0,
        activeA: true,
        activeB: false,
        highlight: 'a',
        note: 'Thread A: reg+1=1 을 counter에 씀. counter = 1.',
    },
    {
        counter: 1,
        regA: 0,
        regB: 0,
        activeA: false,
        activeB: true,
        highlight: 'danger',
        note: 'Thread B: reg+1=1 을 counter에 씀. counter = 1 (기댓값 2!). 데이터 손실 발생!',
    },
]

const raceAnimSteps = [
    { label: '① 초기 상태', description: 'counter=0, Thread A/B 모두 대기' },
    { label: '② Thread A: counter 읽기', description: 'A가 counter=0 읽음 (레지스터에 저장)' },
    {
        label: '③ Thread B: counter 읽기 (컨텍스트 스위치)',
        description: 'B도 counter=0 읽음 (A는 아직 쓰지 않음)',
    },
    { label: '④ Thread A: counter+1 쓰기', description: 'A가 register+1=1을 counter에 씀' },
    {
        label: '⑤ Thread B: counter+1 쓰기 (데이터 손실!)',
        description: 'B도 register+1=1을 counter에 씀 → counter=1 (기댓값 2!)',
    },
]

const colBase = 'rounded-lg border px-3 py-3 flex flex-col gap-1 min-w-0'

function ThreadBox({
    label,
    regVal,
    active,
    danger,
}: {
    label: string
    regVal: number | null
    active: boolean
    danger: boolean
}) {
    const borderCls = danger
        ? 'border-red-500 bg-red-900/20'
        : active
            ? 'border-blue-500 bg-blue-900/20'
            : 'border-gray-700 bg-gray-800/40'
    const textCls = danger ? 'text-red-400' : active ? 'text-blue-300' : 'text-gray-500'
    return (
        <div className={`${colBase} ${borderCls} flex-1`}>
            <div className={`text-xs font-mono font-bold ${textCls}`}>{label}</div>
            <div className="text-xs text-gray-400 font-mono">
          reg ={' '}
                <span className={regVal !== null ? 'text-yellow-300' : 'text-gray-600'}>
                    {regVal !== null ? regVal : '—'}
                </span>
            </div>
            {active && (
                <div className={`text-[10px] font-mono ${danger ? 'text-red-400' : 'text-green-400'}`}>
                    {danger ? '▶ STORE (충돌!)' : '▶ 실행 중'}
                </div>
            )}
        </div>
    )
}

function RaceViz({ step }: { step: number }) {
    const s = raceStates[step]

    const activeA = s.activeA
    const activeB = s.activeB
    const isDanger = s.highlight === 'danger'

    return (
        <div className="flex flex-col gap-3 p-2">
            <div className="flex gap-3 items-stretch">
                {/* Thread A */}
                <ThreadBox
                    label="Thread A"
                    regVal={s.regA}
                    active={activeA}
                    danger={false}
                />

                {/* Shared counter */}
                <div
                    className={`${colBase} flex-1 items-center justify-center ${
                        isDanger
                            ? 'border-red-500 bg-red-900/30'
                            : 'border-yellow-600/60 bg-yellow-900/10'
                    }`}
                >
                    <div className="text-xs font-mono text-yellow-400 font-bold text-center">
            shared counter
                    </div>
                    <div
                        className={`text-2xl font-mono font-bold text-center ${
                            isDanger ? 'text-red-400' : 'text-yellow-300'
                        }`}
                    >
                        {s.counter}
                    </div>
                    {isDanger && (
                        <div className="text-[10px] font-mono text-red-400 text-center">
              기댓값: 2 ← 손실!
                        </div>
                    )}
                </div>

                {/* Thread B */}
                <ThreadBox
                    label="Thread B"
                    regVal={s.regB}
                    active={activeB}
                    danger={isDanger}
                />
            </div>

            <div
                className={`rounded-lg px-3 py-2 text-xs font-mono ${
                    isDanger
                        ? 'bg-red-900/30 text-red-300 border border-red-700/50'
                        : 'bg-gray-800/60 text-gray-400 border border-gray-700/50'
                }`}
            >
                {s.note}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 9.2–9.5  Lock comparison D3 bar chart
// ─────────────────────────────────────────────────────────────────────────────

function renderLockComparison(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c = themeColors(isDark)
    const bg = c.bg
    const textColor = c.text
    const dimColor = c.textMuted

    svg.style('background', bg)

    const g = svg.append('g')

    const data = [
        { label: 'Spinlock', overhead: 85, color: c.amberStroke },
        { label: 'Mutex', overhead: 60, color: c.amberText },
        { label: 'RWLock-R', overhead: 45, color: c.greenStroke },
        { label: 'RWLock-W', overhead: 70, color: isDark ? 'oklch(72% 0.18 130)' : 'oklch(46% 0.20 130)' },
        { label: 'Atomic', overhead: 20, color: c.greenText },
        { label: 'RCU-R', overhead: 5, color: c.cyanStroke },
    ]

    const padX = 12
    const padTop = 20
    const padBottom = 38
    const chartW = width - padX * 2
    const chartH = height - padTop - padBottom

    const barW = Math.min((chartW / data.length) - 10, 52)
    const stepX = chartW / data.length

    // Y axis max
    const maxVal = 100

    data.forEach((d, i) => {
        const cx = padX + i * stepX + stepX / 2
        const barH = (d.overhead / maxVal) * chartH
        const barY = padTop + chartH - barH

        // bar
        g.append('rect')
            .attr('x', cx - barW / 2)
            .attr('y', barY)
            .attr('width', barW)
            .attr('height', barH)
            .attr('rx', 4)
            .attr('fill', d.color + (isDark ? 'bb' : 'cc'))
            .attr('stroke', d.color)
            .attr('stroke-width', 1)

        // overhead label above bar
        g.append('text')
            .attr('x', cx)
            .attr('y', barY - 4)
            .attr('text-anchor', 'middle')
            .attr('fill', d.color)
            .attr('font-size', '10px')
            .attr('font-family', 'monospace')
            .attr('font-weight', 'bold')
            .text(`${d.overhead}`)

        // x-axis label
        g.append('text')
            .attr('x', cx)
            .attr('y', padTop + chartH + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', textColor)
            .attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .text(d.label)
    })

    // baseline
    g.append('line')
        .attr('x1', padX)
        .attr('y1', padTop + chartH)
        .attr('x2', width - padX)
        .attr('y2', padTop + chartH)
        .attr('stroke', dimColor)
        .attr('stroke-width', 1)

    // Y-axis label
    g.append('text')
        .attr('x', padX)
        .attr('y', padTop - 6)
        .attr('fill', dimColor)
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text('상대적 오버헤드 →')

    // chart title
    g.append('text')
        .attr('x', width - padX)
        .attr('y', padTop + chartH + 30)
        .attr('text-anchor', 'end')
        .attr('fill', dimColor)
        .attr('font-size', '8.5px')
        .attr('font-family', 'monospace')
        .text('낮을수록 오버헤드 적음')
}

// ─────────────────────────────────────────────────────────────────────────────
// Code snippets
// ─────────────────────────────────────────────────────────────────────────────

const raceCode = `/* 안전하지 않은 코드 */
static int counter = 0;

void increment(void) {
    counter++;  /* 실제로는 3개 명령어: LOAD, ADD, STORE */
}

/* 안전한 코드 — atomic 사용 */
static atomic_t counter = ATOMIC_INIT(0);

void increment_safe(void) {
    atomic_inc(&counter);  /* 단일 원자적 연산 */
}`

const spinlockCode = `DEFINE_SPINLOCK(my_lock);

void critical_section(void) {
    unsigned long flags;

    /* 인터럽트 비활성화 + 락 획득 */
    spin_lock_irqsave(&my_lock, flags);

    /* 임계 구역 — 매우 짧아야 함 */
    shared_data++;

    /* 락 해제 + 인터럽트 복원 */
    spin_unlock_irqrestore(&my_lock, flags);
}`

const mutexCode = `static DEFINE_MUTEX(my_mutex);

void long_operation(void) {
    mutex_lock(&my_mutex);   /* 락 획득 불가 시 sleep */

    /* 긴 작업 (파일 I/O, 메모리 할당 등) */
    do_long_work();

    mutex_unlock(&my_mutex);
}

/* 타임아웃 버전 */
if (mutex_lock_interruptible(&my_mutex) != 0)
    return -EINTR;  /* 시그널로 중단 */`

const rwlockCode = `DEFINE_RWLOCK(my_rwlock);

/* 읽기 경로 — 동시 접근 허용 */
void read_data(void) {
    read_lock(&my_rwlock);
    /* 다수 스레드가 동시에 이 구역 진입 가능 */
    process(shared_data);
    read_unlock(&my_rwlock);
}

/* 쓰기 경로 — 단독 접근 */
void write_data(void) {
    write_lock(&my_rwlock);
    /* 모든 reader/writer 배제 */
    shared_data = new_value;
    write_unlock(&my_rwlock);
}`

const seqlockCode = `/* seqlock 선언 */
seqlock_t my_seqlock = __SEQLOCK_UNLOCKED(my_seqlock);

/* 쓰기 (드물게 발생) */
write_seqlock(&my_seqlock);
/* 데이터 변경 */
shared_data = new_value;
write_sequnlock(&my_seqlock);

/* 읽기 (자주 발생, 잠금 없음) */
unsigned int seq;
do {
    seq = read_seqbegin(&my_seqlock);  /* 시작 카운터 읽기 */
    /* 데이터 읽기 */
    local_copy = shared_data;
} while (read_seqretry(&my_seqlock, seq));  /* 쓰기 중이었으면 재시도 */
/* 쓰기가 없었다면 한 번에 성공 */

/* 실제 사용 예: 커널 시간 읽기 */
u64 ktime_get_ns(void)
{
    unsigned int seq;
    u64 nsec;
    do {
        seq = read_seqbegin(&tk_core.seq);
        nsec = timekeeping_get_ns(&tk_core.timekeeper);
    } while (read_seqretry(&tk_core.seq, seq));
    return nsec;
}`

const rwsemCode = `#include <linux/rwsem.h>

struct rw_semaphore my_rwsem;
init_rwsem(&my_rwsem);

/* 읽기 — 여럿이 동시에 가능 */
down_read(&my_rwsem);
/* ... 읽기 작업 ... */
up_read(&my_rwsem);

/* 쓰기 — 독점 */
down_write(&my_rwsem);
/* ... 쓰기 작업 ... */
up_write(&my_rwsem);`

const membarrierCode = `/* 잘못된 코드: CPU가 순서 바꿀 수 있음 */
a = 1;
b = 1;  /* CPU가 b를 먼저 쓸 수도 있음 */

/* 배리어로 순서 보장 */
a = 1;
smp_wmb();  /* a 쓰기가 b 쓰기보다 먼저 완료 보장 */
b = 1;

/* 생산자-소비자 패턴 */
/* Producer */
ring[head] = data;
smp_wmb();          /* 데이터 쓰기 완료 후 head 업데이트 */
head = (head + 1) & MASK;

/* Consumer */
if (head != tail) {
    smp_rmb();      /* head 읽기 완료 후 데이터 읽기 */
    data = ring[tail];
    tail = (tail + 1) & MASK;
}

/* acquire/release 패턴 (C11 원자적 연산) */
/* Publisher */
smp_store_release(&ptr, new_obj);  /* obj 초기화 완료 후 ptr 공개 */

/* Subscriber */
obj = smp_load_acquire(&ptr);  /* ptr 읽기 완료 후 obj 접근 */
if (obj) use(obj->field);      /* 안전: obj가 완전히 초기화됨 */`

const futexCode = `/* futex 기반 mutex 동작 (glibc 내부 간략화) */

/* 잠금 획득 시도 */
int mutex_lock(int *mutex)
{
    int c;

    /* 빠른 경로: CAS로 0→1 변경 (커널 불필요) */
    if ((c = cmpxchg(mutex, 0, 1)) == 0)
        return 0;  /* 성공 — 커널 진입 없음 */

    /* 느린 경로: 경쟁 발생 → 커널에 슬립 요청 */
    if (c != 2)
        c = xchg(mutex, 2);    /* 경쟁 상태(2)로 표시 */

    while (c != 0) {
        /* FUTEX_WAIT: mutex가 2이면 슬립 */
        futex(mutex, FUTEX_WAIT, 2, NULL, NULL, 0);
        c = xchg(mutex, 2);
    }
    return 0;
}

/* 잠금 해제 */
int mutex_unlock(int *mutex)
{
    /* 빠른 경로: 대기자 없으면 0으로 초기화 */
    if (atomic_dec(mutex) != 1) {
        *mutex = 0;
        /* 느린 경로: 대기자 깨우기 */
        futex(mutex, FUTEX_WAKE, 1, NULL, NULL, 0);
    }
    return 0;
}`

const rcuCode = `/* RCU 읽기 — lock 없이 O(1) */
rcu_read_lock();
struct my_data *p = rcu_dereference(global_ptr);
if (p)
    use_data(p->value);  /* grace period 동안 안전 */
rcu_read_unlock();

/* RCU 쓰기 — 복사 후 교체 */
struct my_data *old = global_ptr;
struct my_data *new = kmalloc(sizeof(*new), GFP_KERNEL);
*new = *old;
new->value = new_value;

rcu_assign_pointer(global_ptr, new);  /* 원자적 포인터 교체 */
synchronize_rcu();                     /* 모든 reader 완료 대기 */
kfree(old);                            /* 안전하게 해제 */`

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

    // AnimatedDiagram step state (lifted so RaceViz can receive it)
    const [raceStep, setRaceStep] = useState(0)

    const renderLockFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderLockComparison(svg, w, h, isDark)
        },
        [isDark]
    )

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Topic 09
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    동기화와 멀티코어 환경
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Synchronization & Multi-core
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    Race Condition, Spinlock, Mutex, RWLock, Atomic, RCU, Wait Queue, Completion, seqlock, 메모리 배리어
                </p>
            </header>

            {/* 9.1 Race Condition */}
            <Section id="s91" title="9.1  Race Condition">
                <Prose>
          두 스레드가 공유 자원에 동시 접근할 때 실행 순서에 따라 결과가 달라지는 문제입니다.
          단순해 보이는 <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">counter++</code>도
          LOAD → ADD → STORE 3단계 명령어로 이뤄지기 때문에 중간에 컨텍스트 스위치가 발생하면
          데이터가 손실될 수 있습니다.
                </Prose>

                <AnimatedDiagram
                    steps={raceAnimSteps}
                    renderStep={(step) => {
                        // sync external state for RaceViz
                        if (step !== raceStep) setRaceStep(step)
                        return <RaceViz step={step} />
                    }}
                    autoPlayInterval={2200}
                />

                <CodeBlock code={raceCode} language="c" filename="race_condition.c" />
            </Section>

            {/* 9.2 Spinlock */}
            <Section id="s92" title="9.2  Spinlock">
                <Prose>
          짧은 임계 구역에 사용합니다. 락을 얻을 때까지 CPU를 소모하며 바쁜 대기(busy-wait)를
          수행합니다. sleep 불가 컨텍스트(인터럽트 핸들러)에서도 사용할 수 있습니다.
                </Prose>

                <CodeBlock code={spinlockCode} language="c" filename="spinlock.c" />

                <InfoTable headers={['항목', '값']} rows={spinlockRows} />

                <div className="rounded-lg border border-orange-800/40 bg-orange-900/10 px-4 py-3 text-xs text-orange-200">
                    <span className="font-bold text-orange-300">주의:</span> <T id="spinlock">spinlock</T>을 보유한 상태에서
          sleep하면 데드락이 발생합니다. 임계 구역이 긴 경우 <T id="mutex">Mutex</T>를 사용하세요.
                </div>
            </Section>

            {/* 9.3 Mutex */}
            <Section id="s93" title="9.3  Mutex">
                <Prose>
          긴 임계 구역에 사용합니다. 락 대기 중 sleep하므로 CPU 낭비가 없습니다. 프로세스
          컨텍스트에서만 사용 가능하며, 인터럽트 핸들러에서는 <T id="spinlock">Spinlock</T>과 달리 사용할 수 없습니다.
                </Prose>

                <CodeBlock code={mutexCode} language="c" filename="mutex.c" />

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
                            <div className="font-mono font-bold text-xs" style={{ color: card.color }}>
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
          읽기는 동시에, 쓰기는 단독으로 수행합니다. 읽기가 많고 쓰기가 드문 자료구조에 적합합니다.
          다수의 reader가 공존할 수 있어 읽기 경쟁이 심한 경우 <T id="mutex">Mutex</T>보다 효율적입니다.
                </Prose>

                <InfoTable headers={['동작', '허용']} rows={rwlockRows} />

                <CodeBlock code={rwlockCode} language="c" filename="rwlock.c" />
            </Section>

            {/* Lock comparison chart */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 font-mono">
          락 종류별 상대적 오버헤드 비교
                </h3>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700">
                    <D3Container renderFn={renderLockFn} deps={[isDark]} height={220} />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
          RCU-R은 실질적으로 오버헤드가 거의 없습니다 (선점 비활성화만 수행).
                </p>
            </div>

            {/* 9.5 seqlock */}
            <Section id="s95" title="9.5  seqlock — 읽기 무잠금 동기화">
                <Prose>
          <T id="seqlock">seqlock</T>은 읽기 쪽이 잠금 없이 시퀀스 카운터를 확인하는 방식입니다. 쓰기가 드물고
          읽기가 매우 빈번한 경우(커널 timekeeping, jiffies 업데이트)에 최적입니다. 읽기 중
          쓰기가 발생했으면 카운터가 달라지므로 재시도합니다.
                </Prose>

                <CodeBlock code={seqlockCode} language="c" filename="include/linux/seqlock.h 사용 예" />

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
                            items: [
                                '읽기도 잠금 취득',
                                '쓰기 중 읽기 → 블록',
                                '읽기 항상 성공',
                                '일반적 목적',
                            ],
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
                            <div className="font-mono font-bold text-xs" style={{ color: card.color }}>
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
          rwsem은 RWLock과 달리 경쟁 시 슬립합니다. 인터럽트 컨텍스트 밖(프로세스 컨텍스트)에서
          사용하며, VFS inode lock 등 커널 내부에서 광범위하게 사용됩니다.
                </Prose>

                <CodeBlock code={rwsemCode} language="c" filename="rwsem.c" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                        {
                            label: 'RWLock (rwlock_t)',
                            items: [
                                '스핀 (바쁜 대기)',
                                '인터럽트 컨텍스트 사용 가능',
                                '슬립 불가',
                                '짧은 임계구역',
                            ],
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
                            <div className="font-mono font-bold text-xs" style={{ color: card.color }}>
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

            {/* 9.7 Atomic Operations */}
            <Section id="s97" title="9.7  Atomic Operations">
                <Prose>
          하드웨어 수준의 <T id="atomic">atomic</T> 연산으로 락 없이도 안전합니다. x86에서는 LOCK prefix를 통해
          버스를 잠그고 단일 명령어로 읽기-수정-쓰기를 수행합니다. 단순 카운터나 플래그에 사용하기
          적합합니다.
                </Prose>

                <InfoTable headers={['함수', '동작']} rows={atomicRows} />

                <div className="rounded-lg border border-cyan-800/40 bg-cyan-900/10 px-4 py-3 text-xs text-cyan-200">
                    <span className="font-bold text-cyan-300">CAS 패턴:</span>{' '}
                    <code className="font-mono">atomic_cmpxchg(&v, old, new)</code>은 락-프리 알고리즘의
          핵심입니다. 현재 값이 old와 같을 때만 new로 교체하며, 반환값으로 성공 여부를 판단합니다.
                </div>
            </Section>

            {/* 9.8 메모리 배리어 */}
            <Section id="s98" title="9.8  메모리 배리어 — CPU 재순서화 제어">
                <Prose>
          현대 CPU는 성능을 위해 메모리 읽기/쓰기 순서를 재배치합니다. 멀티코어 환경에서 이
          재배치가 동기화 버그를 일으킬 수 있어 <strong>메모리 배리어</strong>로 순서를 강제합니다.
                </Prose>

                <InfoTable
                    headers={['배리어', '함수', '설명']}
                    rows={membarrierRows}
                />

                <CodeBlock code={membarrierCode} language="c" filename="메모리 배리어 사용 예" />
            </Section>

            {/* 9.9 RCU */}
            <Section id="s99" title="9.9  RCU (Read-Copy-Update)">
                <Prose>
          읽기가 극도로 많은 자료구조(라우팅 테이블, 프로세스 목록 등)를 위한 락-프리 동기화
          메커니즘입니다. <T id="rcu">RCU</T> 읽기 측은 lock이 전혀 없습니다.
                </Prose>

                {/* RCU 3단계 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            step: '1. Read',
                            api: 'rcu_read_lock()',
                            desc: '실제 락 없음. 그냥 선점(preemption) 비활성화만 수행. O(1).',
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
                            <div className="font-mono text-xs font-bold" style={{ color: card.color }}>
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
                            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>

                <CodeBlock code={rcuCode} language="c" filename="rcu.c" />

                <div className="rounded-lg border border-green-800/40 bg-green-900/10 px-4 py-3 text-xs text-green-200">
                    <span className="font-bold text-green-300">사용 예:</span> 커널 내부의{' '}
                    <code className="font-mono">task_list</code>, 라우팅 테이블, 네트워크 디바이스 목록은 모두
          <T id="rcu">RCU</T>로 보호됩니다. 읽기 성능이 critical한 곳에서 RWLock 대비 큰 이점을 가집니다.
                </div>
            </Section>

            {/* 9.10 멀티코어 환경에서 네트워크 성능 */}
            <Section id="s910" title="9.10  멀티코어 환경에서 네트워크 성능">
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
                                <div
                                    className="text-xs font-mono font-bold mb-0.5"
                                    style={{ color: card.color }}
                                >
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

            {/* 9.11 futex */}
            <Section id="s911" title="9.11  futex — 유저공간 잠금의 커널 기반">
                <Prose>
          pthread_mutex, C++ std::mutex 등 유저공간 잠금의 대부분은 내부적으로{' '}
                    <strong>futex(Fast Userspace Mutex)</strong>를 사용합니다. 경쟁이 없을 때는 커널 진입
          없이 원자적 연산만으로 잠금을 획득해 성능을 최적화합니다.
                </Prose>

                <CodeBlock code={futexCode} language="c" filename="futex 동작 원리" />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'pthread_mutex',
                            desc: 'POSIX 스레드 뮤텍스. glibc가 futex 위에 구현.',
                            color: '#3b82f6',
                        },
                        {
                            title: 'Go sync.Mutex',
                            desc: 'Go 런타임의 Goroutine 스케줄러 통합 뮤텍스. futex 활용.',
                            color: '#10b981',
                        },
                        {
                            title: 'Java synchronized',
                            desc: 'JVM Monitor Lock. OS에 따라 futex 또는 유사 메커니즘.',
                            color: '#f59e0b',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl p-4 space-y-2"
                            style={{
                                background: card.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${card.color}44`,
                            }}
                        >
                            <div className="font-mono text-xs font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 9.12 Wait Queue */}
            <Section id="s912" title="9.12  Wait Queue — 블로킹 I/O의 핵심">
                <Prose>
          <T id="wait_queue">Wait Queue</T>는 커널에서 "특정 조건이 될 때까지 이 프로세스를 재워라"를 구현하는 기본
          메커니즘입니다. 소켓 read(), 파일 I/O, 디바이스 드라이버의 거의 모든 블로킹 동작이
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
                            <div className="font-mono text-xs font-bold" style={{ color: card.color }}>
                                {card.step}
                            </div>
                            <div className="space-y-1">
                                {card.lines.map((line, i) => (
                                    <div key={i} className="text-gray-500 dark:text-gray-400 text-xs font-mono leading-snug">
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
                        { cells: ['wait_event_interruptible_timeout(wq, cond, t)', '가능', '있음', '소켓 타임아웃 등'] },
                    ]}
                />
            </Section>

            {/* 9.13 Completion */}
            <Section id="s913" title="9.13  Completion — 일회성 완료 신호">
                <Prose>
          Wait Queue가 "반복적인 조건 대기"라면, <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">Completion</code>은
          "딱 한 번의 완료 신호"에 최적화된 간단한 인터페이스입니다. 드라이버 초기화, 스레드 종료
          대기, DMA 완료 신호에 주로 사용됩니다.
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
                            items: [
                                '조건 기반 반복 대기',
                                '다수 대기자',
                                '복잡한 조건 표현식',
                                '소켓/파일 I/O',
                            ],
                            color: '#3b82f6',
                        },
                        {
                            label: 'Completion',
                            items: [
                                '일회성 완료 신호',
                                '단순 "완료 여부"',
                                '초기화/종료 동기화',
                                'DMA 완료',
                            ],
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
                            <div className="font-mono font-bold text-xs" style={{ color: card.color }}>
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

            <nav className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">이전 토픽</div>
                    <a href="#/topic/08-xdp-ebpf" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        ← 08 · XDP, eBPF, 고성능 패킷 처리
                    </a>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">다음 토픽</div>
                    <a href="#/topic/10-drivers" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        10 · 디바이스 드라이버와 커널 모듈 →
                    </a>
                </div>
            </nav>
        </div>
    )
}
