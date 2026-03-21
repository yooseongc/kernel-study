import { CodeBlock } from '../../components/viz/CodeBlock'

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                {title}
            </h2>
            {children}
        </section>
    )
}

function Prose({ children }: { children: React.ReactNode }) {
    return <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{children}</p>
}

interface TableRow {
  cells: string[]
}

function InfoTable({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                        {headers.map((h, i) => (
                            <th
                                key={i}
                                className="px-4 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 font-mono text-xs"
                            >
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr
                            key={ri}
                            className="border-b last:border-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                            {row.cells.map((cell, ci) => (
                                <td
                                    key={ci}
                                    className={`px-4 py-2.5 font-mono text-xs ${
                                        ci === 0
                                            ? 'text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'text-gray-600 dark:text-gray-400'
                                    }`}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

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
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">
            {/* Header */}
            <div>
                <div className="text-xs font-mono text-blue-600 dark:text-blue-400 mb-2">Topic 12</div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Linux 보안 모델</h1>
                <p className="text-gray-500 dark:text-gray-400">
          DAC, Capabilities, LSM 프레임워크, AppArmor, SELinux
                </p>
            </div>

            {/* 12.1 Linux 보안 모델 개요 */}
            <Section id="s121" title="12.1  Linux 보안 모델 개요">
                <Prose>
          Linux의 보안은 전통적인 DAC(임의 접근 제어)를 기반으로, LSM(Linux Security Module)
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
          전통적으로 root(uid=0)는 모든 권한을 가졌습니다. Capabilities는 이를 37개 단위로 분리해
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
          LSM(Linux Security Module)은 커널 보안 결정 지점에 훅을 제공합니다. SELinux, AppArmor,
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
          AppArmor는 프로그램별로 접근 가능한 파일/네트워크를 프로파일로 정의합니다.
          Ubuntu/Debian의 기본 LSM입니다.
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
          SELinux는 모든 파일, 프로세스, 소켓에{' '}
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

            {/* 12.6 다음 토픽 링크 */}
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-8 text-center space-y-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
          Linux 보안 모델 학습 완료
                </div>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm max-w-2xl mx-auto">
          DAC에서 시작해 Capabilities로 권한을 세분화하고, LSM 프레임워크 위에서 AppArmor와
          SELinux가 MAC를 구현하는 계층적 보안 구조를 살펴봤습니다. 이 개념들은 컨테이너 보안,
          시스템 강화(hardening)의 기반이 됩니다.
                </p>
                <a
                    href="#/"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                    <span>←</span>
          홈으로 돌아가기
                </a>
            </div>
        </div>
    )
}
