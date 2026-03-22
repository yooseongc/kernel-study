// ─────────────────────────────────────────────────────────────────────────────
// Topic 03 — 가상 메모리와 메모리 관리
// 코드 문자열 상수 모음 (index.tsx에서 분리)
// ─────────────────────────────────────────────────────────────────────────────

// 3.3  mm_struct & VMA
export const mmStructCode = `// mm_struct (include/linux/mm_types.h)
struct mm_struct {
    struct maple_tree   mm_mt;        /* VMA 트리 (커널 6.1+, 이전은 RB 트리) */
    unsigned long       mmap_base;    /* mmap 시작 주소 */
    unsigned long       task_size;    /* 유저 공간 최대 크기 */
    pgd_t               *pgd;         /* 페이지 글로벌 디렉토리 물리 주소 */

    atomic_t            mm_users;     /* 이 mm을 공유하는 스레드 수 */
    atomic_t            mm_count;     /* mm_struct 자체 참조 수 */

    unsigned long       start_code, end_code;   /* .text 영역 */
    unsigned long       start_data, end_data;   /* .data 영역 */
    unsigned long       start_brk,  brk;        /* heap 시작/현재 끝 */
    unsigned long       start_stack;            /* stack 시작 */
    unsigned long       arg_start,  arg_end;    /* argv 영역 */
    unsigned long       env_start,  env_end;    /* envp 영역 */

    struct list_head    mmlist;       /* 모든 mm_struct 연결 리스트 */
};`

export const vmaCode = `// vm_area_struct — 하나의 연속된 가상 주소 영역
struct vm_area_struct {
    unsigned long       vm_start;     /* 이 VMA의 시작 주소 */
    unsigned long       vm_end;       /* 이 VMA의 끝 주소 (exclusive) */
    pgprot_t            vm_page_prot; /* 접근 권한 (R/W/X) */
    unsigned long       vm_flags;     /* VM_READ | VM_WRITE | VM_EXEC | VM_SHARED */

    struct mm_struct    *vm_mm;       /* 소속 mm_struct */
    struct file         *vm_file;     /* 파일 매핑이면 파일 포인터, 아니면 NULL */
    const struct vm_operations_struct *vm_ops; /* fault, open, close 콜백 */
};`

export const mmapExampleCode = `/* 익명 매핑 — malloc(large)의 내부 동작 */
void *ptr = mmap(NULL, 4096 * 10,
                 PROT_READ | PROT_WRITE,
                 MAP_PRIVATE | MAP_ANONYMOUS,
                 -1, 0);

/* 파일 매핑 — 파일을 메모리처럼 접근 */
int fd = open("data.bin", O_RDONLY);
void *data = mmap(NULL, file_size,
                  PROT_READ,
                  MAP_SHARED,  /* 또는 MAP_PRIVATE */
                  fd, 0);
close(fd);  /* fd 닫아도 매핑 유지 */

/* 해제 */
munmap(ptr, size);

/* 커널 내부: do_mmap() → vm_mmap() → mmap_region()
   → vma 생성 → mm->mmap 리스트에 삽입 */`

// 3.7  memory cgroup
export const memcgCode = `# memory cgroup v2 설정
echo "536870912" > /sys/fs/cgroup/myapp/memory.max   # 512MB 상한
echo "402653184" > /sys/fs/cgroup/myapp/memory.high  # 384MB soft 제한

# OOM 발생 시 kill하지 말고 pause만 (컨테이너 런타임이 처리)
echo 1 > /sys/fs/cgroup/myapp/memory.oom_control

# 통계 확인
cat /sys/fs/cgroup/myapp/memory.stat`

