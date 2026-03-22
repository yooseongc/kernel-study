// ─────────────────────────────────────────────────────────────────────────────
// 4.2  open() 흐름 step별 시각화
// ─────────────────────────────────────────────────────────────────────────────

export function OpenFlowViz({ step }: { step: number }) {
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
