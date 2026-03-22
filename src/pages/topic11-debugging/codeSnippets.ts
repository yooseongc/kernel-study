// ─────────────────────────────────────────────────────────────────────────────
// Topic 11 — 성능 분석과 디버깅
// 코드 문자열 상수 모음 (index.tsx에서 분리)
// ─────────────────────────────────────────────────────────────────────────────

export const procNetCode = `# TCP 연결 상태 확인 (16진수 포트/주소)
cat /proc/net/tcp
# Local_address  rem_address  st  tx_queue rx_queue  ...
# 00000000:0016  00000000:0000  0A  ...  (0A = LISTEN, 0016 = port 22)

# UDP 소켓 목록
cat /proc/net/udp

# 네트워크 인터페이스 통계
cat /proc/net/dev
# eth0:  RX bytes/packets/errors/drop  TX bytes/packets/errors/drop

# softnet 통계 (드롭 발생 여부 확인)
cat /proc/net/softnet_stat
# 컬럼: total processed, dropped, time_squeeze (budget 소진), throttled

# conntrack 테이블 (netfilter 사용 시)
cat /proc/net/nf_conntrack | head -5

# ARP 테이블
cat /proc/net/arp

# 라우팅 테이블
cat /proc/net/route  # 16진수 형태
ip route show        # 사람이 읽기 좋은 형태

# softnet_stat 해석 스크립트
awk '{print NR-1, "CPU:", $1, "total | drop:", $2, "| squeeze:", $3}' \\
    /proc/net/softnet_stat`

export const kdumpSetupCode = `# kdump 설치 및 활성화
apt install kdump-tools crash  # Ubuntu
yum install kexec-tools crash  # RHEL

# crash kernel 메모리 예약 (crashkernel= 부트 파라미터)
# /etc/default/grub:
# GRUB_CMDLINE_LINUX="crashkernel=256M"
grub-mkconfig -o /boot/grub/grub.cfg

# kdump 서비스 시작
systemctl enable --now kdump

# 덤프 저장 위치 확인
cat /etc/kdump.conf | grep path
# path /var/crash

# 강제 패닉으로 테스트 (주의: 시스템 재부팅됨)
echo c > /proc/sysrq-trigger`

export const crashAnalysisCode = `# crash로 덤프 열기
crash /usr/lib/debug/boot/vmlinux-$(uname -r) /var/crash/$(date +%Y-%m-%d)/vmcore

# crash 내부 명령어
crash> bt          # 크래시 시점 백트레이스
crash> log         # dmesg 출력 (크래시 직전)
crash> ps          # 실행 중이던 프로세스 목록
crash> vm <pid>    # 특정 프로세스 가상 메모리 맵
crash> files <pid> # 열려있던 파일 디스크립터
crash> kmem -i     # 메모리 사용량 요약
crash> sym <addr>  # 주소 → 심볼 변환
crash> dis <func>  # 함수 역어셈블`

export const containerCgroupCode = `# 컨테이너의 cgroup 확인 (cgroup v2)
CONTAINER_ID=$(docker inspect --format='{{.Id}}' my_container)
CGROUP_PATH="/sys/fs/cgroup/system.slice/docker-\${CONTAINER_ID}.scope"

# 메모리 사용량 및 한도
cat $CGROUP_PATH/memory.current   # 현재 사용량
cat $CGROUP_PATH/memory.max       # 한도
cat $CGROUP_PATH/memory.events    # OOM 이벤트 발생 횟수

# CPU 사용 제한 확인
cat $CGROUP_PATH/cpu.max          # "quota period" (예: 100000 100000 = 100%)

# OOM 발생 여부 확인
dmesg | grep "Memory cgroup out of memory"
# 또는
cat /var/log/syslog | grep "oom_kill"

# 컨테이너 내부 프로세스의 /proc 접근
PID=$(docker inspect --format='{{.State.Pid}}' my_container)
cat /proc/$PID/status | grep -E "VmRSS|VmPeak"
ls /proc/$PID/net/  # 컨테이너 네트워크 네임스페이스`

