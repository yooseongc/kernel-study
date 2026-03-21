import React from 'react'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { AnimatedDiagram } from '../../components/viz/AnimatedDiagram'

// ── 4.2 코드 상수 ──────────────────────────────────────────────────────────

const openFlowCode = `/* VFS open 흐름 (간략화) */
long do_sys_open(int dfd, const char __user *filename, int flags, umode_t mode)
{
    struct filename *tmp = getname(filename);
    int fd = get_unused_fd_flags(flags);

    /* 경로 탐색: /etc → etc dentry → passwd dentry → inode */
    struct file *f = do_filp_open(dfd, tmp, &op);
    /*   └─ path_openat()
           └─ link_path_walk() : 경로 컴포넌트 순회
           └─ dentry_open()    : struct file 생성
           └─ ext4_file_open() : 파일시스템별 open */

    fd_install(fd, f);  /* fd → file 매핑 등록 */
    return fd;
}

/* ext4 read 경로 */
static ssize_t ext4_file_read_iter(struct kiocb *iocb, struct iov_iter *to)
{
    /* 페이지 캐시 확인 */
    return generic_file_read_iter(iocb, to);
    /*   └─ find_get_page()     : 페이지 캐시 조회
           └─ (miss) ext4_readpage() → submit_bio() → 디스크 I/O
           └─ copy_page_to_iter() : 커널→유저 복사 */
}`

// ── 4.3 코드 상수 ──────────────────────────────────────────────────────────

const pageCacheCode = `# 메모리에서 페이지 캐시 사용량 확인
cat /proc/meminfo | grep -E "Cached|Buffers|Dirty|Writeback"
# Cached:    8543212 kB  ← 페이지 캐시
# Buffers:    245760 kB  ← 블록 디바이스 버퍼
# Dirty:       12288 kB  ← 쓰기 대기 중인 더티 페이지
# Writeback:       0 kB  ← 현재 쓰기 중

# 특정 파일이 캐시에 있는지 확인
vmtouch /etc/passwd
# Files: 1
# Resident Pages: 1/1  100%  ← 전부 캐시됨

# 페이지 캐시 강제 비우기 (테스트용)
echo 3 > /proc/sys/vm/drop_caches  # 주의: 성능 저하

# dirty 페이지 즉시 플러시
sync
echo 1 > /proc/sys/vm/drop_caches`

// ── 4.4 코드 상수 ──────────────────────────────────────────────────────────

const ext4Code = `# ext4 파일시스템 정보
tune2fs -l /dev/sda1 | grep -E "Block size|Inode|Journal"

# 저널링 모드 확인
mount | grep ext4
# /dev/sda1 on / type ext4 (rw,relatime,data=ordered)

# 파일 블록 위치 확인
filefrag -v /etc/passwd
# physical_offset  logical_offset  length
# 123456           0               1      ← 블록 123456에 위치

# 아이노드 정보
stat /etc/passwd
# File: /etc/passwd
# Inode: 1048577    Links: 1
# Access: 2026-03-21 ...

# 아이노드 소진 확인 (파일 수 제한)
df -i /
# Filesystem  Inodes  IUsed  IFree  IUse%`

// ── 4.5 블록 I/O 코드 상수 ──────────────────────────────────────────────────

const blockIOCode = `/* bio — 블록 I/O 요청의 기본 단위 (include/linux/blk_types.h) */
struct bio {
    struct block_device *bi_bdev;     /* 대상 블록 디바이스 */
    blk_opf_t            bi_opf;      /* REQ_OP_READ / REQ_OP_WRITE 등 */
    sector_t             bi_iter.bi_sector; /* 시작 섹터 번호 */
    struct bio_vec      *bi_io_vec;   /* 물리 페이지 조각 배열 */
    bio_end_io_t        *bi_end_io;   /* 완료 콜백 */
};

/* 상위 계층(ext4)에서 bio를 생성·제출하는 흐름 */
// ext4_writepage()
//   └─ mpage_submit_page()
//        └─ bio_alloc()           ← bio 할당
//        └─ bio_add_page()        ← 페이지 첨부
//        └─ submit_bio()          ← I/O 스케줄러에 전달
//             └─ blk_mq_submit_bio()
//                  └─ blk_mq_get_request()   ← request 래핑
//                  └─ blk_mq_sched_insert_request() ← 스케줄러 삽입
//                  └─ blk_mq_run_hw_queue()  ← 드라이버 dispatch`

