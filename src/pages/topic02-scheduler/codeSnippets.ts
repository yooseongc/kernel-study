// ── 2.2 task_struct 코드 ────────────────────────────────────────────────────
export const taskStructCode = `struct task_struct {
    /* ── 상태 ── */
    unsigned int        __state;      /* TASK_RUNNING, TASK_INTERRUPTIBLE, ... */
    int                 exit_state;   /* EXIT_ZOMBIE, EXIT_DEAD */

    /* ── 식별자 ── */
    pid_t               pid;          /* 이 태스크의 고유 ID */
    pid_t               tgid;         /* 스레드 그룹 ID (메인 스레드의 PID) */
    char                comm[16];     /* 프로세스 이름 (ps에서 보이는 이름) */

    /* ── 주소 공간 ── */
    struct mm_struct    *mm;          /* 가상 주소 공간 (NULL = 커널 스레드) */
    struct mm_struct    *active_mm;   /* 실제 사용 중인 mm (커널 스레드용) */

    /* ── 스케줄러 ── */
    int                 prio;         /* 동적 우선순위 (nice + 조정값) */
    int                 static_prio;  /* 정적 우선순위 (nice 값 기반) */
    struct sched_entity se;           /* CFS 스케줄링 엔티티 (vruntime 포함) */
    struct sched_rt_entity rt;        /* RT 스케줄러 엔티티 */
    const struct sched_class *sched_class; /* 소속 스케줄러 클래스 */

    /* ── 파일 시스템 ── */
    struct fs_struct    *fs;          /* 루트/현재 디렉토리 */
    struct files_struct *files;       /* 열린 파일 디스크립터 테이블 */

    /* ── 계층 구조 ── */
    struct task_struct  *parent;      /* 부모 프로세스 */
    struct list_head    children;     /* 자식 목록 */
    struct list_head    sibling;      /* 형제 목록 */

    /* ── 신호 ── */
    struct signal_struct *signal;     /* 스레드 그룹 공유 신호 정보 */
    sigset_t            blocked;      /* 블록된 시그널 마스크 */
};`

export const schedEntityCode = `struct sched_entity {
    struct load_weight  load;       /* 이 엔티티의 CPU 가중치 */
    struct rb_node      run_node;   /* CFS 런큐의 Red-Black 트리 노드 */
    u64                 vruntime;   /* 가상 실행 시간 — CFS 정렬 기준 */
    u64                 exec_start; /* 마지막 실행 시작 시간 (ns) */
    u64                 sum_exec_runtime; /* 총 CPU 사용 시간 (ns) */
};`

// ── 2.10 스케줄러 통계 & 로드밸런싱 코드 ────────────────────────────────────
export const schedstatCode = `# schedstat 형식: CPU별 통계
cat /proc/schedstat
# cpu0 0 0 731 659 731 659 3645037 1242 0
# 컬럼: yld_count, yld_act_count, sched_count, sched_goidle,
#        ttwu_count, ttwu_local, run_delay(ns), pcount

# 읽기 쉬운 형태로 파싱
awk '/^cpu[0-9]/ {
    printf "CPU%s: schedules=%s, run_delay=%sms\\n",
    substr($1,4), $8, $9/1000000
}' /proc/schedstat

# 특정 프로세스의 스케줄링 통계
cat /proc/$(pgrep nginx)/schedstat
# run_time(ns)  wait_time(ns)  timeslices
# 1234567890    9876543210     5678

# 스케줄러 레이턴시 확인 (schedtool)
schedtool -r $(pgrep nginx)  # RT 우선순위 확인`

export const schedDebugCode = `# 전체 스케줄러 상태 덤프
cat /proc/sched_debug | head -60

# 주요 정보:
# .nr_running     : 현재 실행 가능한 태스크 수
# .load           : 런큐 부하 (weight 합계)
# cfs_rq->min_vruntime : CFS 최소 vruntime
# current         : 현재 실행 중인 태스크

# CPU별 런큐 부하 모니터링
watch -n 1 'grep "\\.load\\|nr_running\\|curr->" /proc/sched_debug | head -40'

# 태스크별 vruntime 확인 (CFS 트리 스냅샷)
cat /proc/sched_debug | grep -A3 "cfs_rq\\[0\\]"`