export const oomBashCode = `# 프로세스별 OOM 점수 확인
cat /proc/$(pgrep nginx)/oom_score
cat /proc/$(pgrep nginx)/oom_score_adj

# 중요한 프로세스 보호 (절대 종료 안 함)
echo -1000 > /proc/$(pgrep sshd)/oom_score_adj

# 덜 중요한 프로세스를 우선 종료
echo 500 > /proc/$(pgrep worker)/oom_score_adj

# OOM 이벤트 확인
dmesg | grep -i "oom\\|killed process"
# 예: Out of memory: Killed process 1234 (myapp) total-vm:2GB

# cgroup v2로 OOM 범위 제한
echo 512M > /sys/fs/cgroup/myapp/memory.max
# → myapp 그룹만 OOM, 시스템 전체 보호`

export const oomKillCode = `/* OOM 희생자 선택 */
static struct task_struct *oom_badness(struct task_struct *p,
                                        unsigned long totalpages)
{
    long points;

    /* 메모리 사용량 기반 점수 (0~1000) */
    points = get_mm_rss(p->mm) + get_mm_counter(p->mm, MM_SWAPENTS);
    points *= 1000 / totalpages;

    /* oom_score_adj 보정 적용 */
    points += p->signal->oom_score_adj;

    return points;  /* 높을수록 먼저 종료 */
}`

// 3.8  vmalloc vs kmalloc
export const kmallocCode = `/* kmalloc — 물리적 연속 보장, SLUB에서 할당 */
void *buf = kmalloc(size, GFP_KERNEL);
/*   GFP_KERNEL: 슬립 허용 (프로세스 컨텍스트)
     GFP_ATOMIC: 슬립 불가 (인터럽트 컨텍스트)
     GFP_DMA:    DMA 가능 영역에서 할당 (<16MB on x86) */

/* 초기화된 버전 */
void *buf = kzalloc(size, GFP_KERNEL);  /* 0으로 초기화 */

/* 해제 */
kfree(buf);

/* vmalloc — 가상 연속, 물리 비연속 허용 */
void *buf = vmalloc(size);              /* 슬립 허용 */
void *buf = vzalloc(size);             /* 0으로 초기화 */
vfree(buf);

/* 실제 물리 주소 확인 (불연속성 증명) */
for (i = 0; i < size; i += PAGE_SIZE) {
    unsigned long vaddr = (unsigned long)buf + i;
    unsigned long paddr = virt_to_phys((void *)vaddr);
    /* vmalloc: 각 페이지마다 paddr이 불규칙 */
    /* kmalloc: paddr이 연속적으로 증가 */
}

/* 중간 크기: kvmalloc — kmalloc 먼저 시도, 실패 시 vmalloc */
void *buf = kvmalloc(size, GFP_KERNEL);
kvfree(buf);`

// 3.9  kswapd와 메모리 회수
export const kswapdBashCode = `# 워터마크 확인
cat /proc/zoneinfo | grep -E "min|low|high|free"

# LRU 리스트 현황
cat /proc/meminfo | grep -E "Active|Inactive|Cached|SwapCached"

# kswapd 활동 확인
vmstat 1 5
# si(swap in), so(swap out) 컬럼이 0이면 정상
# pgscand: 직접 회수 횟수

# 페이지 회수 통계
cat /proc/vmstat | grep -E "pgscan|pgsteal|pgswap"

# 특정 프로세스 페이지 회수 제한
echo mlock > /proc/sys/vm/swappiness  # 0~100, 낮을수록 스왑 자제
echo 10 > /proc/sys/vm/swappiness     # 데이터베이스 권장값`

export const kswapdCCode = `/* kswapd 메인 루프 */
static int kswapd(void *p)
{
    pg_data_t *pgdat = (pg_data_t *)p;

    for ( ; ; ) {
        /* 워터마크 이하가 되면 깨어남 */
        wait_event_freezable(pgdat->kswapd_wait,
                             kswapd_work_pending(pgdat));

        /* 페이지 회수 시작 */
        balance_pgdat(pgdat, ...);
        /*   └─ shrink_node()
               └─ shrink_list() : Active → Inactive 강등
               └─ reclaim_clean_pages() : 파일 캐시 먼저
               └─ swap_out() : 익명 페이지 → 스왑 */
    }
}`

