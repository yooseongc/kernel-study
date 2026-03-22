// ─────────────────────────────────────────────────────────────────────────────
// 4.1  VFS 레이어 다이어그램
// ─────────────────────────────────────────────────────────────────────────────

export function VfsLayerDiagram() {
    const layers = [
        {
            label: '유저 공간',
            sublabel: 'open()  read()  write()',
            bgClass: 'bg-blue-950/40 border-blue-700',
            textClass: 'text-blue-300',
            subTextClass: 'text-blue-400/70',
        },
        {
            label: 'syscall 인터페이스',
            sublabel: 'sys_open  sys_read  sys_write',
            bgClass: 'bg-orange-950/40 border-orange-700',
            textClass: 'text-orange-300',
            subTextClass: 'text-orange-400/70',
        },
        {
            label: 'VFS 레이어',
            sublabel: 'struct file · struct inode · struct dentry · struct super_block',
            bgClass: 'bg-purple-950/40 border-purple-700',
            textClass: 'text-purple-300',
            subTextClass: 'text-purple-400/70',
        },
        {
            label: '파일시스템',
            sublabel: 'ext4  XFS  tmpfs  NFS  proc',
            bgClass: 'bg-green-950/40 border-green-700',
            textClass: 'text-green-300',
            subTextClass: 'text-green-400/70',
        },
        {
            label: '블록 레이어',
            sublabel: 'bio · request_queue · I/O 스케줄러',
            bgClass: 'bg-yellow-950/40 border-yellow-700',
            textClass: 'text-yellow-300',
            subTextClass: 'text-yellow-400/70',
        },
        {
            label: '디바이스 드라이버',
            sublabel: 'NVMe  SATA  가상 블록',
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
