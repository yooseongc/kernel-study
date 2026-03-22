// Topic 12 -- Linux Security Model -- code snippets

export const capabilitiesCode = `# 프로세스 capabilities 확인
cat /proc/self/status | grep Cap
# CapPrm: 0000000000000000  (허용된 caps)
# CapEff: 0000000000000000  (현재 유효한 caps)
# CapBnd: 000001ffffffffff  (경계 집합)

# 바이너리의 capabilities 확인
getcap /usr/bin/ping
# /usr/bin/ping cap_net_raw=ep

# 바이너리에 capability 부여 (root 없이 특정 권한)
setcap cap_net_bind_service=+ep /usr/local/bin/node
# 이제 node가 root 없이 80 포트 바인딩 가능

# 현재 프로세스 capability 조회
capsh --print

# Docker: 기본 제거 capabilities
# --cap-drop=ALL --cap-add=NET_BIND_SERVICE`

export const lsmHooksCode = `/* LSM 훅 예시 — 파일 열기 시 */
int security_file_open(struct file *file)
{
    /* 등록된 모든 LSM이 순서대로 검사 */
    return call_int_hook(file_open, 0, file);
    /* SELinux: AVC(Access Vector Cache) 조회
       AppArmor: 프로파일 규칙 매칭
       → 하나라도 거부하면 -EACCES */
}

/* LSM이 훅하는 주요 지점 */
// security_inode_create()   — 파일 생성
// security_socket_connect() — 소켓 연결
// security_bprm_check()     — 프로그램 실행
// security_ptrace_access()  — ptrace 접근`

export const apparmorProfileCode = `#include <tunables/global>

/usr/sbin/nginx {
  #include <abstractions/base>
  #include <abstractions/nameservice>

  capability net_bind_service,  # 80/443 포트 바인딩
  capability setuid,
  capability setgid,

  /var/log/nginx/** rw,          # 로그 쓰기
  /etc/nginx/** r,               # 설정 읽기
  /var/www/html/** r,            # 웹 파일 읽기
  /run/nginx.pid rw,             # PID 파일

  # 네트워크: 외부 통신 허용
  network inet tcp,

  # 나머지는 모두 거부 (기본 정책)
}`

export const apparmorMgmtCode = `# AppArmor 상태 확인
aa-status

# 프로파일 로드/리로드
apparmor_parser -r /etc/apparmor.d/usr.sbin.nginx

# Enforce(강제) ↔ Complain(감사만) 모드 전환
aa-enforce /usr/sbin/nginx    # 위반 시 차단
aa-complain /usr/sbin/nginx   # 위반 시 로그만

# 거부 로그 확인
dmesg | grep "apparmor=\\"DENIED\\""
# apparmor="DENIED" operation="open" profile="/usr/sbin/nginx"
#   name="/etc/shadow" pid=1234 comm="nginx"`

export const selinuxCode = `# SELinux 상태
getenforce        # Enforcing / Permissive / Disabled
sestatus -v

# 파일/프로세스 레이블 확인
ls -Z /etc/passwd
# system_u:object_r:passwd_file_t:s0  /etc/passwd
#  ↑user    ↑role     ↑type       ↑level

ps -eZ | grep nginx
# system_u:system_r:httpd_t:s0  nginx

# 정책 위반 감사
ausearch -m avc -ts recent | tail -20
# type=AVC msg=audit(...): avc: denied { read }
#   for pid=1234 comm="nginx"
#   scontext=system_u:system_r:httpd_t:s0
#   tcontext=system_u:object_r:shadow_t:s0
#   tclass=file permissive=0

# Permissive 모드 (테스트용)
setenforce 0

# 레이블 복원
restorecon -Rv /var/www/html`

export const namespaceOverviewCode = `# 현재 프로세스의 namespace 확인
ls -la /proc/self/ns/
# lrwxrwxrwx 1 root root 0 Mar 21 cgroup -> cgroup:[4026531835]
# lrwxrwxrwx 1 root root 0 Mar 21 ipc    -> ipc:[4026531839]
# lrwxrwxrwx 1 root root 0 Mar 21 mnt    -> mnt:[4026531840]
# lrwxrwxrwx 1 root root 0 Mar 21 net    -> net:[4026531992]
# lrwxrwxrwx 1 root root 0 Mar 21 pid    -> pid:[4026531836]
# lrwxrwxrwx 1 root root 0 Mar 21 time   -> time:[4026531834]
# lrwxrwxrwx 1 root root 0 Mar 21 user   -> user:[4026531837]
# lrwxrwxrwx 1 root root 0 Mar 21 uts    -> uts:[4026531838]

# 새 namespace에서 프로세스 실행 (unshare)
unshare --mount --pid --user --fork bash
# 위 명령은 마운트·PID·user namespace를 새로 생성하고 bash를 실행합니다

# Docker 컨테이너의 namespace 확인
docker inspect <container_id> | jq '.[].State.Pid'
ls -la /proc/<pid>/ns/  # 호스트와 다른 ns 번호 확인`

