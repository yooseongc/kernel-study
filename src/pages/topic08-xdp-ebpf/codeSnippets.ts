// ─────────────────────────────────────────────────────────────────────────────
// Topic 08 — XDP, eBPF, 고성능 패킷 처리
// 코드 문자열 상수 모음 (index.tsx에서 분리)
// ─────────────────────────────────────────────────────────────────────────────

export const xdpDdosCode = `/* XDP DDoS 방어: 특정 IP 차단 */
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 10000);
    __type(key, __u32);    /* source IP */
    __type(value, __u64);  /* packet count */
} blocked_ips SEC(".maps");

SEC("xdp")
int xdp_filter(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end) return XDP_DROP;

    if (eth->h_proto != bpf_htons(ETH_P_IP)) return XDP_PASS;

    struct iphdr *ip = (void *)(eth + 1);
    if ((void *)(ip + 1) > data_end) return XDP_DROP;

    /* 차단 목록 조회 */
    __u64 *count = bpf_map_lookup_elem(&blocked_ips, &ip->saddr);
    if (count) {
        __sync_fetch_and_add(count, 1);
        return XDP_DROP;  /* 즉시 폐기 */
    }

    return XDP_PASS;
}`

export const coreKprobeCode = `/* CO-RE 기반 eBPF 프로그램 — 커널 버전 독립적 */
#include <vmlinux.h>        /* BTF로 생성된 모든 커널 타입 */
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_core_read.h>  /* CO-RE 매크로 */

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 256 * 1024);
} events SEC(".maps");

/* execve syscall을 추적하는 kprobe */
SEC("kprobe/sys_execve")
int trace_execve(struct pt_regs *ctx)
{
    struct task_struct *task = (void *)bpf_get_current_task();

    /* CO-RE: 커널 버전 무관하게 안전한 필드 접근 */
    pid_t pid = BPF_CORE_READ(task, pid);
    pid_t tgid = BPF_CORE_READ(task, tgid);

    /* ring buffer에 이벤트 기록 */
    struct event *e = bpf_ringbuf_reserve(&events, sizeof(*e), 0);
    if (!e) return 0;

    e->pid = pid;
    bpf_get_current_comm(&e->comm, sizeof(e->comm));
    bpf_ringbuf_submit(e, 0);

    return 0;
}

char LICENSE[] SEC("license") = "GPL";`

export const bpftoolCode = `# 커널 BTF 정보 확인
bpftool btf dump file /sys/kernel/btf/vmlinux format c | grep "struct task_struct" | head -5

# vmlinux.h 생성 (CO-RE 개발용)
bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h

# 로드된 eBPF 프로그램 목록
bpftool prog list
bpftool prog show id 42

# eBPF 맵 내용 조회
bpftool map list
bpftool map dump id 5

# eBPF 프로그램 JIT 코드 덤프
bpftool prog dump jited id 42

# skeleton 생성 (libbpf workflow)
clang -O2 -target bpf -c kprobe_example.bpf.c -o kprobe_example.bpf.o
bpftool gen skeleton kprobe_example.bpf.o > kprobe_example.skel.h`

export const bccToolsCode = `# 설치
apt install bpfcc-tools linux-headers-$(uname -r)
# 또는
pip install bcc

# 1. 모든 새 프로세스 실시간 감시
execsnoop-bpfcc

# 2. TCP 연결 추적
tcptracer-bpfcc -v

# 3. 블록 I/O 지연 분포 (10초 수집)
biolatency-bpfcc 10

# 4. 특정 프로세스의 파일 접근
opensnoop-bpfcc -p $(pgrep nginx)

# 5. CPU 프로파일 (49Hz로 10초)
profile-bpfcc -F 49 10

# bpftrace (더 간결한 문법)
# execve 호출 시 프로세스 이름 출력
bpftrace -e 'tracepoint:syscalls:sys_enter_execve { printf("%s\\n", comm); }'

# 5초간 read() 크기 분포
bpftrace -e 'tracepoint:syscalls:sys_exit_read /args->ret > 0/ { @[comm] = hist(args->ret); }' -c 'sleep 5'`