export const containerNamespaceCode = `# 네임스페이스 목록 확인
lsns

# 컨테이너 네트워크 네임스페이스 진입
PID=$(docker inspect --format='{{.State.Pid}}' my_container)
nsenter -t $PID -n ip addr   # 컨테이너 내부 네트워크 확인
nsenter -t $PID -n ss -tunp  # 컨테이너 소켓 확인

# 컨테이너 프로세스 perf 프로파일링
perf stat -p $PID sleep 5

# K8s: Pod OOM 확인
kubectl describe pod my-pod | grep -A5 "OOMKilled"
kubectl get events --field-selector reason=OOMKilling`

export const dmesgCode = `# 최근 커널 메시지 (타임스탬프 포함)
dmesg -T | tail -50

# 오류/경고만 필터
dmesg -l err,warn

# NIC 관련 메시지만
dmesg | grep -i "eth\\|ens\\|enp\\|napi\\|irq"

# 실시간 모니터링
dmesg -w`

export const oopsExample = `BUG: kernel NULL pointer dereference, address: 0000000000000008
#PF: supervisor read access in kernel mode
#PF: error_code(0x0000) - not-present page
PGD 0 P4D 0
Oops: 0000 [#1] SMP PTI
CPU: 2 PID: 1234 Comm: my_driver Not tainted 6.1.0 #1
Hardware name: QEMU Standard PC (i440FX)
RIP: 0010:my_function+0x1c/0x40 [my_driver]  <- 오류 발생 위치
Code: ...
RSP: 0018:ffffb3a740d67d80 EFLAGS: 00010246
RAX: 0000000000000000 RBX: ffff9b8a12345678  <- RAX=NULL이 문제
...
Call Trace:                                    <- 호출 스택
 <TASK>
 ? driver_probe_device+0x39/0x180
 ? bus_probe_device+0x8f/0xa0
 ? device_add+0x3f9/0x870`

export const perfCode = `# CPU 사용률 상위 함수 프로파일링 (10초)
perf top

# 특정 프로세스 프로파일링
perf record -g -p <pid> sleep 10
perf report --stdio

# 네트워크 스택 패킷 처리 추적
perf stat -e net:net_dev_xmit,net:netif_receive_skb \\
    -p <pid> sleep 5

# 페이지 폴트 카운트
perf stat -e page-faults ./my_program

# flamegraph 생성 (brendangregg/FlameGraph 필요)
perf record -F 99 -g ./my_program
perf script | stackcollapse-perf.pl | flamegraph.pl > out.svg`

export const ftraceCode = `# 함수 추적 활성화
echo function > /sys/kernel/debug/tracing/current_tracer

# 특정 함수만 추적
echo "tcp_*" > /sys/kernel/debug/tracing/set_ftrace_filter

# 특정 PID만 추적
echo <pid> > /sys/kernel/debug/tracing/set_ftrace_pid

# 추적 시작
echo 1 > /sys/kernel/debug/tracing/tracing_on

# 결과 확인
cat /sys/kernel/debug/tracing/trace | head -50

# 추적 중지
echo 0 > /sys/kernel/debug/tracing/tracing_on`

export const sarCode = `# 1초 간격으로 CPU 통계
sar -u 1 10

# 네트워크 인터페이스 통계
sar -n DEV 1 5

# 인터럽트 통계
sar -I ALL 1 5

# 메모리 통계
sar -r 1 5

# 전체 리포트 저장 (cron으로 자동 수집)
sar -A -o /var/log/sa/sa$(date +%d)`

export const lockdepEnableCode = `# lockdep은 커널 컴파일 옵션으로 활성화
# CONFIG_PROVE_LOCKING=y
# CONFIG_DEBUG_LOCKDEP=y
# CONFIG_LOCK_STAT=y

# 배포판 디버그 커널에 기본 포함
uname -r  # 예: 6.1.0-1-amd64-debug

# lockdep 경고는 dmesg에 출력됨
dmesg | grep -A 30 "possible circular locking"
# 예시 출력:
# WARNING: possible circular locking dependency detected
# kworker/0:1 is trying to acquire lock:
#   (lock_B){+.+.}-{3:3}
# but task is already holding lock:
#   (lock_A){+.+.}-{3:3}
# which lock already depends on the new lock.

# 잠금 통계 확인 (CONFIG_LOCK_STAT=y)
cat /proc/lock_stat | head -30
# class name    con-bounces    contentions   ...

# lockdep 상태 초기화
echo 0 > /proc/sys/kernel/lock_stat`