const blockSchedCode = `# 현재 I/O 스케줄러 확인
cat /sys/block/sda/queue/scheduler
# [mq-deadline] kyber bfq none

# 스케줄러 변경
echo bfq > /sys/block/sda/queue/scheduler

# I/O 통계 (blkstat)
iostat -x 1
# Device  r/s  w/s  rkB/s  wkB/s  await  %util
# sda     10   50   480    2400   2.3    15

# blktrace — 블록 I/O 이벤트 추적
blktrace -d /dev/sda -o trace &
blkparse trace.blktrace.0 | head -20
# 8,0  3  1  0.000000000  Q  WS 1234 + 8 [kworker]  ← 큐 삽입
# 8,0  3  2  0.000123456  D  WS 1234 + 8 [kworker]  ← 드라이버 dispatch

# 프로세스별 I/O 우선순위
ionice -c 2 -n 0 dd if=/dev/zero of=/tmp/test bs=1M count=100
# -c 2: Best-effort 클래스, -n 0: 최고 우선순위`

// ── 4.2 AnimatedDiagram steps ──────────────────────────────────────────────

const openFlowSteps = [
    {
        label: 'open() syscall 진입',
        description:
      '유저 공간에서 open("/etc/passwd", O_RDONLY)를 호출합니다. glibc가 syscall 명령을 통해 커널로 진입합니다.',
    },
    {
        label: 'do_sys_open() → 경로 탐색 (namei)',
        description:
      'do_sys_open()이 호출되어 파일 경로를 분석합니다. link_path_walk()가 "/etc" → "passwd" 순으로 dentry를 탐색합니다.',
    },
    {
        label: 'dentry cache 조회 → inode 로드',
        description:
      'dentry cache(dcache)를 먼저 조회합니다. cache miss가 발생하면 ext4에서 inode를 디스크로부터 읽어 캐시에 채웁니다.',
    },
    {
        label: 'struct file 생성 → fd 반환',
        description:
      'dentry_open()이 struct file을 생성하고, fd_install()이 fd→file 매핑을 프로세스의 파일 테이블에 등록합니다. fd가 유저에게 반환됩니다.',
    },
    {
        label: 'read(fd, buf, n) → file->f_op->read()',
        description:
      'read() syscall은 fd로 struct file을 찾고, file->f_op->read_iter() 즉 ext4_file_read_iter()를 호출합니다.',
    },
    {
        label: '페이지 캐시 조회 → 디스크 I/O → 유저 복사',
        description:
      'generic_file_read_iter()가 페이지 캐시를 조회합니다. cache hit이면 즉시 반환, miss이면 submit_bio()로 디스크 I/O를 발생시키고 캐시를 채운 후 유저 버퍼에 복사합니다.',
    },
]

// ── 4.2 step별 시각화 ──────────────────────────────────────────────────────