// 3.10  Huge Pages / THP
export const hugepagesBashCode = `# === 명시적 Huge Pages ===
# 2MB Huge Page 1024개 예약 (= 2GB)
echo 1024 > /proc/sys/vm/nr_hugepages

# 현재 상태 확인
cat /proc/meminfo | grep -i huge
# HugePages_Total: 1024
# HugePages_Free:  1020
# Hugepagesize:    2048 kB

# 1GB Huge Page (부팅 파라미터)
# hugepagesz=1G hugepages=16

# === THP 설정 ===
# THP 상태 확인/변경
cat /sys/kernel/mm/transparent_hugepage/enabled
# [always] madvise never

echo madvise > /sys/kernel/mm/transparent_hugepage/enabled
# always: 항상 THP 시도
# madvise: MADV_HUGEPAGE 요청 시에만
# never: THP 비활성화 (Redis, Cassandra 권장)

# THP 통계
cat /proc/vmstat | grep thp
# thp_fault_alloc: THP로 할당된 횟수
# thp_collapse_alloc: khugepaged 병합 횟수

# === 애플리케이션에서 명시적 사용 ===
# madvise로 특정 영역만 THP 요청
madvise(ptr, size, MADV_HUGEPAGE);   # THP 요청
madvise(ptr, size, MADV_NOHUGEPAGE); # THP 억제 (Redis 등)`

// 3.11  CoW — Copy-on-Write
export const cowBashCode = `# CoW 동작 확인 — /proc/PID/smaps의 Private_Dirty vs Shared_Clean
cat /proc/$$/smaps | grep -E "^[0-9a-f]|Private_Dirty|Shared_Clean"

# fork 전후 RSS(Resident Set Size) 변화 관찰
# fork 직후: 자식 RSS ≈ 0 (CoW로 공유 중)
# 자식이 쓰기 후: RSS 증가 (페이지가 복사됨)
ps aux | grep myprocess

# perf로 page fault 카운트
perf stat -e major-faults,minor-faults ./my_fork_program
# minor-faults: X  ← CoW로 발생한 페이지 복사 횟수`

// 3.12  NUMA 메모리 정책
export const numaCtrlCode = `/* mbind() — 특정 메모리 범위에 NUMA 정책 적용 */
#include <numaif.h>

unsigned long nodemask = 1 << 0;  /* Node 0 */
mbind(addr, length,
      MPOL_BIND,
      &nodemask, sizeof(nodemask) * 8,
      MPOL_MF_MOVE);  /* 기존 페이지도 이동 */

/* set_mempolicy() — 프로세스 전체 정책 */
set_mempolicy(MPOL_INTERLEAVE, &nodemask, 2);`

export const numaBashCode = `# numactl — NUMA 정책으로 프로그램 실행
numactl --cpunodebind=0 --membind=0 ./db_server   # Node 0에 고정
numactl --interleave=all ./memory_intensive_app    # 전 노드 분산

# NUMA 토폴로지 확인
numactl --hardware
# available: 2 nodes (0-1)
# node 0 cpus: 0-15  node 0 size: 65536 MB
# node 1 cpus: 16-31 node 1 size: 65536 MB
# node distances: node 0 1
#                      0: 10 21
#                      1: 21 10

# 현재 NUMA 통계 (원격 접근 비율 확인)
numastat -p $$
# Node  0    1
# Numa_Hit   ...  ← 로컬 노드 히트
# Numa_Miss  ...  ← 원격 노드에서 할당`

// ── 3.13 관련 커널 파라미터 ──────────────────────────────────────────────────
export const memParamsCode = `# 주요 VM 파라미터 확인
sysctl vm.swappiness
sysctl vm.overcommit_memory
sysctl vm.dirty_ratio

# dirty 비율 변경
sysctl -w vm.dirty_ratio=30
sysctl -w vm.dirty_background_ratio=15

# HugePages 설정
sysctl -w vm.nr_hugepages=128
cat /proc/meminfo | grep HugePages

# THP 설정 확인/변경
cat /sys/kernel/mm/transparent_hugepage/enabled
echo madvise > /sys/kernel/mm/transparent_hugepage/enabled`
