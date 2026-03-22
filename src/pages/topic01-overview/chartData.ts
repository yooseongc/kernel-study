// topic01-overview 차트/코드 상수

export const syscallFlowChart = `
sequenceDiagram
    participant U as 유저 공간 (User Space)
    participant L as libc (glibc)
    participant K as 커널 공간 (Kernel Space)
    participant H as 하드웨어

    U->>L: write(fd, buf, len)
    L->>K: syscall #1 (SYSCALL 명령어)
    Note over K: 권한 레벨 Ring3 → Ring0
    K->>K: sys_write() 실행
    K->>H: 디바이스 드라이버 호출
    H-->>K: 완료 신호 (IRQ)
    K-->>U: 반환값 (n bytes written)
    Note over U: 다시 Ring3로 복귀
`

export const kernelStructureChart = `
graph TB
    subgraph UserSpace["👤 유저 공간 (User Space)"]
        App["앱 프로세스<br/>(bash, nginx, ...)"]
        Lib["시스템 라이브러리<br/>(glibc)"]
    end

    subgraph SyscallLayer["🔌 시스템 콜 인터페이스"]
        SC["System Call Table<br/>sys_read / sys_write / sys_fork ..."]
    end

    subgraph KernelSpace["⚙️ 커널 공간 (Kernel Space)"]
        FS["파일 시스템<br/>(ext4, VFS)"]
        MM["메모리 관리<br/>(Buddy, SLUB)"]
        NET["네트워크 스택<br/>(TCP/IP)"]
        SCHED["스케줄러<br/>(CFS)"]
        IPC["프로세스 간 통신<br/>(pipe, socket)"]
    end

    subgraph HW["🖥️ 하드웨어"]
        CPU["CPU"]
        RAM["RAM"]
        NIC["NIC"]
        DISK["Disk"]
    end

    App --> Lib --> SC
    SC --> FS & MM & NET & SCHED & IPC
    FS --> DISK
    MM --> RAM
    NET --> NIC
    SCHED --> CPU
`

export const taskStructCode = `/* include/linux/sched.h (simplified) */
struct task_struct {
    volatile long       state;        /* 프로세스 상태 (RUNNING, SLEEPING, ...) */
    void               *stack;        /* 커널 스택 포인터 */
    pid_t               pid;          /* 프로세스 ID */
    pid_t               tgid;         /* 스레드 그룹 ID */

    struct mm_struct   *mm;           /* 가상 메모리 구조체 (NULL이면 커널 스레드) */
    struct files_struct *files;       /* 열린 파일 디스크립터 테이블 */
    struct task_struct *parent;       /* 부모 프로세스 */
    struct list_head    children;     /* 자식 프로세스 목록 */

    struct sched_entity se;           /* CFS 스케줄러 엔티티 */
    cpumask_t           cpus_allowed; /* 실행 가능한 CPU 마스크 */
};`

export const syscallAnimSteps = [
    {
        label: 'write(fd, buf, n) 호출',
        description: '애플리케이션이 glibc의 write() 함수를 호출합니다. 아직 유저 공간(Ring 3) 안에 있습니다.',
    },
    {
        label: 'glibc wrapper — syscall 번호 설정',
        description: 'glibc wrapper가 시스템 콜 번호(SYS_write = 1)를 rax 레지스터에 저장하고 syscall 명령을 실행합니다.',
    },
    {
        label: 'CPU Ring 전환 (Ring 3 → Ring 0)',
        description: 'CPU가 MSR_LSTAR에 저장된 커널 진입점으로 점프하고, RSP를 커널 스택으로 교체합니다.',
    },
    {
        label: 'entry_SYSCALL_64 — 레지스터 저장',
        description: '어셈블리 진입점 entry_SYSCALL_64가 유저 레지스터를 저장하고 do_syscall_64()를 호출합니다.',
    },
    {
        label: 'sys_call_table 조회 → 핸들러 실행',
        description: 'sys_call_table[rax] 를 조회해 __x64_sys_write() 핸들러를 찾아 실행합니다.',
    },
    {
        label: '커널 작업 완료 — 반환값 설정',
        description: '커널이 VFS write 작업을 완료하고 반환값(쓴 바이트 수)을 rax 레지스터에 설정합니다.',
    },
    {
        label: 'sysretq — Ring 0 → Ring 3 복귀',
        description: 'sysretq 명령으로 유저 공간으로 복귀합니다. 유저 스택이 복원되고 glibc가 errno를 처리합니다.',
    },
]