export const afXdpCode = `#include <linux/if_xdp.h>
#include <bpf/xsk.h>  /* libbpf xsk 헬퍼 */

/* UMEM 설정 — 유저공간 메모리를 커널과 공유 */
struct xsk_umem *umem;
void *umem_area = mmap(NULL, UMEM_SIZE,
                        PROT_READ | PROT_WRITE,
                        MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);

struct xsk_umem_config umem_cfg = {
    .fill_size    = XSK_RING_PROD__DEFAULT_NUM_DESCS,
    .comp_size    = XSK_RING_CONS__DEFAULT_NUM_DESCS,
    .frame_size   = XSK_UMEM__DEFAULT_FRAME_SIZE,  /* 4096 */
};
xsk_umem__create(&umem, umem_area, UMEM_SIZE, &fill_ring, &comp_ring, &umem_cfg);

/* AF_XDP 소켓 생성 */
struct xsk_socket *xsk;
struct xsk_socket_config xsk_cfg = {
    .rx_size = XSK_RING_CONS__DEFAULT_NUM_DESCS,
    .tx_size = XSK_RING_PROD__DEFAULT_NUM_DESCS,
    .libbpf_flags = XSK_LIBBPF_FLAGS__INHIBIT_PROG_LOAD,
};
xsk_socket__create(&xsk, "eth0", 0, umem, &rx_ring, &tx_ring, &xsk_cfg);

/* 패킷 수신 루프 */
while (1) {
    unsigned int rcvd = xsk_ring_cons__peek(&rx_ring, BATCH_SIZE, &idx_rx);
    for (int i = 0; i < rcvd; i++) {
        const struct xdp_desc *desc = xsk_ring_cons__rx_desc(&rx_ring, idx_rx + i);
        void *pkt = xsk_umem__get_data(umem_area, desc->addr);
        /* pkt: 커널→유저 복사 없이 직접 접근 */
        process_packet(pkt, desc->len);
    }
    xsk_ring_cons__release(&rx_ring, rcvd);
}`

export const seccompBpfCode = `#include <linux/seccomp.h>
#include <linux/filter.h>
#include <linux/audit.h>
#include <sys/prctl.h>

/* 허용할 syscall 목록만 정의 (allowlist 방식) */
struct sock_filter filter[] = {
    /* 아키텍처 확인 */
    BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, arch)),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, AUDIT_ARCH_X86_64, 1, 0),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL),

    /* syscall 번호 로드 */
    BPF_STMT(BPF_LD | BPF_W | BPF_ABS, offsetof(struct seccomp_data, nr)),

    /* 허용 목록 */
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_read,   6, 0),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_write,  5, 0),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_exit,   4, 0),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_exit_group, 3, 0),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_brk,    2, 0),
    BPF_JUMP(BPF_JMP | BPF_JEQ | BPF_K, __NR_mmap,   1, 0),

    /* 나머지: 차단 */
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_KILL),
    BPF_STMT(BPF_RET | BPF_K, SECCOMP_RET_ALLOW),
};

struct sock_fprog prog = { .len = ARRAY_SIZE(filter), .filter = filter };

/* seccomp 적용 */
prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0);  /* 필수 선행 조건 */
prctl(PR_SET_SECCOMP, SECCOMP_MODE_FILTER, &prog);`

export const seccompDockerCode = `# Docker의 기본 seccomp 프로파일 확인
docker inspect --format='{{.HostConfig.SecurityOpt}}' my_container

# 커스텀 seccomp 프로파일로 컨테이너 실행
docker run --security-opt seccomp=my_profile.json my_image

# seccomp 비활성화 (디버깅용, 위험)
docker run --security-opt seccomp=unconfined my_image

# libseccomp로 더 쉽게 (C 라이브러리)
# scmp_filter_ctx ctx = seccomp_init(SCMP_ACT_KILL);
# seccomp_rule_add(ctx, SCMP_ACT_ALLOW, SCMP_SYS(read), 0);
# seccomp_load(ctx);

# strace로 프로세스의 syscall 목록 확인 (프로파일 작성용)
strace -c -f my_program 2>&1 | tail -20`

export const bpftraceOnelinersCode = `# 1. 시스템 콜별 횟수 (5초간)
bpftrace -e 'tracepoint:syscalls:sys_enter_* { @[probe] = count(); }' -c "sleep 5"

# 2. 프로세스별 읽기 바이트 분포 (히스토그램)
bpftrace -e 'kretprobe:vfs_read /retval > 0/ { @[comm] = hist(retval); }'

# 3. TCP 연결 생성 추적 (IP + 포트)
bpftrace -e 'kprobe:tcp_connect {
    printf("%s → %s:%d\\n", comm,
           ntop(((struct sock*)arg0)->__sk_common.skc_daddr),
           ((struct sock*)arg0)->__sk_common.skc_dport);
}'

# 4. 디스크 I/O 레이턴시 히스토그램
bpftrace -e 'tracepoint:block:block_rq_issue { @start[args->sector] = nsecs; }
tracepoint:block:block_rq_complete /@start[args->sector]/
{ @latency_us = hist((nsecs - @start[args->sector]) / 1000);
  delete(@start[args->sector]); }'

# 5. OOM killer 발동 추적
bpftrace -e 'kprobe:oom_kill_process { printf("OOM killed: %s (pid %d)\\n", comm, pid); }'

# 6. CPU 플레임그래프용 스택 샘플링
bpftrace -e 'profile:hz:99 { @[kstack, ustack, comm] = count(); }' -o out.bt
# → bpftrace에서 직접 flamegraph 데이터 생성 가능`
