import { KernelRef } from '../../components/ui/KernelRef'
import { OpenFlowViz } from '../../components/concepts/filesystem/OpenFlowViz'
import { VfsLayerDiagram } from '../../components/concepts/filesystem/VfsLayerDiagram'
import * as snippets from './codeSnippets'
import { Alert, AnimatedDiagram, CodeBlock, InfoBox, InfoTable, Prose, Section, T, TopicPage , CardGrid } from '@study-ui/components'
import type { TableColumn, TableRow } from '@study-ui/components'

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

// OpenFlowViz → extracted to components/concepts/filesystem/OpenFlowViz.tsx
// VfsLayerDiagram → extracted to components/concepts/filesystem/VfsLayerDiagram.tsx

// ─────────────────────────────────────────────────────────────────────────────
// 4.8  관련 커널 파라미터
// ─────────────────────────────────────────────────────────────────────────────
const kernelParamRows: TableRow[] = [
    { cells: ['vm.dirty_ratio', '20', 'dirty 페이지가 전체 메모리의 이 비율 초과 시 프로세스가 동기 write-back'] },
    { cells: ['vm.dirty_background_ratio', '10', '이 비율 초과 시 백그라운드 flush 스레드가 write-back 시작'] },
    { cells: ['vm.dirty_expire_centisecs', '3000', 'dirty 페이지가 이 시간(1/100초) 이상이면 write-back 대상'] },
    { cells: ['vm.dirty_writeback_centisecs', '500', 'flush 스레드의 깨어나는 주기(1/100초)'] },
    { cells: ['vm.vfs_cache_pressure', '100', 'dentry/inode 캐시 회수 적극성. 50이면 덜 회수, 200이면 적극 회수'] },
    { cells: ['fs.file-max', '(동적)', '시스템 전체 최대 열린 파일 수'] },
    { cells: ['fs.nr_open', '1048576', '프로세스당 최대 fd 수'] },
    { cells: ['fs.inotify.max_user_watches', '8192', '사용자당 inotify 감시 최대 수'] },
]

