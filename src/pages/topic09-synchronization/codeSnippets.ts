// ─────────────────────────────────────────────────────────────────────────────
// Topic 09 — 동기화와 멀티코어 환경
// 코드 문자열 상수 모음 (index.tsx에서 분리)
// ─────────────────────────────────────────────────────────────────────────────

export const raceCode = `/* 안전하지 않은 코드 */
static int counter = 0;

void increment(void) {
    counter++;  /* 실제로는 3개 명령어: LOAD, ADD, STORE */
}

/* 안전한 코드 — atomic 사용 */
static atomic_t counter = ATOMIC_INIT(0);

void increment_safe(void) {
    atomic_inc(&counter);  /* 단일 원자적 연산 */
}`

export const spinlockCode = `DEFINE_SPINLOCK(my_lock);

void critical_section(void) {
    unsigned long flags;

    /* 인터럽트 비활성화 + 락 획득 */
    spin_lock_irqsave(&my_lock, flags);

    /* 임계 구역 — 매우 짧아야 함 */
    shared_data++;

    /* 락 해제 + 인터럽트 복원 */
    spin_unlock_irqrestore(&my_lock, flags);
}`

export const mutexCode = `static DEFINE_MUTEX(my_mutex);

void long_operation(void) {
    mutex_lock(&my_mutex);   /* 락 획득 불가 시 sleep */

    /* 긴 작업 (파일 I/O, 메모리 할당 등) */
    do_long_work();

    mutex_unlock(&my_mutex);
}

/* 타임아웃 버전 */
if (mutex_lock_interruptible(&my_mutex) != 0)
    return -EINTR;  /* 시그널로 중단 */`

export const rwlockCode = `DEFINE_RWLOCK(my_rwlock);

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

export const seqlockCode = `/* seqlock 선언 */
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

export const rwsemCode = `#include <linux/rwsem.h>

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

export const membarrierCode = `/* 잘못된 코드: CPU가 순서 바꿀 수 있음 */
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

export const futexCode = `/* futex 기반 mutex 동작 (glibc 내부 간략화) */

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

export const rcuCode = `/* RCU 읽기 — lock 없이 O(1) */
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

export const rcuGracePeriodCode = `/* RCU 업데이터 패턴 */
struct my_data *old_ptr = rcu_dereference(global_ptr);
struct my_data *new_ptr = kmalloc(sizeof(*new_ptr), GFP_KERNEL);
*new_ptr = *old_ptr;
new_ptr->value = new_value;

/* 원자적 포인터 교체 (publish) */
rcu_assign_pointer(global_ptr, new_ptr);

/* Grace Period 대기 후 구버전 해제 */
synchronize_rcu();          /* 블로킹: 모든 독자 완료 대기 */
kfree(old_ptr);             /* 이제 안전하게 해제 */

/* 또는 비동기 방식 */
call_rcu(&old_ptr->rcu_head, my_free_callback);
/* Grace Period 완료 시 my_free_callback(old_ptr) 자동 호출 */

/* RCU 독자 패턴 */
rcu_read_lock();
struct my_data *p = rcu_dereference(global_ptr);
/* p 사용 (이 구간 동안 p는 해제되지 않음이 보장) */
rcu_read_unlock();`

export const syncParamsCode = `# RT 태스크 CPU 시간 제한 확인
sysctl kernel.sched_rt_runtime_us
# 950000 → 1초 중 950ms까지 RT 태스크 사용 가능

# hung task 감지 설정
sysctl kernel.hung_task_timeout_secs
# 120 → 120초 이상 TASK_UNINTERRUPTIBLE이면 경고

# lock 통계 수집 활성화 (CONFIG_LOCK_STAT 필요)
sysctl -w kernel.lock_stat=1
cat /proc/lock_stat | head -30

# 패닉 관련 설정
sysctl kernel.panic           # 0이면 패닉 후 대기
sysctl kernel.panic_on_warn   # 1이면 WARN()에서 즉시 패닉`
