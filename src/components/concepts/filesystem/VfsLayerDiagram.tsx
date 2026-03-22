// ─────────────────────────────────────────────────────────────────────────────
// 4.1  VFS 레이어 다이어그램
// ─────────────────────────────────────────────────────────────────────────────

export function VfsLayerDiagram() {
    const layers = [
        {
            label: '유저 공간',
            sublabel: 'open()  read()  write()',
            bgClass: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-700',
            textClass: 'text-blue-700 dark:text-blue-300',
            subTextClass: 'text-blue-500 dark:text-blue-400/70',
        },
        {
            label: 'syscall 인터페이스',
            sublabel: 'sys_open  sys_read  sys_write',
            bgClass: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-700',
            textClass: 'text-orange-700 dark:text-orange-300',
            subTextClass: 'text-orange-500 dark:text-orange-400/70',
        },
        {
            label: 'VFS 레이어',
            sublabel: 'struct file · struct inode · struct dentry · struct super_block',
            bgClass: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-700',
            textClass: 'text-purple-700 dark:text-purple-300',
            subTextClass: 'text-purple-500 dark:text-purple-400/70',
        },
        {
            label: '파일시스템',
            sublabel: 'ext4  XFS  tmpfs  NFS  proc',
            bgClass: 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-700',
            textClass: 'text-green-700 dark:text-green-300',
            subTextClass: 'text-green-500 dark:text-green-400/70',
        },
        {
            label: '블록 레이어',
            sublabel: 'bio · request_queue · I/O 스케줄러',
            bgClass: 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-700',
            textClass: 'text-yellow-700 dark:text-yellow-300',
            subTextClass: 'text-yellow-600 dark:text-yellow-400/70',
        },
        {
            label: '디바이스 드라이버',
            sublabel: 'NVMe  SATA  가상 블록',
            bgClass: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-700',
            textClass: 'text-red-700 dark:text-red-300',
            subTextClass: 'text-red-500 dark:text-red-400/70',
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
