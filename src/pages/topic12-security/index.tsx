import { CodeBlock } from '../../components/viz/CodeBlock'
import { T } from '../../components/ui/GlossaryTooltip'
import { Section } from '../../components/ui/Section'
import { Prose } from '../../components/ui/Prose'
import { InfoTable, type TableRow } from '../../components/ui/InfoTable'
import { LearningCard } from '../../components/ui/LearningCard'
import { TopicNavigation } from '../../components/ui/TopicNavigation'

// ─────────────────────────────────────────────────────────────────────────────
// Code strings
// ─────────────────────────────────────────────────────────────────────────────

const capabilitiesCode = `# 프로세스 capabilities 확인
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

const lsmHooksCode = `/* LSM 훅 예시 — 파일 열기 시 */
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

const apparmorProfileCode = `#include <tunables/global>

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

const apparmorMgmtCode = `# AppArmor 상태 확인
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

const selinuxCode = `# SELinux 상태
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

// ─────────────────────────────────────────────────────────────────────────────
// 12.6 Namespace code strings
// ─────────────────────────────────────────────────────────────────────────────

const namespaceOverviewCode = `# 현재 프로세스의 namespace 확인
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

const userNsCode = `/* user namespace — UID/GID 매핑 (비특권 컨테이너의 핵심) */

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

const mountNsCode = `/* mount namespace — 독립 파일시스템 뷰 */

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

// ─────────────────────────────────────────────────────────────────────────────
// 12.7 PID Namespace code strings
// ─────────────────────────────────────────────────────────────────────────────

const pidNsBashCode = `# 새 PID namespace에서 쉘 실행
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

const pidNsCloneCode = `/* clone()으로 새 PID namespace 생성 */
#define _GNU_SOURCE
#include <sched.h>

pid_t child = clone(child_fn, stack_top,
    CLONE_NEWPID | SIGCHLD, NULL);