export const lockdepCodeCode = `/* 항상 같은 순서로 잠금 획득 */

/* 잘못된 예 — 순서 불일치 */
// CPU 0: lock(&a); lock(&b);
// CPU 1: lock(&b); lock(&a);  ← 데드락 위험!

/* 올바른 예 — 일관된 순서 */
// 항상 a → b 순서
mutex_lock(&a);
mutex_lock(&b);
/* 작업 */
mutex_unlock(&b);
mutex_unlock(&a);

/* 중첩 잠금이 필요할 때 lockdep 클래스 분리 */
static struct lock_class_key outer_key;
static struct lock_class_key inner_key;
lockdep_set_class(&outer_mutex, &outer_key);
lockdep_set_class(&inner_mutex, &inner_key);`

export const kasanEnableCode = `# 커널 컴파일 옵션
# CONFIG_KASAN=y
# CONFIG_KASAN_GENERIC=y  (일반 모드, 2x 메모리 오버헤드)
# CONFIG_KASAN_INLINE=y   (인라인 계측, 더 빠름)

# KASAN 보고는 dmesg에 출력
dmesg | grep -A 30 "BUG: KASAN:"

# 예시 출력:
# ==================================================================
# BUG: KASAN: use-after-free in my_driver_read+0x58/0x100
# Read of size 8 at addr ffff888100a3b400 by task kworker/0:1/45
#
# CPU: 0 PID: 45 Comm: kworker/0:1 Tainted: G    B
# Call Trace:
#  dump_stack+0x71/0x9b
#  print_address_description+0x6e/0x260
#  kasan_report+0x1b7/0x210
#  my_driver_read+0x58/0x100  ← 실제 버그 위치
#
# Allocated by task 42:
#  kmalloc+0x...
#  my_driver_init+0x...
#
# Freed by task 42:
#  kfree+0x...
#  my_driver_cleanup+0x...`

export const kasanBugCode = `/* use-after-free 예시 */
char *buf = kmalloc(64, GFP_KERNEL);
kfree(buf);
buf[0] = 'A';  /* ← KASAN: use-after-free! */

/* out-of-bounds 예시 */
char arr[8];
arr[8] = 'X';  /* ← KASAN: out-of-bounds write! */

/* KASAN 억제 (특수한 경우) */
kasan_disable_current();
/* ... 의도적인 접근 ... */
kasan_enable_current();`

export const flameGenCode = `# 1. perf로 CPU 샘플 수집 (30초, 99Hz)
perf record -F 99 -a --call-graph dwarf -g sleep 30
# 또는 특정 프로세스만
perf record -F 99 -p $(pgrep nginx) --call-graph fp sleep 30

# 2. perf script로 스택 트레이스 추출
perf script > out.perf

# 3. FlameGraph 스크립트로 변환 (Brendan Gregg)
git clone https://github.com/brendangregg/FlameGraph
./FlameGraph/stackcollapse-perf.pl out.perf > out.folded
./FlameGraph/flamegraph.pl out.folded > flamegraph.svg

# 결과: 브라우저에서 flamegraph.svg 열기 (인터랙티브)

# 4. bpftrace로 직접 수집 (커널 함수만)
bpftrace -e 'profile:hz:99 { @[kstack] = count(); }' \\
         -c "sleep 30" > out.bt
./FlameGraph/stackcollapse-bpftrace.pl out.bt > out.folded
./FlameGraph/flamegraph.pl out.folded > kernel_flame.svg

# 5. off-CPU flame graph (블로킹 시간 분석)
offcputime -df -p $(pgrep myapp) 30 | flamegraph.pl > offcpu.svg`