export const loadBalanceCode = `/* 주기적 로드밸런싱 트리거 */
static void run_rebalance_domains(struct softirq_action *h)
{
    /* 현재 CPU의 런큐 부하 vs 다른 CPU 비교 */
    rebalance_domains(this_rq(), idle);
}

/* 불균형 감지 및 태스크 이동 */
static int load_balance(int this_cpu, struct rq *this_rq,
                         struct sched_domain *sd, ...)
{
    struct rq *busiest;

    /* 가장 바쁜 CPU 찾기 */
    busiest = find_busiest_queue(this_cpu, sd, ...);

    /* 태스크 이동 (busiest → this_rq) */
    ld_moved = move_tasks(this_rq, this_cpu, busiest, ...);

    return ld_moved;
}

/* 유휴 CPU 즉시 태스크 당기기 */
static int newidle_balance(struct rq *this_rq, ...)
{
    /* CPU가 idle 상태 진입 시 즉시 다른 CPU에서 태스크 가져옴 */
    pulled_task = load_balance(this_cpu, this_rq, sd, CPU_NEWLY_IDLE, ...);
}`

// ── 2.9 cgroups 코드 ─────────────────────────────────────────────────────────
export const cgroupFsCode = `# cgroup v2 파일시스템 구조 (/sys/fs/cgroup/)
/sys/fs/cgroup/
├── cgroup.controllers    # 활성 서브시스템: "cpuset cpu io memory pids"
├── cgroup.procs          # 이 cgroup에 속한 PID 목록
├── cpu.max               # 루트: "max 100000" (제한 없음)
├── memory.max            # 루트: "max"
│
├── system.slice/         # systemd 관리 서비스 그룹
│   ├── sshd.service/
│   └── nginx.service/
│       ├── memory.max    # "268435456" (256 MiB)
│       └── cgroup.procs  # nginx 워커 PID 목록
│
└── myapp/                # 수동 생성 cgroup
    ├── cpu.max           # "200000 1000000" (20% of 1 CPU)
    ├── memory.max        # "536870912" (512 MiB)
    └── cgroup.procs      # 이 그룹에 속할 PID 추가`

export const cgroupCreateCode = `# cgroup v2: 그룹 생성 → 자원 제한 → 프로세스 이동

# 1. 디렉토리 생성 = cgroup 생성
mkdir /sys/fs/cgroup/myapp

# 2. CPU 제한: period 1,000,000 µs 중 200,000 µs 사용 (20%)
echo "200000 1000000" > /sys/fs/cgroup/myapp/cpu.max

# 3. 메모리 상한 512 MiB
echo "536870912" > /sys/fs/cgroup/myapp/memory.max

# 4. 현재 쉘을 그룹으로 이동 (이후 fork된 자식도 자동 소속)
echo $$ > /sys/fs/cgroup/myapp/cgroup.procs

# 5. 확인
cat /sys/fs/cgroup/myapp/cpu.stat`

export const cgroupTaskStructCode = `struct task_struct {
    ...
    /* ── cgroup 연결 ── */
    struct css_set __rcu *cgroups;   /* 이 태스크가 속한 cgroup 세트 */
    struct list_head cg_list;        /* css_set 내 태스크 목록 노드 */
    ...
};

/* css_set: 각 서브시스템별 cgroup_subsys_state 포인터 집합 */
struct css_set {
    struct cgroup_subsys_state *subsys[CGROUP_SUBSYS_COUNT];
    /* cpu_cgroup, mem_cgroup, blkcg, ... */
    refcount_t refcount;
    struct list_head tasks; /* 이 css_set을 공유하는 task 목록 */
};`