export const userNsCode = `/* user namespace — UID/GID 매핑 (비특권 컨테이너의 핵심) */

# 새 user namespace 생성 (root 없이 가능)
unshare --user --map-root-user bash
# 이 셸 안에서는 uid=0 (root처럼 보임)
id
# uid=0(root) gid=0(root) groups=0(root),65534(nogroup)

# 호스트에서 보면 일반 유저
cat /proc/self/uid_map
#         0       1000          1   ← 컨테이너 uid 0 = 호스트 uid 1000

# 컨테이너 내부 uid 0~65535 → 호스트 uid 100000~165535
cat /proc/<container_pid>/uid_map
#         0     100000      65536

# 보안 의미: 컨테이너 안의 root가 호스트에서 호출할 수 있는 capabilities
# = 해당 user namespace 범위로 제한됨 → 호스트 커널에 영향 없음`

export const mountNsCode = `/* mount namespace — 독립 파일시스템 뷰 */

# pivot_root로 루트 파일시스템 교체 (컨테이너 격리 핵심)
# Docker가 컨테이너 시작 시 수행하는 절차:
# 1. 새 mount namespace 생성
unshare --mount bash
# 2. 컨테이너 rootfs를 마운트
mount --bind /var/lib/docker/overlay2/<layer>/merged /new_root
# 3. pivot_root로 / 교체
cd /new_root && pivot_root . old_root
umount /old_root && rmdir /old_root

# 호스트와 격리된 /proc, /sys 마운트
mount -t proc proc /proc
mount -t sysfs sysfs /sys

# 실전: 컨테이너 파일시스템 확인
nsenter -t <pid> --mount -- df -h
# 컨테이너 내부 마운트 정보를 호스트에서 확인`

export const pidNsBashCode = `# 새 PID namespace에서 쉘 실행
unshare --pid --fork --mount-proc bash
# 새 쉘: $$ = 1 (이 namespace에서 PID 1!)
echo $$
# 1

# 호스트에서 컨테이너 프로세스 PID 확인
docker run -d nginx
# 호스트:
ps aux | grep nginx
# root  2345 ... nginx: master  (호스트 PID 2345)

# 컨테이너 내부:
docker exec -it <cid> ps aux
# PID 1: nginx: master   (컨테이너 PID 1)
# PID 8: nginx: worker

# PID namespace 확인
ls -la /proc/2345/ns/pid
# lrwxrwxrwx ... pid -> pid:[4026532456]  ← namespace 번호

# 두 프로세스가 같은 ns에 있는지 확인
stat -c %i /proc/1/ns/pid     # 호스트 init
stat -c %i /proc/2345/ns/pid  # 컨테이너 nginx
# 다른 inode → 다른 namespace

# NSpid: 각 namespace에서의 PID
cat /proc/2345/status | grep NSpid
# NSpid: 2345  1    ← 호스트에서 2345, 컨테이너에서 1`

export const pidNsCloneCode = `/* clone()으로 새 PID namespace 생성 */
#define _GNU_SOURCE
#include <sched.h>

pid_t child = clone(child_fn, stack_top,
    CLONE_NEWPID | SIGCHLD, NULL);
/* child_fn 안에서 getpid() == 1 */`

// ─────────────────────────────────────────────────────────────────────────────
// 12.8  관련 커널 파라미터
// ─────────────────────────────────────────────────────────────────────────────

export const securityParamRows = [
    { cells: ['kernel.randomize_va_space', '2', 'ASLR (0=비활성, 1=부분, 2=전체)'] },
    { cells: ['kernel.yama.ptrace_scope', '1', 'ptrace 범위. 0=모두, 1=부모만, 2=관리자, 3=비활성'] },
    { cells: ['kernel.modules_disabled', '0', '1이면 커널 모듈 로드 영구 차단'] },
    { cells: ['kernel.kexec_load_disabled', '0', '1이면 kexec 비활성 (보안 부팅)'] },
    { cells: ['kernel.unprivileged_userns_clone', '1', '비특권 user namespace 생성 허용'] },
    { cells: ['net.ipv4.conf.all.rp_filter', '1', '역경로 필터링 (스푸핑 방지). 1=strict, 2=loose'] },
    { cells: ['kernel.seccomp.actions_avail', '(읽기전용)', '사용 가능한 seccomp 액션 목록'] },
]

export const securityParamCheckCode = `# 보안 관련 파라미터 확인
sysctl kernel.randomize_va_space
sysctl kernel.yama.ptrace_scope
sysctl kernel.modules_disabled
sysctl kernel.kexec_load_disabled

# 역경로 필터링 확인 (스푸핑 방지)
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.conf.default.rp_filter

# seccomp 사용 가능 액션
cat /proc/sys/kernel/seccomp/actions_avail
# kill_process kill_thread trap errno trace log allow

# 모듈 로드 영구 차단 (주의: 재부팅 전까지 해제 불가)
# sysctl -w kernel.modules_disabled=1`