/* child_fn 안에서 getpid() == 1 */`

// ─────────────────────────────────────────────────────────────────────────────
// Table data
// ─────────────────────────────────────────────────────────────────────────────

const capabilityRows: TableRow[] = [
    { cells: ['CAP_NET_BIND_SERVICE', '1024 이하 포트 바인딩', 'Nginx가 root 없이 80 포트'] },
    { cells: ['CAP_NET_ADMIN', '네트워크 설정 변경', 'ip, tc, iptables'] },
    { cells: ['CAP_SYS_PTRACE', '다른 프로세스 추적', 'strace, gdb'] },
    { cells: ['CAP_SYS_ADMIN', '광범위한 시스템 관리', 'mount, swapon'] },
    { cells: ['CAP_SETUID', 'UID 변경', 'su, sudo'] },
    { cells: ['CAP_DAC_OVERRIDE', '파일 권한 무시', 'root 파일 접근'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topic12() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Topic 12
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Linux 보안 모델
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Linux Security Model
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    DAC, Capabilities, LSM, AppArmor, SELinux, Namespace 격리, 컨테이너 보안
                </p>
            </header>

            <LearningCard
                topicId="12-security"
                items={[
                    'LSM(Linux Security Module) 훅이 커널 내부에서 보안 정책을 강제하는 방법을 이해합니다',
                    'Capabilities 권한 모델로 root 권한을 세분화하고 최소 권한 원칙을 구현하는 방법을 배웁니다',
                    'PID/Network/Mount Namespace로 컨테이너 격리를 구현하는 커널 메커니즘을 파악합니다',
                ]}
            />

            {/* 12.1 Linux 보안 모델 개요 */}
            <Section id="s121" title="12.1  Linux 보안 모델 개요">
                <Prose>
          Linux의 보안은 전통적인 DAC(임의 접근 제어)를 기반으로, <T id="lsm">LSM</T>(Linux Security Module)
          프레임워크가 MAC(강제 접근 제어)를 추가합니다.
                </Prose>

                {/* 보안 계층 시각화 */}
                <div className="space-y-1 font-mono text-xs">
                    {[
                        {
                            label: '[ 유저 공간 ]',
                            sub: '프로세스 (uid, gid, capabilities)',
                            color: '#3b82f6',
                            bg: 'bg-blue-50 dark:bg-blue-950/30',
                            border: 'border-blue-200 dark:border-blue-800/50',
                        },
                        {
                            label: '↓ syscall',
                            sub: '',
                            color: '#6b7280',
                            bg: 'bg-transparent',
                            border: 'border-transparent',
                            arrow: true,
                        },
                        {
                            label: '[ DAC ]',
                            sub: '파일 권한 비트, ACL (rwxr-xr-x, setuid)',
                            color: '#10b981',
                            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                            border: 'border-emerald-200 dark:border-emerald-800/50',
                        },
                        {
                            label: '↓ (통과 후)',
                            sub: '',
                            color: '#6b7280',
                            bg: 'bg-transparent',
                            border: 'border-transparent',
                            arrow: true,
                        },
                        {
                            label: '[ LSM Hook ]',
                            sub: '각 보안 결정 지점에 훅 호출',
                            color: '#8b5cf6',
                            bg: 'bg-violet-50 dark:bg-violet-950/30',
                            border: 'border-violet-200 dark:border-violet-800/50',
                        },
                        {
                            label: '↓',
                            sub: '',
                            color: '#6b7280',
                            bg: 'bg-transparent',
                            border: 'border-transparent',
                            arrow: true,
                        },
                        {
                            label: '[ SELinux / AppArmor / seccomp ]',
                            sub: '정책 기반 허용/거부',
                            color: '#ef4444',
                            bg: 'bg-red-50 dark:bg-red-950/30',
                            border: 'border-red-200 dark:border-red-800/50',
                        },
                    ].map((layer, i) =>
                        layer.arrow ? (
                            <div key={i} className="text-center text-gray-400 dark:text-gray-600 py-0.5">
                                {layer.label}
                            </div>
                        ) : (
                            <div
                                key={i}
                                className={`rounded-lg border px-4 py-3 ${layer.bg} ${layer.border}`}
                            >
                                <span className="font-bold" style={{ color: layer.color }}>
                                    {layer.label}
                                </span>
                                {layer.sub && (
                                    <span className="text-gray-500 dark:text-gray-400 ml-2">{layer.sub}</span>
                                )}
                            </div>
                        ),
                    )}
                </div>

                {/* 3개 주요 보안 메커니즘 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'DAC',
                            subtitle: 'Discretionary Access Control',
                            color: '#10b981',
                            desc: '파일 소유자가 권한 결정. chmod/chown. 기본 Unix 모델',
                        },
                        {
                            title: 'MAC',
                            subtitle: 'Mandatory Access Control',
                            color: '#8b5cf6',
                            desc: '시스템 정책이 접근 결정. 프로세스가 root라도 제한 가능. SELinux/AppArmor',
                        },
                        {
                            title: 'Capabilities',
                            subtitle: 'Fine-grained Privileges',
                            color: '#f59e0b',
                            desc: 'root를 세분화. CAP_NET_BIND_SERVICE(1024 이하 포트), CAP_SYS_PTRACE 등 37개',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                {card.subtitle}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 12.2 Linux Capabilities */}
            <Section id="s122" title="12.2  Linux Capabilities">
                <Prose>
          전통적으로 root(uid=0)는 모든 권한을 가졌습니다. <T id="capability">Capability</T>는 이를 37개 단위로 분리해
          최소 권한 원칙을 적용합니다.
                </Prose>
                <InfoTable
                    headers={['Capability', '권한', '예시']}
                    rows={capabilityRows}
                />
                <CodeBlock
                    code={capabilitiesCode}
                    language="bash"
                    filename="# Capabilities 실전"
                />
            </Section>

            {/* 12.3 LSM 프레임워크 */}
            <Section id="s123" title="12.3  LSM 프레임워크">
                <Prose>
                    <T id="lsm">LSM</T>(Linux Security Module)은 커널 보안 결정 지점에 훅을 제공합니다. <T id="selinux">SELinux</T>, <T id="apparmor">AppArmor</T>,
          Smack 등이 이 프레임워크 위에 구현됩니다.
                </Prose>
                <CodeBlock
                    code={lsmHooksCode}
                    language="c"
                    filename="include/linux/lsm_hooks.h 개념"
                />

                {/* LSM 훅 흐름 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                        {
                            title: 'security_inode_create()',
                            color: '#3b82f6',
                            desc: '파일 생성 시 호출. 새 inode 생성 허용 여부를 결정합니다.',
                        },
                        {
                            title: 'security_socket_connect()',
                            color: '#10b981',
                            desc: '소켓 연결 시 호출. 목적지 주소/포트 기반 접근 제어가 가능합니다.',
                        },
                        {
                            title: 'security_bprm_check()',
                            color: '#8b5cf6',
                            desc: '프로그램 실행(execve) 시 호출. 실행 파일의 레이블/프로파일을 검사합니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 12.4 AppArmor */}
            <Section id="s124" title="12.4  AppArmor — 경로 기반 MAC">
                <Prose>
                    <T id="apparmor">AppArmor</T>는 프로그램별로 접근 가능한 파일/네트워크를 프로파일로 정의합니다.
          Ubuntu/Debian의 기본 <T id="lsm">LSM</T>입니다.
                </Prose>
                <CodeBlock
                    code={apparmorProfileCode}
                    language="bash"
                    filename="/etc/apparmor.d/usr.sbin.nginx — 프로파일 예시"
                />
                <CodeBlock
                    code={apparmorMgmtCode}
                    language="bash"
                    filename="# AppArmor 관리"
                />
            </Section>

            {/* 12.5 SELinux */}
            <Section id="s125" title="12.5  SELinux — 레이블 기반 MAC">
                <Prose>
                    <T id="selinux">SELinux</T>는 모든 파일, 프로세스, 소켓에{' '}
                    <strong className="text-gray-800 dark:text-gray-200">보안 레이블(context)</strong>을
          부여하고, 정책 데이터베이스로 레이블 간 접근을 제어합니다. RHEL/CentOS/Fedora의 기본
          LSM입니다.
                </Prose>
                <CodeBlock
                    code={selinuxCode}
                    language="bash"
                    filename="# SELinux 실전"
                />

                {/* SELinux vs AppArmor 비교 카드 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        {
                            title: 'SELinux',
                            color: '#ef4444',
                            items: [
                                '레이블(context) 기반 접근 제어',
                                '강력한 정책 언어 (Type Enforcement)',
                                '복잡하지만 강력한 격리',
                                'RHEL / CentOS / Fedora 계열',
                                '정책 위반 감사: ausearch -m avc',
                            ],
                        },
                        {
                            title: 'AppArmor',
                            color: '#3b82f6',
                            items: [
                                '경로(path) 기반 접근 제어',
                                '직관적인 프로파일 문법',
                                '빠른 학습 곡선',
                                'Ubuntu / Debian 계열',
                                '위반 로그: dmesg | grep apparmor',
                            ],
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-3"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-sm font-mono font-bold" style={{ color: card.color }}>
                                {card.title}
                            </div>
                            <ul className="space-y-1">
                                {card.items.map((item, i) => (
                                    <li
                                        key={i}
                                        className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2"
                                    >
                                        <span style={{ color: card.color }} className="mt-0.5 shrink-0">
                      ▸
                                        </span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 12.6 Namespace와 보안 모델 */}
            <Section id="s126" title="12.6  Namespace — 컨테이너 격리의 기반">
                <Prose>
          Linux <T id="linux_namespace">namespace</T>는 프로세스 그룹이 독립된 시스템 뷰를 갖도록 격리합니다.
          Docker·K8s 컨테이너의 핵심 격리 메커니즘이며, <T id="capability">Capabilities</T>·<T id="lsm">LSM</T>과 결합해
          컨테이너 보안을 구성합니다.
                </Prose>

                {/* 7가지 namespace 카드 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { name: 'user', desc: 'UID/GID 매핑, capabilities 범위', color: '#8b5cf6', flag: 'CLONE_NEWUSER' },
                        { name: 'mnt', desc: '마운트 포인트 독립 뷰', color: '#3b82f6', flag: 'CLONE_NEWNS' },
                        { name: 'pid', desc: 'PID 1부터 독립 번호 부여', color: '#10b981', flag: 'CLONE_NEWPID' },
                        { name: 'net', desc: '독립 네트워크 스택·인터페이스', color: '#f59e0b', flag: 'CLONE_NEWNET' },
                        { name: 'ipc', desc: '세마포어·공유 메모리 격리', color: '#ef4444', flag: 'CLONE_NEWIPC' },
                        { name: 'uts', desc: 'hostname·domainname 격리', color: '#06b6d4', flag: 'CLONE_NEWUTS' },
                        { name: 'cgroup', desc: 'cgroup 루트 격리', color: '#84cc16', flag: 'CLONE_NEWCGROUP' },
                        { name: 'time', desc: '단조 시계 오프셋 (Linux 5.6+)', color: '#f97316', flag: 'CLONE_NEWTIME' },
                    ].map((ns) => (
                        <div
                            key={ns.name}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-3 space-y-1.5"
                            style={{ borderColor: ns.color + '55' }}
                        >
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ns.color }} />
                                <span className="text-xs font-mono font-bold" style={{ color: ns.color }}>
                                    {ns.name}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                {ns.desc}
                            </p>
                            <div className="text-xs font-mono text-gray-400 dark:text-gray-600">
                                {ns.flag}
                            </div>
                        </div>
                    ))}
                </div>

                <CodeBlock
                    code={namespaceOverviewCode}
                    language="bash"
                    filename="# Namespace 확인 및 unshare"
                />

                {/* user namespace — 비특권 컨테이너 */}
                <div className="rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-3">
                    <div className="text-sm font-semibold text-purple-700 dark:text-purple-300 font-mono">
            user namespace — 비특권 컨테이너의 핵심
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            컨테이너 내부 uid 0(root)를 호스트의 일반 uid(예: 1000)에 매핑합니다.
            컨테이너 안에서 root처럼 동작하지만, 호스트 커널에서는 권한이 없습니다.
            이 덕분에 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">rootless Docker</code>,{' '}
                        <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Podman</code> 등이 동작합니다.
                    </p>
                    <CodeBlock
                        code={userNsCode}
                        language="bash"
                        filename="# user namespace — UID 매핑"
                    />
                </div>

                {/* mount namespace */}
                <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
                    <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 font-mono">
            mount namespace — pivot_root와 컨테이너 rootfs
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            각 컨테이너는 독립된 마운트 namespace를 갖습니다. Docker는 컨테이너 시작 시
            overlay2 레이어를 마운트한 뒤 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">pivot_root</code>로
            루트 파일시스템을 교체합니다. 호스트의 파일시스템은 보이지 않습니다.
                    </p>
                    <CodeBlock
                        code={mountNsCode}
                        language="bash"
                        filename="# mount namespace — pivot_root 절차"
                    />
                </div>

                {/* 보안 레이어 요약 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              컨테이너 보안 레이어 (중첩 적용)
                        </span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {[
                            {
                                layer: 'Namespace',
                                role: '리소스 뷰 격리 (PID, 네트워크, 파일시스템)',
                                example: 'net ns → 독립 eth0, lo',
                                color: '#3b82f6',
                            },
                            {
                                layer: 'cgroup',
                                role: '리소스 사용량 제한 (CPU, 메모리, I/O)',
                                example: 'memory.limit_in_bytes = 512M',
                                color: '#10b981',
                            },
                            {
                                layer: 'Capabilities',
                                role: 'root 권한 세분화 — 불필요한 권한 제거',
                                example: '--cap-drop=ALL --cap-add=NET_BIND',
                                color: '#f59e0b',
                            },
                            {
                                layer: 'seccomp',
                                role: '허용 시스템 콜 화이트리스트',
                                example: 'Docker 기본 프로파일: 44개 syscall 차단',
                                color: '#ef4444',
                            },
                            {
                                layer: 'LSM (AppArmor/SELinux)',
                                role: '파일·소켓·execve 접근 강제',
                                example: 'AppArmor 프로파일로 /proc/sysrq 차단',
                                color: '#8b5cf6',
                            },
                        ].map((row) => (
                            <div key={row.layer} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: row.color }} />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-mono font-bold" style={{ color: row.color }}>
                                        {row.layer}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{row.role}</div>
                                    <div className="text-xs text-gray-400 dark:text-gray-600 font-mono mt-0.5">{row.example}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* 12.7 PID Namespace */}
            <Section id="s127" title="12.7  PID Namespace — 컨테이너 프로세스 격리">
                <Prose>
                    PID namespace는 리눅스 네임스페이스 중 하나로, 각 namespace 내에서 PID를{' '}
                    <strong className="text-gray-800 dark:text-gray-200">독립적으로 번호 매기는</strong> 메커니즘입니다.
                    Docker 컨테이너에서 PID 1이 <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">init</code>처럼
                    보이지만, 호스트에서는 완전히 다른 PID를 가집니다.
                </Prose>

                {/* PID 매핑 시각화 */}
                <div className="font-mono text-xs space-y-3">
                    {/* 호스트 namespace */}
                    <div className="rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-2">
                        <div className="text-blue-700 dark:text-blue-300 font-bold text-center mb-2">
                            호스트 네임스페이스
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { pid: 'PID 1', name: 'systemd' },
                                { pid: 'PID 1234', name: 'containerd' },
                                { pid: 'PID 1235', name: 'runc' },
                                { pid: 'PID 1236', name: 'nginx (컨테이너A)' },
                                { pid: 'PID 1237', name: 'worker (컨테이너A)' },
                                { pid: 'PID 2001', name: 'redis (컨테이너B)' },
                            ].map((p) => (
                                <div
                                    key={p.pid}
                                    className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 rounded px-2 py-1"
                                >
                                    <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0">{p.pid}:</span>
                                    <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 화살표 */}
                    <div className="flex justify-around text-gray-400 dark:text-gray-600 text-base">
                        <span>↓ 격리</span>
                        <span>↓ 격리</span>
                    </div>

                    {/* 컨테이너 두 개 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 컨테이너 A */}
                        <div className="rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
                            <div className="text-emerald-700 dark:text-emerald-300 font-bold text-center mb-2">
                                컨테이너 A
                            </div>
                            {[
                                { pid: 'PID 1', name: 'nginx (master)' },
                                { pid: 'PID 2', name: 'worker' },
                            ].map((p) => (
                                <div
                                    key={p.pid}
                                    className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 rounded px-2 py-1"
                                >
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">{p.pid}:</span>
                                    <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                                </div>
                            ))}
                            <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1">
                                호스트 PID 1236, 1237 에 대응
                            </p>
                        </div>

                        {/* 컨테이너 B */}
                        <div className="rounded-xl border border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/30 p-4 space-y-2">
                            <div className="text-violet-700 dark:text-violet-300 font-bold text-center mb-2">
                                컨테이너 B
                            </div>
                            {[
                                { pid: 'PID 1', name: 'redis' },
                                { pid: 'PID 2', name: 'redis-bg' },
                            ].map((p) => (
                                <div
                                    key={p.pid}
                                    className="flex items-center gap-2 bg-violet-100 dark:bg-violet-900/40 rounded px-2 py-1"
                                >
                                    <span className="text-violet-600 dark:text-violet-400 font-bold shrink-0">{p.pid}:</span>
                                    <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                                </div>
                            ))}
                            <p className="text-violet-600 dark:text-violet-400 text-xs mt-1">
                                호스트 PID 2001 등에 대응
                            </p>
                        </div>
                    </div>
                </div>

                {/* PID 1의 특별한 의미 */}
                <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
                    <div className="text-sm font-semibold text-amber-700 dark:text-amber-300 font-mono">
                        PID 1의 특별한 의미
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            {
                                title: 'init 역할',
                                color: '#f59e0b',
                                items: [
                                    'SIGTERM 수신 → 자식 정리 후 종료해야 함',
                                    'SIGCHLD 미처리 시 좀비 프로세스 누적',
                                    'PID 1이 종료되면 컨테이너 전체 종료',
                                ],
                            },
                            {
                                title: '경량 init 해법',
                                color: '#10b981',
                                items: [
                                    'tini: 시그널 전달 + 좀비 수거',
                                    'dumb-init: 시그널 포워딩',
                                    'docker run --init: tini를 PID 1로 사용',
                                ],
                            },
                        ].map((card) => (
                            <div key={card.title} className="space-y-1.5">
                                <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                    {card.title}
                                </div>
                                <ul className="space-y-1">
                                    {card.items.map((item, i) => (
                                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                            <span style={{ color: card.color }} className="mt-0.5 shrink-0">▸</span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Namespace 생성 방법 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            Namespace 생성 및 확인 방법
                        </span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {[
                            {
                                api: 'unshare(CLONE_NEWPID)',
                                desc: '현재 프로세스를 새 PID namespace에 배치. 다음에 fork()된 자식이 PID 1이 됨',
                                color: '#3b82f6',
                            },
                            {
                                api: 'clone(CLONE_NEWPID)',
                                desc: '자식 프로세스를 새 namespace에서 생성. 자식이 PID 1로 시작',
                                color: '#10b981',
                            },
                            {
                                api: '/proc/PID/ns/pid',
                                desc: 'namespace 식별 파일. inode 번호로 동일 namespace 여부 확인 가능',
                                color: '#8b5cf6',
                            },
                            {
                                api: 'NSpid (in /proc/PID/status)',
                                desc: '각 namespace 레벨에서의 PID를 공백으로 구분해 나열. 예: NSpid: 2345  1',
                                color: '#f59e0b',
                            },
                        ].map((row) => (
                            <div key={row.api} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: row.color }} />
                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-mono font-bold" style={{ color: row.color }}>{row.api}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{row.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 중첩 namespace */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 font-mono">
                        중첩 Namespace (Docker-in-Docker)
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        컨테이너 안의 컨테이너(DinD)는 PID namespace를 3단계 이상으로 중첩할 수 있습니다.
                        각 레벨에서 독립적인 PID 번호가 부여되며,{' '}
                        <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">NSpid</code> 필드에
                        계층별 PID가 순서대로 기록됩니다.
                    </p>
                    <div className="font-mono text-xs flex flex-col items-center gap-1 pt-1">
                        {[
                            { label: '호스트 PID 5000', color: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-blue-300 dark:border-blue-700' },
                            { label: '↓', color: '#6b7280', bg: 'bg-transparent', border: 'border-transparent', arrow: true },
                            { label: '컨테이너1 PID 10', color: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-900/40', border: 'border-emerald-300 dark:border-emerald-700' },
                            { label: '↓', color: '#6b7280', bg: 'bg-transparent', border: 'border-transparent', arrow: true },
                            { label: '컨테이너2 PID 1  (DinD)', color: '#8b5cf6', bg: 'bg-violet-100 dark:bg-violet-900/40', border: 'border-violet-300 dark:border-violet-700' },
                        ].map((row, i) =>
                            row.arrow ? (
                                <div key={i} className="text-gray-400 dark:text-gray-600">↓</div>
                            ) : (
                                <div
                                    key={i}
                                    className={`rounded-lg border px-4 py-1.5 ${row.bg} ${row.border}`}
                                    style={{ color: row.color }}
                                >
                                    {row.label}
                                </div>
                            )
                        )}
                        <div className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                            NSpid: 5000  10  1
                        </div>
                    </div>
                </div>

                {/* 코드 블록 */}
                <CodeBlock
                    code={pidNsBashCode}
                    language="bash"
                    filename="# PID Namespace 실전"
                />
                <CodeBlock
                    code={pidNsCloneCode}
                    language="c"
                    filename="clone() — 새 PID namespace 생성"
                />
            </Section>

            <TopicNavigation topicId="12-security" />
        </div>
    )
}