export const syscallEntryCode = `/* 1. glibc syscall wrapper (간략화) */
ssize_t write(int fd, const void *buf, size_t count)
{
    return syscall(SYS_write, fd, buf, count);
    /* → mov $1, %rax; syscall */
}

/* 2. 커널 진입점 (arch/x86/entry/entry_64.S) */
SYM_CODE_START(entry_SYSCALL_64):
    swapgs                          /* GS 베이스를 커널 per-CPU로 교체 */
    movq %rsp, PER_CPU_VAR(cpu_tss_rw + TSS_sp2)
    movq PER_CPU_VAR(cpu_current_top_of_stack), %rsp
    pushq $__USER_DS; pushq %rcx    /* 유저 스택 포인터 저장 */
    call do_syscall_64

/* 3. 시스템 콜 디스패치 (arch/x86/entry/common.c) */
__visible noinstr void do_syscall_64(struct pt_regs *regs, int nr)
{
    if (likely(nr < NR_syscalls))
        regs->ax = sys_call_table[nr](regs);  /* 핸들러 호출 */
    syscall_exit_to_user_mode(regs);
}

/* 4. 실제 write 핸들러 */
SYSCALL_DEFINE3(write, unsigned int, fd, const char __user *, buf, size_t, count)
{
    struct fd f = fdget_pos(fd);
    loff_t pos = file_pos_read(f.file);
    ret = vfs_write(f.file, buf, count, &pos);  /* VFS로 전달 */
    return ret;
}`

export const syscallCatalogCode = `# x86-64 syscall 테이블
cat /usr/include/asm/unistd_64.h | grep -E "define __NR_(read|write|open|fork|execve|mmap|socket|epoll)"

# strace로 프로그램의 syscall 추적
strace -c ls /tmp
# % time  seconds  usecs/call  calls  syscall
# 22.34   0.000312    6         52    read
# 18.72   0.000261    26        10    mmap
# ...

# strace 상세 출력 (syscall 이름 + 인자)
strace -e trace=openat,read,write cat /etc/hostname
# openat(AT_FDCWD, "/etc/hostname", O_RDONLY) = 3
# read(3, "myserver\\n", 131072) = 9
# write(1, "myserver\\n", 9) = 9

# perf로 syscall 빈도 측정
perf stat -e syscalls:sys_enter_read,syscalls:sys_enter_write ./myapp

# /proc/PID/syscall — 현재 진행 중인 syscall
cat /proc/$$/syscall
# 7 0x1 0x7ffd1234 0x100 ...  ← syscall 번호, 인자들`

export const syscallTableRows = [
    { name: 'open()',       nr: 2,   role: '파일 열기 → fd 반환',                   concepts: 'VFS, dentry, inode' },
    { name: 'read()',       nr: 0,   role: 'fd에서 데이터 읽기',                    concepts: '페이지 캐시, copy_to_user' },
    { name: 'write()',      nr: 1,   role: 'fd에 데이터 쓰기',                      concepts: 'dirty page, write-back' },
    { name: 'fork()',       nr: 57,  role: '자식 프로세스 생성',                    concepts: 'CoW, task_struct 복제' },
    { name: 'execve()',     nr: 59,  role: '새 프로그램 로드·실행',                  concepts: 'ELF, 메모리 맵 교체' },
    { name: 'mmap()',       nr: 9,   role: '가상 메모리 영역 매핑',                  concepts: 'VMA, 파일 매핑, 익명 매핑' },
    { name: 'socket()',     nr: 41,  role: '소켓 fd 생성',                          concepts: '프로토콜 패밀리, sk_buff' },
    { name: 'epoll_wait()', nr: 232, role: 'I/O 이벤트 다중 대기',                  concepts: '이벤트 루프, 레벨/엣지 트리거' },
    { name: 'clone()',      nr: 56,  role: '스레드/프로세스 생성 (플래그 제어)',      concepts: 'CLONE_VM, CLONE_NEWPID' },
    { name: 'ioctl()',      nr: 16,  role: '디바이스 제어 명령',                    concepts: '캐릭터 디바이스, 드라이버 인터페이스' },
]

export const forkCompareRows = [
    { fn: 'fork()',   posix: 'O', memory: 'CoW (독립)',              usage: '자식 프로세스 생성' },
    { fn: 'vfork()',  posix: 'O', memory: '완전 공유 (exec 전까지)', usage: '구식, execve 직전에만 사용' },
    { fn: 'clone()',  posix: 'X (리눅스)', memory: '플래그로 선택',  usage: '스레드(CLONE_VM), 컨테이너(CLONE_NEWPID)' },
]