export default function Topic11Filesystem() {
    return (
        <TopicPage topicId="04-filesystem" learningItems={[
                    'VFS가 다양한 파일시스템을 통일된 인터페이스로 추상화하는 방법을 이해합니다',
                    'inode, dentry, file 세 객체가 어떻게 협력하여 파일 접근을 처리하는지 배웁니다',
                    'Page Cache와 write-back으로 디스크 I/O를 최소화하는 원리를 파악합니다',
                ]}>
            {/* Header */}

            {/* 4.1 VFS 계층 구조 */}
            <Section id="s441" title="4.1  VFS — Virtual File System">
                <Prose>
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
                    같은 POSIX <T id="syscall">syscall</T>을 받아서 실제 파일시스템(<T id="ext4">ext4</T>, XFS, tmpfs, NFS 등)으로 전달합니다. 유저는 어떤
                    파일시스템을 쓰는지 몰라도 됩니다. <KernelRef path="include/linux/fs.h" sym="inode" />{' '}
                    <KernelRef path="include/linux/dcache.h" sym="dentry" />
                </Prose>

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
                    <InfoTable
                        headers={[
                            { header: '구조체', mono: true, cellClassName: 'text-blue-600 dark:text-blue-400 font-semibold' },
                            { header: '역할', cellClassName: 'text-gray-700 dark:text-gray-300' },
                            { header: '수명', cellClassName: 'text-gray-500 dark:text-gray-400' },
                        ] satisfies TableColumn[]}
                        rows={[
                            { cells: ['super_block', '마운트된 파일시스템 메타데이터', '마운트~언마운트'] },
                            { cells: ['inode', '파일의 메타데이터 (크기, 권한, 블록 위치)', '파일 존재 기간'] },
                            { cells: ['dentry', '디렉토리 항목 (이름→inode 매핑)', '캐시(dentry cache)'] },
                            { cells: ['file', '열린 파일 하나 (오프셋, 플래그 포함)', 'open()~close()'] },
                        ]}
                    />
                </div>

                {/* inode / dentry / file 관계 다이어그램 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        inode · dentry · file 관계
                    </div>

                    {/* open("foo.txt") 트리거 */}
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-full max-w-xs text-center font-mono text-xs bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-1.5 text-gray-700 dark:text-gray-300">
                            open("foo.txt")
                        </div>
                        <div className="text-gray-400 dark:text-gray-500 text-lg leading-none">↓</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* dentry */}
                        <div className="rounded-xl border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-3 space-y-2">
                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 font-mono uppercase tracking-wide">
                                struct dentry
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                ← 경로 이름 캐시 (dcache)
                            </div>
                            <pre className="font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{`d_name:   "foo.txt"
d_inode:  →→→→→→→→ (inode)
d_parent: (상위 dir)`}</pre>
                            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-blue-200 dark:border-blue-800 pt-2">
                                경로 탐색 성능의 핵심. hard link 시 여러 dentry가 같은 inode를 가리킬 수 있음.
                            </div>
                        </div>

                        {/* inode */}
                        <div className="rounded-xl border-2 border-green-400 dark:border-green-500 bg-green-50 dark:bg-green-950/30 p-3 space-y-2">
                            <div className="text-xs font-semibold text-green-600 dark:text-green-400 font-mono uppercase tracking-wide">
                                struct inode
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic">← 파일 메타데이터</div>
                            <pre className="font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{`i_ino:    1048577
i_size:   4096
i_blocks: 8
i_mode:   0644
i_op:     &ext4_inode_ops`}</pre>
                            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-green-200 dark:border-green-800 pt-2">
                                크기·권한·블록 위치를 담음. 실제 데이터는 디스크 블록을 참조.
                            </div>
                        </div>

                        {/* file */}
                        <div className="rounded-xl border-2 border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-950/30 p-3 space-y-2">
                            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 font-mono uppercase tracking-wide">
                                struct file
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic">← open()마다 생성</div>
                            <pre className="font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{`f_path.dentry: →→ (dentry)
f_op:    &ext4_file_ops
f_pos:   0
f_flags: O_RDONLY`}</pre>
                            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-purple-200 dark:border-purple-800 pt-2">
                                프로세스 fd 테이블에 등록. f_pos로 현재 읽기/쓰기 오프셋 추적.
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* 4.2 open() 흐름 */}
            <Section id="s442" title="4.2  open() 흐름 — VFS에서 ext4까지">
                <Prose>
                    유저가{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                        open("/etc/passwd", O_RDONLY)
                    </code>
                    를 호출하면 커널은 경로를 탐색하고, struct file을 생성하여 fd를 반환합니다. 이후{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                        read()
                    </code>
                    는 페이지 캐시를 확인하고 필요하면 디스크 I/O를 일으킵니다.
                </Prose>

                <AnimatedDiagram
                    steps={openFlowSteps}
                    renderStep={(step) => <OpenFlowViz step={step} />}
                    autoPlayInterval={2200}
                />

                <CodeBlock code={snippets.openFlowCode} language="c" filename="fs/open.c + fs/ext4/file.c" />
            </Section>

            {/* 4.3 페이지 캐시 */}
            <Section id="s443" title="4.3  페이지 캐시 — 디스크 I/O 최소화">
                <Prose>
                    커널은 디스크에서 읽은 데이터를{' '}
                    <strong className="text-gray-900 dark:text-gray-100">
                        페이지 캐시(Page Cache)
                    </strong>
                    에 보관합니다. 같은 파일을 다시 읽으면 디스크 접근 없이 캐시에서 반환합니다. write()된 데이터는 먼저
                    캐시에 기록되고(dirty 상태), 백그라운드에서 디스크에 씁니다.
                </Prose>

                <CodeBlock code={snippets.pageCacheCode} language="bash" filename="# 페이지 캐시 확인" />

                {/* dirty 페이지 설명 카드 3개 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <InfoBox color="red" title="dirty 페이지">
                        write()된 데이터가 캐시에는 있지만 디스크에 아직 없는 상태. 전력 차단 시 손실 가능.
                    </InfoBox>
                    <InfoBox color="amber" title="pdflush / writeback">
                        백그라운드 커널 스레드가 주기적으로 dirty 페이지를 디스크에 기록합니다
                        (dirty_expire_centisecs).
                    </InfoBox>
                    <InfoBox color="green" title="fsync()">
                        애플리케이션이 명시적으로 dirty 페이지 즉시 디스크 기록을 요청합니다. DB의 WAL 커밋에 필수.
                    </InfoBox>
                </div>

                {/* write-back 흐름 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        write-back 흐름
                    </div>

                    {/* 수직 흐름 다이어그램 */}
                    <div className="flex flex-col items-center gap-0.5">
                        {[
                            {
                                label: 'write(fd, buf, n)',
                                color: 'bg-blue-100 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300',
                            },
                            {
                                label: '페이지 캐시 내 페이지를 dirty 표시',
                                color: 'bg-yellow-100 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300',
                            },
                            {
                                label: '주기적: pdflush / kworker (writeback_control)\n또는 sync / fsync 즉시 트리거',
                                color: 'bg-orange-100 dark:bg-orange-950/40 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300',
                            },
                            {
                                label: 'ext4_writepages() → submit_bio()',
                                color: 'bg-purple-100 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300',
                            },
                            {
                                label: '블록 레이어 → 디스크',
                                color: 'bg-green-100 dark:bg-green-950/40 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300',
                            },
                        ].map((step, i, arr) => (
                            <div key={i} className="flex flex-col items-center w-full max-w-sm">
                                <div
                                    className={`w-full text-center font-mono text-xs border rounded px-3 py-1.5 whitespace-pre-line ${step.color}`}
                                >
                                    {step.label}
                                </div>
                                {i < arr.length - 1 && (
                                    <div className="text-gray-400 dark:text-gray-500 text-lg leading-none">↓</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* sync 방법 비교 표 */}
                    <InfoTable
                        headers={[
                            { header: '방법', mono: true, cellClassName: 'text-blue-600 dark:text-blue-400 font-semibold' },
                            { header: '동작', cellClassName: 'text-gray-700 dark:text-gray-300' },
                            { header: '보장 수준', cellClassName: 'text-gray-500 dark:text-gray-400' },
                        ] satisfies TableColumn[]}
                        rows={[
                            { cells: ['write()', '페이지 캐시에만 쓰고 즉시 반환', '캐시 일관성만'] },
                            { cells: ['sync()', '전체 dirty 페이지 플러시', '파일시스템 전체'] },
                            { cells: ['fsync(fd)', '특정 파일 데이터+메타데이터 플러시', '파일 단위 내구성'] },
                            { cells: ['fdatasync(fd)', '데이터만 플러시 (메타데이터 제외)', '데이터 내구성만'] },
                            { cells: ['O_SYNC', 'write() 시마다 즉시 플러시', '매 쓰기 내구성'] },
                            { cells: ['O_DSYNC', '데이터만 즉시 플러시', '데이터만'] },
                        ]}
                    />

                    {/* dirty_expire_centisecs 설명 */}
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-4 py-3 space-y-1">
                        <code className="text-xs font-mono text-yellow-600 dark:text-yellow-400">
                            /proc/sys/vm/dirty_expire_centisecs
                        </code>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            기본값 <strong className="text-gray-800 dark:text-gray-200">3000 (= 30초)</strong>. dirty
                            페이지가 이 시간을 초과하면 백그라운드 writeback이 강제 시작됩니다. DB처럼 내구성이 중요한
                            앱은{' '}
                            <code className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">fsync()</code>
                            를 명시적으로 호출해야 합니다.
                        </p>
                    </div>
                </div>

                <CodeBlock code={snippets.writebackCode} language="bash" filename="# write-back 모니터링" />
            </Section>

            {/* 4.4 ext4 저널링 */}
            <Section id="s444" title="4.4  ext4 — 널리 쓰이는 저널링 파일시스템">
                <Prose>
                    ext4는 Linux의 기본 파일시스템입니다.
                    <strong className="text-gray-900 dark:text-gray-100"> 저널(journal)</strong>로 크래시 후에도
                    파일시스템 일관성을 보장합니다. <T id="journaling">저널링</T> 모드에 따라 성능과 안전성이 달라집니다.{' '}
                    <KernelRef path="fs/ext4/" label="fs/ext4/" />
                </Prose>

                {/* 저널링 모드 테이블 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            ext4 저널링 모드
                        </span>
                    </div>
                    <InfoTable
                        headers={['모드', '저널 내용', '성능', '안전성']}
                        rows={[
                            { cells: [<code key="wb" className="font-mono text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">data=writeback</code>, '메타데이터만', <span key="p1" className="font-semibold text-green-600 dark:text-green-400">빠름</span>, '크래시 시 데이터 손실 가능'] },
                            { cells: [<code key="od" className="font-mono text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">data=ordered (기본)</code>, '메타데이터 + 데이터 순서 보장', <span key="p2" className="font-semibold text-yellow-600 dark:text-yellow-400">중간</span>, '데이터는 메타데이터 전에 기록'] },
                            { cells: [<code key="jn" className="font-mono text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">data=journal</code>, '메타데이터 + 데이터 모두', <span key="p3" className="font-semibold text-red-600 dark:text-red-400">느림</span>, '완전한 보호'] },
                        ]}
                    />
                </div>

                <CodeBlock code={snippets.ext4Code} language="bash" filename="# ext4 실전 명령어" />
            </Section>

            {/* 4.5 블록 I/O 경로 */}
            <Section id="s445" title="4.5  블록 I/O 경로 — bio에서 드라이버까지">
                <Prose>
                    파일시스템이 데이터를 읽고 쓸 때 최종적으로는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                        submit_bio()
                    </code>
                    를 호출해 블록 레이어로 I/O를 전달합니다. 블록 레이어는{' '}
                    <strong className="text-gray-900 dark:text-gray-100">
                        <T id="bio">bio</T>
                    </strong>{' '}
                    → <strong className="text-gray-900 dark:text-gray-100">request</strong> →{' '}
                    <strong className="text-gray-900 dark:text-gray-100">드라이버</strong> 순으로 처리합니다.{' '}
                    <KernelRef path="include/linux/bio.h" sym="bio" />
                </Prose>

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
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
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
                                <span className="text-sm font-bold" style={{ color: card.color }}>
                                    {card.title}
                                </span>
                                <span
                                    className="text-xs px-1.5 py-0.5 rounded-full font-mono"
                                    style={{ backgroundColor: card.color + '22', color: card.color }}
                                >
                                    {card.badge}
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>

                <CodeBlock
                    code={snippets.blockIOCode}
                    language="c"
                    filename="include/linux/blk_types.h — bio 구조체 & submit 흐름"
                />
                <CodeBlock code={snippets.blockSchedCode} language="bash" filename="# 블록 I/O 스케줄러 실전" />
            </Section>

            {/* 4.6 대표 파일시스템 비교 */}
            <Section id="s446" title="4.6  대표 파일시스템 비교 — ext4 · XFS · Btrfs · overlayfs">
                <Prose>
                    VFS 추상화 덕분에 리눅스는 같은 시스템에서 여러 파일시스템을 동시에 마운트할 수
                    있습니다. 디스크 기반(ext4, XFS, Btrfs), 메모리 기반(tmpfs), 커널 정보 노출용 가상 FS(procfs,
                    sysfs), 컨테이너 레이어링(<T id="overlayfs">overlayfs</T>), 원격 파일(NFS)이 대표적입니다.
                </Prose>

                {/* 비교 표 */}
                <InfoTable
                    headers={[
                        { header: '파일시스템', cellClassName: 'text-gray-900 dark:text-gray-100 font-bold' },
                        { header: '유형', cellClassName: 'text-gray-700 dark:text-gray-300' },
                        { header: '핵심 특징', cellClassName: 'text-gray-600 dark:text-gray-400' },
                        { header: '주요 용도', cellClassName: 'text-gray-600 dark:text-gray-400' },
                    ] satisfies TableColumn[]}
                    rows={[
                        { cells: ['ext4', '디스크', 'extent 기반 할당, 메타데이터 저널링, 최대 1EB', '범용 리눅스 부트 디스크'] },
                        { cells: ['XFS', '디스크', 'B+트리 extent 맵, 병렬 I/O, RHEL 기본 FS', '대용량 파일, DB, NAS'] },
                        { cells: ['Btrfs', '디스크·CoW', 'Copy-on-Write, 체크섬, 스냅샷, RAID', 'Fedora/openSUSE, 백업'] },
                        { cells: ['tmpfs', '메모리', 'RAM+swap 사용, 재부팅 시 소멸', '/tmp, /run, /dev/shm'] },
                        { cells: ['procfs', '가상', '커널 프로세스 정보를 파일 트리로 노출', '/proc/PID/, /proc/sys/'] },
                        { cells: ['sysfs', '가상', '디바이스 드라이버 모델 노출', '/sys/block/, /sys/bus/'] },
                        { cells: ['overlayfs', '유니온', 'lower(RO)+upper(RW)→merged, copy-up', 'Docker/containerd 레이어'] },
                        { cells: ['NFS', '네트워크', 'NFSv4, Kerberos 인증, 원격 마운트', 'HPC 클러스터, 기업 NAS'] },
                    ]}
                />

                {/* 3가지 카테고리 카드 */}
                <CardGrid cols={3}>
                    {[
                        {
                            title: '디스크 기반 FS',
                            color: '#3b82f6',
                            items: [
                                {
                                    name: 'ext4',
                                    desc: '리눅스 표준. journal 모드로 메타데이터 보호(ordered가 기본). extent 트리로 연속 블록을 하나의 레코드로 표현해 단편화를 줄임. e2fsck로 무결성 검사.',
                                },
                                {
                                    name: 'XFS',
                                    desc: 'SGI가 개발, RHEL/Rocky 기본 FS. Allocation Group을 병렬로 처리해 멀티코어 I/O에 강함. delayed allocation으로 불필요한 블록 예약을 방지.',
                                },
                                {
                                    name: 'Btrfs',
                                    desc: 'CoW로 모든 쓰기를 새 위치에 기록 → 스냅샷이 O(1). 셀프 힐링 체크섬으로 비트 부패 감지. 온라인 리밸런스·리사이즈 지원.',
                                },
                            ],
                        },
                        {
                            title: '메모리·가상 FS',
                            color: '#10b981',
                            items: [
                                {
                                    name: 'tmpfs',
                                    desc: 'RAM과 swap을 backing store로 사용. size= 옵션으로 상한 지정. /run(부팅 런타임), /dev/shm(POSIX 공유 메모리)에 기본 마운트됨.',
                                },
                                {
                                    name: 'procfs',
                                    desc: '커널이 요청 시 파일 내용을 동적으로 생성. /proc/net/tcp로 소켓 상태 조회, /proc/sys/net/ipv4/로 네트워크 파라미터를 런타임에 제어.',
                                },
                                {
                                    name: 'sysfs',
                                    desc: 'kobject 트리를 파일 경로로 노출. /sys/block/sda/queue/scheduler에 쓰면 I/O 스케줄러 변경. udev가 sysfs를 폴링해 /dev 노드를 생성.',
                                },
                            ],
                        },
                        {
                            title: '유니온·네트워크 FS',
                            color: '#ef4444',
                            items: [
                                {
                                    name: 'overlayfs',
                                    desc: 'lower dir(이미지, RO)와 upper dir(컨테이너 쓰기, RW)를 병합해 merged 뷰 제공. 최초 쓰기 시 lower → upper로 copy-up. 파일 삭제는 whiteout 파일로 마킹.',
                                },
                                {
                                    name: 'NFS',
                                    desc: 'RPC/XDR 기반 원격 마운트. NFSv4.1에서 병렬 NFS(pNFS) 지원. rsize/wsize를 1MB로 늘리면 처리량 극대화. /proc/net/rpc/nfsd로 서버 통계 확인.',
                                },
                            ],
                        },
                    ].map((cat) => (
                        <div
                            key={cat.title}
                            className="rounded-xl border p-4 space-y-3 bg-white dark:bg-gray-900"
                            style={{ borderColor: cat.color + '55' }}
                        >
                            <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: cat.color }}>
                                {cat.title}
                            </div>
                            {cat.items.map((item) => (
                                <div key={item.name} className="space-y-1">
                                    <div className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100">
                                        {item.name}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ))}
                </CardGrid>

                {/* overlayfs 레이어 다이어그램 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        overlayfs 레이어 구조 — Docker 컨테이너 예시
                    </div>
                    <div className="rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 p-3">
                        <div className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300 mb-2">
                            Merged View (컨테이너가 보는 파일 트리)
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[
                                '/etc/hosts ✎',
                                '/app/config.json ✎',
                                '/usr/bin/python3',
                                '/lib/libc.so',
                                '/app/code.py',
                            ].map((f) => (
                                <span
                                    key={f}
                                    className="text-xs font-mono bg-purple-100 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded"
                                >
                                    {f}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
                        <span>copy-up — 최초 쓰기 시 lower → upper로 파일 복사</span>
                        <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-700" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
                            <div className="text-xs font-mono font-bold text-red-600 dark:text-red-400 mb-1.5">
                                Upper Dir (컨테이너 쓰기층, RW)
                            </div>
                            {['/etc/hosts', '/app/config.json'].map((f) => (
                                <div key={f} className="text-xs font-mono text-red-600 dark:text-red-400">
                                    {f}
                                </div>
                            ))}
                        </div>
                        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
                            <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 mb-1.5">
                                Lower Dir (이미지 레이어, RO)
                            </div>
                            {['/usr/bin/python3', '/lib/libc.so', '/app/code.py'].map((f) => (
                                <div key={f} className="text-xs font-mono text-blue-600 dark:text-blue-400">
                                    {f}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <CodeBlock code={snippets.fsOverviewCode} language="bash" filename="# 파일시스템 탐색 실전 명령어" />
            </Section>

            {/* 4.7 리눅스 파일 종류와 권한 */}
            <Section id="s447" title="4.7  리눅스 파일 종류와 권한">
                <Prose>
                    리눅스에서 "모든 것은 파일"입니다. 일반 파일뿐 아니라 디렉토리, 디바이스, 파이프, 소켓까지 7종의 파일
                    타입이 존재하며, 각 파일에는 <strong className="text-gray-900 dark:text-gray-100">mode bits(rwx)</strong>로
                    접근 권한을 제어합니다.
                </Prose>

                {/* 7종 파일 타입 테이블 */}
                <InfoTable
                    headers={['문자', '타입', '예시']}
                    rows={[
                        { cells: ['-', '일반 파일', '/etc/passwd'] },
                        { cells: ['d', '디렉토리', '/home/user'] },
                        { cells: ['l', '심볼릭 링크', '/usr/bin/python → python3'] },
                        { cells: ['b', '블록 디바이스', '/dev/sda'] },
                        { cells: ['c', '캐릭터 디바이스', '/dev/tty0'] },
                        { cells: ['p', '파이프 (FIFO)', 'mkfifo /tmp/pipe'] },
                        { cells: ['s', '소켓', '/var/run/docker.sock'] },
                    ]}
                />

                {/* mode bits 설명 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        mode bits — rwx 권한과 8진수 표기법
                    </div>
                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        <p>
                            파일 권한은 <strong className="text-gray-900 dark:text-gray-100">owner / group / others</strong> 3개
                            그룹으로 나뉘며, 각 그룹에 <code className="font-mono text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1 rounded">r(4) w(2) x(1)</code> 비트를
                            조합합니다.
                        </p>
                        <div className="flex flex-wrap gap-3 font-mono text-xs">
                            {[
                                { label: '0755', desc: 'rwxr-xr-x — 소유자 전체, 나머지 읽기+실행' },
                                { label: '0644', desc: 'rw-r--r-- — 소유자 읽기+쓰기, 나머지 읽기만' },
                                { label: '0700', desc: 'rwx------ — 소유자만 전체 권한' },
                            ].map((ex) => (
                                <div key={ex.label} className="flex-1 min-w-[200px] rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-3 py-2">
                                    <span className="text-blue-600 dark:text-blue-300 font-bold">{ex.label}</span>
                                    <span className="text-gray-500 dark:text-gray-400 ml-2">{ex.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 특수 비트 */}
                    <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                            특수 비트
                        </div>
                        <InfoTable
                            headers={[
                                { header: '비트', mono: true, cellClassName: 'text-blue-600 dark:text-blue-400 font-semibold' },
                                { header: '8진수', mono: true, cellClassName: 'text-gray-700 dark:text-gray-300' },
                                { header: '표시', mono: true, cellClassName: 'text-gray-700 dark:text-gray-300' },
                                { header: '설명', cellClassName: 'text-gray-600 dark:text-gray-400' },
                            ] satisfies TableColumn[]}
                            rows={[
                                { cells: ['setuid', '4000', 's (owner x 위치)', '실행 시 소유자 권한으로 실행'] },
                                { cells: ['setgid', '2000', 's (group x 위치)', '실행 시 그룹 권한 / 디렉토리: 그룹 상속'] },
                                { cells: ['sticky', '1000', 't (others x 위치)', '디렉토리 내 파일을 소유자만 삭제 가능 (/tmp)'] },
                            ]}
                        />
                    </div>
                </div>

                <CodeBlock code={snippets.filePermCode} language="bash" filename="# 파일 타입·권한 실전 명령어" />

                <Alert variant="warning" title="setuid/setgid 보안 주의">
                    setuid 바이너리는 실행 시 소유자(보통 root) 권한으로 실행됩니다. 공격자가 setuid 바이너리의
                    취약점을 악용하면 권한 상승(privilege escalation)이 가능하므로, setuid가 설정된 파일을 정기적으로
                    점검해야 합니다. <code className="font-mono text-xs bg-orange-100 dark:bg-orange-900/30 px-1 rounded">find / -perm -4000 -type f</code>로
                    시스템 내 setuid 파일을 검색할 수 있습니다.
                </Alert>
            </Section>

            <Section id="s448" title="4.8  관련 커널 파라미터">
                <Prose>
                    파일시스템과 I/O 성능에 직접 영향을 미치는 주요 커널 파라미터입니다.
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">sysctl</code> 명령으로
                    조회·변경할 수 있으며, <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">/etc/sysctl.conf</code>에
                    기록하면 부팅 시 자동 적용됩니다.
                </Prose>
                <InfoTable headers={['파라미터', '기본값', '설명']} rows={kernelParamRows} />
                <CodeBlock code={snippets.fsKernelParamCode} language="bash" filename="# 파일시스템 관련 파라미터 확인" />
            </Section>
        </TopicPage>
    )
}