export const prioToWeightCode = `/* nice 값 → weight 변환 (kernel/sched/core.c) */
const int sched_prio_to_weight[40] = {
 /* -20 */     88761,  71755,  56483,  46273,  36291,
 /* -15 */     29154,  23254,  18705,  14949,  11916,
 /* -10 */      9548,   7620,   6100,   4904,   3906,
 /*  -5 */      3121,   2501,   1991,   1586,   1277,
 /*   0 */      1024,    820,    655,    526,    423,
 /*   5 */       335,    272,    215,    172,    137,
 /*  10 */       110,     87,     70,     56,     45,
 /*  15 */        36,     29,     23,     18,     15,
};

/* vruntime 업데이트 (CFS의 핵심) */
static void update_curr(struct cfs_rq *cfs_rq)
{
    u64 delta_exec = now - curr->exec_start;

    /* weight가 높을수록 vruntime 증가가 느려 더 많이 실행됨 */
    curr->vruntime += calc_delta_fair(delta_exec, curr);
}

static u64 calc_delta_fair(u64 delta, struct sched_entity *se)
{
    /* NICE_0_LOAD(1024) / se->load.weight 비율로 스케일 */
    return __calc_delta(delta, NICE_0_LOAD, &se->load);
}`

export const scheduleCode = `/* 스케줄러 진입점 — 자발적/비자발적 컨텍스트 스위치 공통 경로 */
static void __sched notrace __schedule(unsigned int sched_mode)
{
    struct task_struct *prev, *next;
    struct rq *rq;

    rq = cpu_rq(cpu);
    prev = rq->curr;

    /* 1. 현재 태스크 상태 확인 */
    if (signal_pending_state(prev->__state, prev))
        prev->__state = TASK_RUNNING;

    /* 2. 다음 실행할 태스크 선택 */
    next = pick_next_task(rq, prev, &rf);
    /*   └─ stop_task → dl_task → rt_task → fair_task → idle_task
           (우선순위 순으로 클래스 탐색) */

    /* 3. 같은 태스크면 스위치 생략 */
    if (likely(prev != next)) {
        rq->nr_switches++;

        /* 4. 실제 컨텍스트 스위치 */
        rq = context_switch(rq, prev, next, &rf);
        /*   └─ switch_mm()  : 페이지 테이블 교체 (CR3 레지스터)
               switch_to()   : 스택/레지스터 교체 (어셈블리) */
    }
}

/* pick_next_task 내부 — 스케줄러 클래스 우선순위 */
static inline struct task_struct *
pick_next_task(struct rq *rq, struct task_struct *prev, ...)
{
    /* STOP > DEADLINE > RT > FAIR(CFS) > IDLE 순서 */
    for_each_class(class)
        if ((p = class->pick_next_task(rq)))
            return p;
}`

// ── 2.11 SCHED_DEADLINE 코드 예제 ────────────────────────────────────────────
export const deadlineSettattrCode = `/* SCHED_DEADLINE 설정 — sched_setattr() */
#include <linux/sched.h>

struct sched_attr attr = {
    .size        = sizeof(attr),
    .sched_policy   = SCHED_DEADLINE,
    .sched_runtime  =  5000000,   /* 5 ms */
    .sched_deadline = 10000000,   /* 10 ms */
    .sched_period   = 20000000,   /* 20 ms — 50Hz */
};

if (sched_setattr(0, &attr, 0) < 0) {
    /* -EBUSY: 합계 대역폭 초과로 허용 거부 */
    perror("sched_setattr");
    exit(1);
}

/* 확인: /proc/PID/sched */
// dl_runtime   : 5000000
// dl_deadline  : 10000000
// dl_period    : 20000000`

export const deadlineChrtCode = `# SCHED_DEADLINE 프로세스 실행 (chrt 8 이상)
chrt --deadline --sched-runtime 5000000 \\
     --sched-deadline 10000000 \\
     --sched-period 20000000 \\
     0 ./realtime_app

# 현재 스케줄링 정책 확인
chrt -p $$
# scheduling policy: SCHED_DEADLINE
# runtime/deadline/period: 5000000/10000000/20000000`

// ── 2.12 관련 커널 파라미터 ──────────────────────────────────────────────────
export const schedParamsCode = `# CFS 파라미터 확인
sysctl kernel.sched_min_granularity_ns
sysctl kernel.sched_latency_ns

# 실시간 변경
sysctl -w kernel.sched_latency_ns=4000000

# /proc/sys/kernel 직접 접근
cat /proc/sys/kernel/sched_min_granularity_ns`