function OpenFlowViz({ step }: { step: number }) {
    const zones = [
        {
            id: 'user',
            title: '유저 공간 (Ring 3)',
            color: 'blue',
            items: [
                { label: 'open("/etc/passwd", O_RDONLY)', activeAt: [0] },
                { label: 'read(fd, buf, n)', activeAt: [4] },
            ],
        },
        {
            id: 'syscall',
            title: 'syscall 인터페이스',
            color: 'orange',
            items: [
                { label: 'do_sys_open()', activeAt: [1] },
                { label: 'sys_read() → vfs_read()', activeAt: [4] },
            ],
        },
        {
            id: 'vfs',
            title: 'VFS 레이어',
            color: 'purple',
            items: [
                { label: 'link_path_walk() → dcache', activeAt: [1, 2] },
                { label: 'dentry_open() → struct file', activeAt: [3] },
                { label: 'file->f_op->read_iter()', activeAt: [4] },
            ],
        },
        {
            id: 'ext4',
            title: 'ext4 + 페이지 캐시',
            color: 'green',
            items: [
                { label: 'ext4_file_open() / inode 로드', activeAt: [2] },
                { label: 'fd_install() → fd 반환', activeAt: [3] },
                { label: 'generic_file_read_iter()', activeAt: [5] },
                { label: 'submit_bio() → 디스크 I/O', activeAt: [5] },
            ],
        },
    ]

    const colorMap: Record<string, { active: string; title: string; dot: string }> = {
        blue:   { active: 'bg-blue-900/40 border-blue-500',   title: 'text-blue-300',   dot: 'bg-blue-400' },
        orange: { active: 'bg-orange-900/40 border-orange-500', title: 'text-orange-300', dot: 'bg-orange-400' },
        purple: { active: 'bg-purple-900/40 border-purple-500', title: 'text-purple-300', dot: 'bg-purple-400' },
        green:  { active: 'bg-green-900/40 border-green-500',  title: 'text-green-300',  dot: 'bg-green-400' },
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3">
            {zones.map((zone) => {
                const isActive = zone.items.some((item) => item.activeAt.includes(step))
                const c = colorMap[zone.color]
                return (
                    <div
                        key={zone.id}
                        className={`rounded-lg p-3 border transition-all duration-300 ${
                            isActive ? `${c.active} border` : 'bg-gray-800 border-gray-700 opacity-50'
                        }`}
                    >
                        <div className={`text-xs font-mono font-semibold mb-2 ${isActive ? c.title : 'text-gray-500'}`}>
                            {zone.title}
                        </div>
                        <div className="space-y-1.5">
                            {zone.items.map((item) => {
                                const itemActive = item.activeAt.includes(step)
                                return (
                                    <div
                                        key={item.label}
                                        className={`text-xs font-mono px-2 py-1 rounded transition-all duration-300 ${
                                            itemActive
                                                ? `bg-gray-700 ring-1 ring-${zone.color}-400 text-gray-100`
                                                : 'bg-gray-700/40 text-gray-500'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${itemActive ? c.dot : 'bg-gray-600'}`}
                                        />
                                        {item.label}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ── VFS 레이어 다이어그램 ────────────────────────────────────────────────────

function VfsLayerDiagram() {
    const layers = [
        {
            label: '유저 공간',
            sublabel: 'open()  read()  write()',
            color: 'blue',
            bgClass: 'bg-blue-950/40 border-blue-700',
            textClass: 'text-blue-300',
            subTextClass: 'text-blue-400/70',
        },
        {
            label: 'syscall 인터페이스',
            sublabel: 'sys_open  sys_read  sys_write',
            color: 'orange',
            bgClass: 'bg-orange-950/40 border-orange-700',
            textClass: 'text-orange-300',
            subTextClass: 'text-orange-400/70',
        },
        {
            label: 'VFS 레이어',
            sublabel: 'struct file · struct inode · struct dentry · struct super_block',
            color: 'purple',
            bgClass: 'bg-purple-950/40 border-purple-700',
            textClass: 'text-purple-300',
            subTextClass: 'text-purple-400/70',
        },
        {
            label: '파일시스템',
            sublabel: 'ext4  XFS  tmpfs  NFS  proc',
            color: 'green',
            bgClass: 'bg-green-950/40 border-green-700',
            textClass: 'text-green-300',
            subTextClass: 'text-green-400/70',
        },
        {
            label: '블록 레이어',
            sublabel: 'bio · request_queue · I/O 스케줄러',
            color: 'yellow',
            bgClass: 'bg-yellow-950/40 border-yellow-700',
            textClass: 'text-yellow-300',
            subTextClass: 'text-yellow-400/70',
        },
        {
            label: '디바이스 드라이버',
            sublabel: 'NVMe  SATA  가상 블록',
            color: 'red',
            bgClass: 'bg-red-950/40 border-red-700',
            textClass: 'text-red-300',
            subTextClass: 'text-red-400/70',
        },
    ]

    return (
        <div className="flex flex-col gap-0">
            {layers.map((layer, idx) => (
                <div key={layer.label} className="flex flex-col items-center">
                    <div
                        className={`w-full rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 ${layer.bgClass}`}
                    >
                        <span className={`text-sm font-bold font-mono ${layer.textClass}`}>{layer.label}</span>
                        <span className={`text-xs ${layer.subTextClass}`}>{layer.sublabel}</span>
                    </div>
                    {idx < layers.length - 1 && (
                        <div className="text-gray-500 text-lg leading-none py-0.5 select-none">↓</div>
                    )}
                </div>
            ))}
        </div>
    )
}

// ── Layout helpers ────────────────────────────────────────────────────────────

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

// ── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export default function Topic11Filesystem() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Topic 04
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    VFS와 파일시스템
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    VFS &amp; Filesystem
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    VFS 계층, open() 흐름, 페이지 캐시, ext4 저널링, 블록 I/O 경로
                </p>
            </header>

            {/* 4.1 VFS 계층 구조 */}
            <Section id="s441" title="4.1  VFS — Virtual File System">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          VFS는 커널의 파일시스템 추상화 계층입니다.{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
            open()
                    </code>
          ,{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
            read()
                    </code>
          ,{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
            write()
                    </code>{' '}
          같은 POSIX syscall을 받아서 실제 파일시스템(ext4, XFS, tmpfs, NFS 등)으로 전달합니다.
          유저는 어떤 파일시스템을 쓰는지 몰라도 됩니다.
                </p>

                {/* VFS 레이어 다이어그램 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
            VFS 계층 구조
                    </div>
                    <VfsLayerDiagram />
                </div>

                {/* VFS 핵심 객체 테이블 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              VFS 핵심 구조체
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    구조체
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    역할
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    수명
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {[
                                    {
                                        name: 'super_block',
                                        role: '마운트된 파일시스템 메타데이터',
                                        lifetime: '마운트~언마운트',
                                    },
                                    {
                                        name: 'inode',
                                        role: '파일의 메타데이터 (크기, 권한, 블록 위치)',
                                        lifetime: '파일 존재 기간',
                                    },
                                    {
                                        name: 'dentry',
                                        role: '디렉토리 항목 (이름→inode 매핑)',
                                        lifetime: '캐시(dentry cache)',
                                    },
                                    {
                                        name: 'file',
                                        role: '열린 파일 하나 (오프셋, 플래그 포함)',
                                        lifetime: 'open()~close()',
                                    },
                                ].map((row) => (
                                    <tr key={row.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
                                                {row.name}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{row.role}</td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono">{row.lifetime}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Section>

            {/* 4.2 open() 흐름 */}
            <Section id="s442" title="4.2  open() 흐름 — VFS에서 ext4까지">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          유저가{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
            open("/etc/passwd", O_RDONLY)
                    </code>
          를 호출하면 커널은 경로를 탐색하고, struct file을 생성하여 fd를 반환합니다.
          이후{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
            read()
                    </code>
          는 페이지 캐시를 확인하고 필요하면 디스크 I/O를 일으킵니다.
                </p>

                <AnimatedDiagram
                    steps={openFlowSteps}
                    renderStep={(step) => <OpenFlowViz step={step} />}
                    autoPlayInterval={2200}
                />

                <CodeBlock
                    code={openFlowCode}
                    language="c"
                    filename="fs/open.c + fs/ext4/file.c"
                />
            </Section>

            {/* 4.3 페이지 캐시 */}
            <Section id="s443" title="4.3  페이지 캐시 — 디스크 I/O 최소화">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          커널은 디스크에서 읽은 데이터를 <strong className="text-gray-900 dark:text-gray-100">페이지 캐시(Page Cache)</strong>에 보관합니다.
          같은 파일을 다시 읽으면 디스크 접근 없이 캐시에서 반환합니다.
          write()된 데이터는 먼저 캐시에 기록되고(dirty 상태), 백그라운드에서 디스크에 씁니다.
                </p>

                <CodeBlock
                    code={pageCacheCode}
                    language="bash"
                    filename="# 페이지 캐시 확인"
                />

                {/* dirty 페이지 설명 카드 3개 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        {
                            title: 'dirty 페이지',
                            desc: 'write()된 데이터가 캐시에는 있지만 디스크에 아직 없는 상태. 전력 차단 시 손실 가능.',
                            color: 'red',
                        },
                        {
                            title: 'pdflush / writeback',
                            desc: '백그라운드 커널 스레드가 주기적으로 dirty 페이지를 디스크에 기록합니다 (dirty_expire_centisecs).',
                            color: 'yellow',
                        },
                        {
                            title: 'fsync()',
                            desc: '애플리케이션이 명시적으로 dirty 페이지 즉시 디스크 기록을 요청합니다. DB의 WAL 커밋에 필수.',
                            color: 'green',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className={`rounded-xl border p-4 space-y-1.5
                ${card.color === 'red'    ? 'bg-red-950/20 border-red-800/50' : ''}
                ${card.color === 'yellow' ? 'bg-yellow-950/20 border-yellow-800/50' : ''}
                ${card.color === 'green'  ? 'bg-green-950/20 border-green-800/50' : ''}
              `}
                        >
                            <div
                                className={`text-xs font-semibold uppercase tracking-wide font-mono
                  ${card.color === 'red'    ? 'text-red-400' : ''}
                  ${card.color === 'yellow' ? 'text-yellow-400' : ''}
                  ${card.color === 'green'  ? 'text-green-400' : ''}
                `}
                            >
                                {card.title}
                            </div>
                            <div className="text-xs text-gray-400 leading-relaxed">{card.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 4.4 ext4 저널링 */}
            <Section id="s444" title="4.4  ext4 — 널리 쓰이는 저널링 파일시스템">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          ext4는 Linux의 기본 파일시스템입니다.
                    <strong className="text-gray-900 dark:text-gray-100"> 저널(journal)</strong>로 크래시 후에도 파일시스템 일관성을 보장합니다.
          저널링 모드에 따라 성능과 안전성이 달라집니다.
                </p>

                {/* 저널링 모드 테이블 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              ext4 저널링 모드
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    모드
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    저널 내용
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    성능
                                    </th>
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    안전성
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {[
                                    {
                                        mode: 'data=writeback',
                                        journal: '메타데이터만',
                                        perf: '빠름',
                                        safety: '크래시 시 데이터 손실 가능',
                                        perfColor: 'text-green-600 dark:text-green-400',
                                        safetyColor: 'text-red-600 dark:text-red-400',
                                    },
                                    {
                                        mode: 'data=ordered (기본)',
                                        journal: '메타데이터 + 데이터 순서 보장',
                                        perf: '중간',
                                        safety: '데이터는 메타데이터 전에 기록',
                                        perfColor: 'text-yellow-600 dark:text-yellow-400',
                                        safetyColor: 'text-yellow-600 dark:text-yellow-400',
                                    },
                                    {
                                        mode: 'data=journal',
                                        journal: '메타데이터 + 데이터 모두',
                                        perf: '느림',
                                        safety: '완전한 보호',
                                        perfColor: 'text-red-600 dark:text-red-400',
                                        safetyColor: 'text-green-600 dark:text-green-400',
                                    },
                                ].map((row) => (
                                    <tr key={row.mode} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">
                                                {row.mode}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{row.journal}</td>
                                        <td className={`px-4 py-3 text-xs font-semibold ${row.perfColor}`}>{row.perf}</td>
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{row.safety}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <CodeBlock
                    code={ext4Code}
                    language="bash"
                    filename="# ext4 실전 명령어"
                />
            </Section>

            {/* 4.5 블록 I/O 경로 */}
            <Section id="s445" title="4.5  블록 I/O 경로 — bio에서 드라이버까지">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          파일시스템이 데이터를 읽고 쓸 때 최종적으로는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
            submit_bio()
                    </code>
          를 호출해 블록 레이어로 I/O를 전달합니다.
          블록 레이어는 <strong className="text-gray-900 dark:text-gray-100">bio</strong> →{' '}
                    <strong className="text-gray-900 dark:text-gray-100">request</strong> →{' '}
                    <strong className="text-gray-900 dark:text-gray-100">드라이버</strong> 순으로 처리합니다.
                </p>

                {/* 블록 I/O 계층 다이어그램 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
            블록 I/O 계층 구조
                    </div>
                    <div className="space-y-1.5">
                        {[
                            { label: 'VFS / 파일시스템 (ext4, XFS…)', color: '#3b82f6', indent: 0 },
                            { label: '페이지 캐시 (Page Cache)', color: '#8b5cf6', indent: 1 },
                            { label: 'submit_bio()  →  bio (scatter-gather 페이지 목록)', color: '#10b981', indent: 1 },
                            { label: '블록 멀티큐 (blk-mq)  —  request 래핑', color: '#f59e0b', indent: 2 },
                            { label: 'I/O 스케줄러 (mq-deadline / kyber / BFQ / none)', color: '#ef4444', indent: 3 },
                            { label: 'NVMe / SCSI / virtio 드라이버  →  DMA', color: '#06b6d4', indent: 2 },
                            { label: '물리 디스크 / SSD', color: '#6b7280', indent: 1 },
                        ].map((row, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-2 text-xs font-mono"
                                style={{ paddingLeft: `${row.indent * 20}px` }}
                            >
                                <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: row.color }}
                                />
                                <span className="text-gray-700 dark:text-gray-300">{row.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* bio 구조체 & 스케줄러 테이블 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        {
                            title: 'mq-deadline',
                            badge: '기본 (HDD·SSD)',
                            color: '#10b981',
                            desc: '읽기 요청에 낮은 데드라인, 쓰기 요청은 배치. 지연 보장이 필요한 HDD에 적합. read_expire=500ms, write_expire=5s.',
                        },
                        {
                            title: 'kyber',
                            badge: '저지연 (NVMe)',
                            color: '#3b82f6',
                            desc: '읽기·동기 쓰기·비동기 쓰기 3개 디스패치 큐로 분리. 고속 NVMe에서 큐 경합을 최소화합니다.',
                        },
                        {
                            title: 'BFQ',
                            badge: '공정성',
                            color: '#f59e0b',
                            desc: 'Budget Fair Queueing. 프로세스별 I/O 버짓을 공정하게 배분. 데스크탑·혼합 워크로드에 적합합니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.title}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-mono font-bold" style={{ color: card.color }}>
                                    {card.title}
                                </span>
                                <span
                                    className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                                    style={{ backgroundColor: card.color + '22', color: card.color }}
                                >
                                    {card.badge}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>

                <CodeBlock
                    code={blockIOCode}
                    language="c"
                    filename="include/linux/blk_types.h — bio 구조체 & submit 흐름"
                />
                <CodeBlock
                    code={blockSchedCode}
                    language="bash"
                    filename="# 블록 I/O 스케줄러 실전"
                />
            </Section>

            <nav className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">이전 토픽</div>
                    <a href="#/topic/03-memory" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        ← 03 · 가상 메모리와 메모리 관리
                    </a>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">다음 토픽</div>
                    <a href="#/topic/05-interrupts" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        05 · 인터럽트, 예외, Deferred Work →
                    </a>
                </div>
            </nav>
        </div>
    )
}
