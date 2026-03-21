import { useState, useCallback } from 'react'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { D3Container } from '../../components/viz/D3Container'
import { AnimatedDiagram } from '../../components/viz/AnimatedDiagram'
import { useTheme } from '../../hooks/useTheme'
import * as d3 from 'd3'
import { themeColors } from '../../lib/colors'
import { T } from '../../components/ui/GlossaryTooltip'
import { Section } from '../../components/ui/Section'
import { Prose } from '../../components/ui/Prose'
import { InfoTable, type TableRow } from '../../components/ui/InfoTable'
import { LearningCard } from '../../components/ui/LearningCard'

// ─────────────────────────────────────────────────────────────────────────────
// 10.2  드라이버 계층 트리 (D3 horizontal tree)
// ─────────────────────────────────────────────────────────────────────────────

interface DriverNode {
  name: string
  sub?: string
  kind?: 'root' | 'char' | 'block' | 'net'
  children?: DriverNode[]
}

const driverTreeData: DriverNode = {
    name: '커널',
    kind: 'root',
    children: [
        {
            name: '문자 디바이스',
            kind: 'char',
            children: [
                { name: '/dev/ttyS0', sub: '시리얼', kind: 'char' },
                { name: '/dev/input', sub: '키보드/마우스', kind: 'char' },
            ],
        },
        {
            name: '블록 디바이스',
            kind: 'block',
            children: [
                { name: '/dev/sda', sub: 'SCSI/SATA', kind: 'block' },
                { name: '/dev/nvme0', sub: 'NVMe', kind: 'block' },
            ],
        },
        {
            name: '네트워크 디바이스',
            kind: 'net',
            children: [
                { name: 'eth0', sub: 'e1000 드라이버', kind: 'net' },
                { name: 'lo', sub: '루프백', kind: 'net' },
            ],
        },
    ],
}

function kindColors(kind: DriverNode['kind'], isDark: boolean) {
    const c = themeColors(isDark)
    switch (kind) {
        case 'char':
            return { fill: c.amberFill, stroke: c.amberStroke, text: c.amberText }
        case 'block':
            return { fill: c.blueFill,  stroke: c.blueStroke,  text: c.blueText }
        case 'net':
            return { fill: c.greenFill, stroke: c.greenStroke, text: c.greenText }
        default:
            return { fill: c.bgCard,    stroke: c.textDim,     text: c.text }
    }
}

function renderDriverTree(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    isDark: boolean,
) {
    const c = themeColors(isDark)
    const bg = c.bg
    svg.style('background', bg)

    const g = svg.append('g')

    const padX = 24
    const padY = 20
    const innerW = width - padX * 2
    const innerH = height - padY * 2

    const root = d3.hierarchy<DriverNode>(driverTreeData)
    const treeLayout = d3.tree<DriverNode>().size([innerH, innerW])
    treeLayout(root)

    const nodeW = 108
    const nodeH = 36

    // Links
    const linkColor = c.link

    const links = root.links() as d3.HierarchyPointLink<DriverNode>[]
    links.forEach((link) => {
        const s = link.source as d3.HierarchyPointNode<DriverNode>
        const t = link.target as d3.HierarchyPointNode<DriverNode>

        const sx = padX + s.y
        const sy = padY + s.x
        const tx = padX + t.y
        const ty = padY + t.x

        // bezier: source right edge → target left edge
        const mx = (sx + nodeW / 2 + tx - nodeW / 2) / 2

        g.append('path')
            .attr(
                'd',
                `M${sx + nodeW / 2},${sy} C${mx},${sy} ${mx},${ty} ${tx - nodeW / 2},${ty}`,
            )
            .attr('fill', 'none')
            .attr('stroke', linkColor)
            .attr('stroke-width', 1.5)
    })

    // Nodes
    root.descendants().forEach((d) => {
        const nd = d as d3.HierarchyPointNode<DriverNode>
        const cx = padX + nd.y
        const cy = padY + nd.x
        const colors = kindColors(nd.data.kind, isDark)

        g.append('rect')
            .attr('x', cx - nodeW / 2)
            .attr('y', cy - nodeH / 2)
            .attr('width', nodeW)
            .attr('height', nodeH)
            .attr('rx', 6)
            .attr('fill', colors.fill)
            .attr('stroke', colors.stroke)
            .attr('stroke-width', 1.5)

        g.append('text')
            .attr('x', cx)
            .attr('y', cy + (nd.data.sub ? -5 : 1))
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('fill', colors.text)
            .attr('font-size', '10px')
            .attr('font-family', 'monospace')
            .attr('font-weight', 'bold')
            .text(nd.data.name)

        if (nd.data.sub) {
            g.append('text')
                .attr('x', cx)
                .attr('y', cy + 10)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', c.textMuted)
                .attr('font-size', '8px')
                .attr('font-family', 'monospace')
                .text(nd.data.sub)
        }
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// 10.3  NIC DMA 흐름 — AnimatedDiagram
// ─────────────────────────────────────────────────────────────────────────────

const dmaSteps = [
    {
        label: '① NIC: 패킷 수신',
        description: '물리 NIC가 이더넷 프레임을 수신합니다.',
    },
    {
        label: '② DMA 서술자 확인',
        description: 'NIC가 드라이버가 준비한 RX 링 버퍼의 DMA 서술자를 확인합니다.',
    },
    {
        label: '③ DMA 전송',
        description: 'NIC가 CPU 개입 없이 패킷을 RAM에 직접 씁니다 (PCIe DMA).',
    },
    {
        label: '④ IRQ 발생',
        description: 'DMA 완료 후 NIC가 CPU에 인터럽트를 전송합니다.',
    },
    {
        label: '⑤ 드라이버 처리',
        description: 'ISR → NAPI poll → sk_buff 생성 → netif_receive_skb().',
    },
]

type DmaZone = 'nic' | 'pcie' | 'ram'

interface DmaStepData {
  active: DmaZone[]
  arrow?: { from: DmaZone; to: DmaZone }
  note: string
}

const dmaStepData: DmaStepData[] = [
    { active: ['nic'], note: 'NIC 하드웨어: 이더넷 프레임 수신 완료' },
    {
        active: ['nic', 'ram'],
        note: 'NIC → RX 링 버퍼의 DMA 서술자 확인 (buffer_addr, length)',
    },
    {
        active: ['nic', 'pcie', 'ram'],
        arrow: { from: 'nic', to: 'ram' },
        note: 'PCIe DMA: CPU 개입 없이 패킷 데이터를 RAM에 직접 기록',
    },
    {
        active: ['nic', 'pcie'],
        arrow: { from: 'nic', to: 'pcie' },
        note: 'NIC가 DMA 완료 후 CPU에 IRQ 전송',
    },
    {
        active: ['pcie', 'ram'],
        note: 'ISR → NAPI poll → sk_buff 생성 → netif_receive_skb()',
    },
]

interface DmaZoneDef {
  id: DmaZone
  label: string
  sub: string
  color: string
  activeColor: string
  border: string
  activeBorder: string
}

const dmaZones: DmaZoneDef[] = [
    {
        id: 'nic',
        label: 'NIC 하드웨어',
        sub: 'PHY · MAC · DMA 엔진',
        color: '#1a1f2e',
        activeColor: '#450a0a',
        border: '#374151',
        activeBorder: '#ef4444',
    },
    {
        id: 'pcie',
        label: 'PCIe / DMA',
        sub: 'IRQ · 버스 마스터',
        color: '#1a1f2e',
        activeColor: '#78350f',
        border: '#374151',
        activeBorder: '#f59e0b',
    },
    {
        id: 'ram',
        label: 'RAM + 드라이버',
        sub: 'RX 링 버퍼 · sk_buff',
        color: '#1a1f2e',
        activeColor: '#0c1a3a',
        border: '#374151',
        activeBorder: '#3b82f6',
    },
]

function DMAViz({ step }: { step: number }) {
    const current = dmaStepData[step]

    return (
        <div className="space-y-4 p-2">
            <div className="flex gap-3">
                {dmaZones.map((z, zi) => {
                    const isActive = current.active.includes(z.id)
                    const showArrow =
            current.arrow?.from === z.id &&
            dmaZones[zi + 1] !== undefined &&
            current.arrow.to === dmaZones[zi + 1].id
                    return (
                        <div key={z.id} className="flex items-center gap-3 flex-1">
                            <div
                                className="flex-1 rounded-xl p-4 text-center transition-all duration-300 min-h-[90px] flex flex-col items-center justify-center gap-1"
                                style={{
                                    background: isActive ? z.activeColor : z.color,
                                    border: `2px solid ${isActive ? z.activeBorder : z.border}`,
                                    boxShadow: isActive ? `0 0 16px ${z.activeBorder}55` : 'none',
                                }}
                            >
                                <div className="text-sm font-bold text-white">{z.label}</div>
                                <div className="text-[10px] text-gray-400">{z.sub}</div>
                                {isActive && (
                                    <div
                                        className="text-[9px] mt-1 font-mono px-2 py-0.5 rounded"
                                        style={{ background: z.activeBorder + '33', color: z.activeBorder }}
                                    >
                    활성
                                    </div>
                                )}
                            </div>
                            {showArrow && (
                                <div className="text-yellow-400 text-2xl font-bold select-none">→</div>
                            )}
                        </div>
                    )
                })}
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-xs text-gray-200 font-mono text-center">
                {current.note}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Code snippets
// ─────────────────────────────────────────────────────────────────────────────

const helloModuleCode = `/* 최소 커널 모듈 예제 */
#include <linux/module.h>
#include <linux/init.h>

MODULE_LICENSE("GPL");
MODULE_AUTHOR("Kernel Study");
MODULE_DESCRIPTION("Hello World 모듈");

static int __init hello_init(void) {
    printk(KERN_INFO "Hello, Kernel!\\n");
    return 0;  /* 0이 아니면 로드 실패 */
}

static void __exit hello_exit(void) {
    printk(KERN_INFO "Goodbye, Kernel!\\n");
}

module_init(hello_init);
module_exit(hello_exit);`

const rxRingCode = `/* RX 링 버퍼 초기화 (간략화) */
struct rx_desc {
    __le64 buffer_addr;   /* DMA 물리 주소 */
    __le16 length;
    __le16 status;        /* 수신 완료 시 NIC가 설정 */
};

/* 드라이버 초기화 시 */
for (int i = 0; i < RX_RING_SIZE; i++) {
    struct sk_buff *skb = netdev_alloc_skb(dev, RX_BUF_SIZE);

    /* 가상 주소 → DMA(물리) 주소 매핑 */
    dma_addr_t dma = dma_map_single(dev->dev.parent,
                                     skb->data, RX_BUF_SIZE,
                                     DMA_FROM_DEVICE);

    rx_ring[i].buffer_addr = cpu_to_le64(dma);
    rx_ring[i].status = 0;  /* NIC가 수신 후 이 필드를 설정 */
}

/* NIC에 링 버퍼 위치 알림 */
writel(dma_addr_of_ring, hw + RX_DESC_BASE);`

const netdevOpsCode = `static const struct net_device_ops my_netdev_ops = {
    .ndo_open           = my_open,
    .ndo_stop           = my_close,
    .ndo_start_xmit     = my_xmit,
    .ndo_get_stats64    = my_get_stats,
    .ndo_set_rx_mode    = my_set_rx_mode,
    .ndo_change_mtu     = my_change_mtu,
};

static int my_probe(struct pci_dev *pdev, ...) {
    struct net_device *netdev = alloc_etherdev(sizeof(struct my_adapter));
    netdev->netdev_ops = &my_netdev_ops;
    register_netdev(netdev);
}`

const cdevRegisterCode = `/* 문자 디바이스 등록 전체 흐름 */
#include <linux/cdev.h>
#include <linux/fs.h>

static dev_t dev_num;       /* major:minor 조합 */
static struct cdev my_cdev;

static int __init my_init(void)
{
    /* 1. major/minor 번호 동적 할당 */
    alloc_chrdev_region(&dev_num, 0, 1, "my_device");
    /* major = MAJOR(dev_num), minor = MINOR(dev_num) */

    /* 2. cdev 초기화 + file_operations 연결 */
    cdev_init(&my_cdev, &my_fops);
    my_cdev.owner = THIS_MODULE;

    /* 3. 커널에 등록 */
    cdev_add(&my_cdev, dev_num, 1);

    /* 4. /dev/my_device 자동 생성 (udev) */
    device_create(my_class, NULL, dev_num, NULL, "my_device");
    return 0;
}

/* 사용자가 확인하는 방법 */
/* cat /proc/devices | grep my_device */
/* ls -l /dev/my_device  → crw-rw-rw- 1 root root MAJOR, MINOR */`

const ioctlCode = `/* ioctl 명령 번호 정의 (include/uapi/linux/my_driver.h) */
#define MY_MAGIC 'M'
#define MY_IOCTL_RESET    _IO(MY_MAGIC, 0)        /* 인자 없음 */
#define MY_IOCTL_GET_STATUS _IOR(MY_MAGIC, 1, int) /* 커널→유저 */
#define MY_IOCTL_SET_RATE  _IOW(MY_MAGIC, 2, int)  /* 유저→커널 */

/* 드라이버 ioctl 핸들러 */
static long my_ioctl(struct file *file, unsigned int cmd, unsigned long arg)
{
    int val;
    switch (cmd) {
    case MY_IOCTL_RESET:
        reset_hardware(dev);
        break;
    case MY_IOCTL_GET_STATUS:
        val = read_status_register(dev);
        if (copy_to_user((int __user *)arg, &val, sizeof(val)))
            return -EFAULT;
        break;
    case MY_IOCTL_SET_RATE:
        if (copy_from_user(&val, (int __user *)arg, sizeof(val)))
            return -EFAULT;
        set_rate(dev, val);
        break;
    default:
        return -EINVAL;
    }
    return 0;
}

/* 유저스페이스 사용 */
int fd = open("/dev/my_device", O_RDWR);
ioctl(fd, MY_IOCTL_RESET);
ioctl(fd, MY_IOCTL_GET_STATUS, &status);
ioctl(fd, MY_IOCTL_SET_RATE, &rate);`

const mmapCode = `/* 드라이버 mmap 핸들러 — 하드웨어 레지스터/버퍼를 유저공간에 매핑 */
static int my_mmap(struct file *file, struct vm_area_struct *vma)
{
    unsigned long size = vma->vm_end - vma->vm_start;
    unsigned long phys = dev->hw_buffer_phys >> PAGE_SHIFT;

    /* 페이지 캐시 우회 — 하드웨어 메모리 직접 매핑 */
    vma->vm_page_prot = pgprot_noncached(vma->vm_page_prot);

    if (remap_pfn_range(vma, vma->vm_start, phys, size, vma->vm_page_prot))
        return -EAGAIN;
    return 0;
}

/* 유저스페이스에서 사용 */
int fd = open("/dev/my_device", O_RDWR);
void *buf = mmap(NULL, BUF_SIZE, PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
/* 이제 buf 포인터로 직접 하드웨어 메모리 접근 — DMA 버퍼, GPU 메모리 등 */`

const platformDriverCode = `/* Device Tree 노드 (arch/arm64/boot/dts/my_board.dts) */
/*
my_uart: serial@10000000 {
    compatible = "myvendor,my-uart";
    reg = <0x10000000 0x1000>;    // 레지스터 베이스 주소, 크기
    interrupts = <GIC_SPI 32 IRQ_TYPE_LEVEL_HIGH>;
    clocks = <&clk_uart>;
};
*/

/* 드라이버 매칭 테이블 */
static const struct of_device_id my_uart_of_match[] = {
    { .compatible = "myvendor,my-uart" },
    {}
};
MODULE_DEVICE_TABLE(of, my_uart_of_match);

/* probe: 장치 발견 시 호출 */
static int my_uart_probe(struct platform_device *pdev)
{
    struct resource *res;
    void __iomem *base;

    /* Device Tree에서 레지스터 주소 가져오기 */
    res = platform_get_resource(pdev, IORESOURCE_MEM, 0);
    base = devm_ioremap_resource(&pdev->dev, res);

    /* 인터럽트 번호 가져오기 */
    int irq = platform_get_irq(pdev, 0);
    devm_request_irq(&pdev->dev, irq, my_uart_isr, 0, "my_uart", pdev);

    dev_info(&pdev->dev, "my_uart probed at %pa\\n", &res->start);
    return 0;
}

/* remove: 장치 제거 시 호출 */
static int my_uart_remove(struct platform_device *pdev)
{
    /* devm_ 함수 사용 시 자동 정리 */
    return 0;
}

static struct platform_driver my_uart_driver = {
    .probe  = my_uart_probe,
    .remove = my_uart_remove,
    .driver = {
        .name           = "my_uart",
        .of_match_table = my_uart_of_match,
    },
};
module_platform_driver(my_uart_driver);  /* init/exit 자동 생성 */`

const pciDriverCode = `#include <linux/pci.h>

/* 지원하는 디바이스 목록 */
static const struct pci_device_id my_nic_ids[] = {
    { PCI_DEVICE(0x8086, 0x10D3) },  /* Intel 82574L */
    { PCI_DEVICE(0x8086, 0x1533) },  /* Intel I210 */
    { 0 }                             /* 목록 끝 */
};
MODULE_DEVICE_TABLE(pci, my_nic_ids);

/* probe: 장치 발견 시 커널이 호출 */
static int my_nic_probe(struct pci_dev *pdev,
                         const struct pci_device_id *id)
{
    int err;

    /* 1. PCI 장치 활성화 */
    err = pci_enable_device(pdev);

    /* 2. DMA 마스크 설정 (64비트 DMA 지원) */
    err = dma_set_mask_and_coherent(&pdev->dev, DMA_BIT_MASK(64));

    /* 3. BAR 0 메모리 영역 예약 */
    err = pci_request_regions(pdev, "my_nic");

    /* 4. BAR 0 → 가상 주소 매핑 (MMIO) */
    void __iomem *hw_base = pci_ioremap_bar(pdev, 0);

    /* 5. 버스 마스터 활성화 (DMA 허용) */
    pci_set_master(pdev);

    /* 6. MSI 인터럽트 활성화 */
    err = pci_alloc_irq_vectors(pdev, 1, 8, PCI_IRQ_MSI | PCI_IRQ_MSIX);
    int irq = pci_irq_vector(pdev, 0);
    request_irq(irq, my_nic_isr, 0, "my_nic", pdev);

    /* 7. 하드웨어 초기화 */
    writel(RESET_BIT, hw_base + REG_CTRL);
    netdev = alloc_etherdev(sizeof(struct my_nic_priv));
    register_netdev(netdev);

    pci_set_drvdata(pdev, netdev);
    return 0;
}

/* remove: 드라이버 언로드 또는 hotplug 제거 */
static void my_nic_remove(struct pci_dev *pdev)
{
    struct net_device *netdev = pci_get_drvdata(pdev);
    unregister_netdev(netdev);
    free_netdev(netdev);
    pci_release_regions(pdev);
    pci_disable_device(pdev);
}

static struct pci_driver my_nic_driver = {
    .name     = "my_nic",
    .id_table = my_nic_ids,
    .probe    = my_nic_probe,
    .remove   = my_nic_remove,
};
module_pci_driver(my_nic_driver);  /* init/exit 자동 생성 */`

const pciCommandsCode = `# PCIe 디바이스 목록 (Vendor:Device ID 포함)
lspci -nn

# 특정 디바이스 상세 정보
lspci -vvv -s 00:1f.6

# BAR 주소 확인
lspci -vvv | grep -A5 "Memory at"

# 커널이 로드한 드라이버 확인
lspci -k | grep -A3 "Network controller"

# MSI/MSI-X 인터럽트 확인
cat /proc/interrupts | grep my_nic

# PCIe 링크 속도/폭 확인
lspci -vvv | grep -E "LnkCap|LnkSta"
# LnkSta: Speed 8GT/s, Width x8 → PCIe 3.0 x8 = ~8GB/s`

const moduleParamCode = `/* 모듈 파라미터 */
static int debug_level = 0;
static int rx_ring_size = 256;

module_param(debug_level, int, 0644);
MODULE_PARM_DESC(debug_level, "디버그 레벨 (0=off, 1=basic, 2=verbose)");

module_param(rx_ring_size, int, 0444);
MODULE_PARM_DESC(rx_ring_size, "RX 링 버퍼 크기 (기본 256)");

/* 로드 시: insmod my_driver.ko debug_level=1 rx_ring_size=512 */
/* 런타임: echo 2 > /sys/module/my_driver/parameters/debug_level */`

// ─────────────────────────────────────────────────────────────────────────────
// 10.X  캐릭터 디바이스 전체 생명주기
// ─────────────────────────────────────────────────────────────────────────────

const chardevDriverCode = `/* mydev.c — 최소 캐릭터 디바이스 드라이버 */
#include <linux/module.h>
#include <linux/fs.h>
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/uaccess.h>

#define DEVICE_NAME "mydev"
#define BUF_SIZE    256

static dev_t dev_num;           /* major:minor */
static struct cdev my_cdev;
static struct class *my_class;
static char kbuf[BUF_SIZE];
static size_t kbuf_len;

/* file_operations 구현 */
static int mydev_open(struct inode *inode, struct file *file)
{
    pr_info("mydev: open\\n");
    return 0;
}

static ssize_t mydev_read(struct file *file, char __user *buf,
                           size_t count, loff_t *ppos)
{
    size_t to_copy = min(count, kbuf_len - (size_t)*ppos);
    if (copy_to_user(buf, kbuf + *ppos, to_copy))
        return -EFAULT;
    *ppos += to_copy;
    return to_copy;
}

static ssize_t mydev_write(struct file *file, const char __user *buf,
                            size_t count, loff_t *ppos)
{
    size_t to_copy = min(count, (size_t)BUF_SIZE);
    if (copy_from_user(kbuf, buf, to_copy))
        return -EFAULT;
    kbuf_len = to_copy;
    return to_copy;
}

static const struct file_operations mydev_fops = {
    .owner   = THIS_MODULE,
    .open    = mydev_open,
    .read    = mydev_read,
    .write   = mydev_write,
    .release = NULL,   /* 필요 시 구현 */
};

static int __init mydev_init(void)
{
    alloc_chrdev_region(&dev_num, 0, 1, DEVICE_NAME);
    cdev_init(&my_cdev, &mydev_fops);
    cdev_add(&my_cdev, dev_num, 1);
    my_class = class_create(DEVICE_NAME);
    device_create(my_class, NULL, dev_num, NULL, DEVICE_NAME);
    pr_info("mydev: loaded (major=%d)\\n", MAJOR(dev_num));
    return 0;
}

static void __exit mydev_exit(void)
{
    device_destroy(my_class, dev_num);
    class_destroy(my_class);
    cdev_del(&my_cdev);
    unregister_chrdev_region(dev_num, 1);
    pr_info("mydev: unloaded\\n");
}

module_init(mydev_init);
module_exit(mydev_exit);
MODULE_LICENSE("GPL");`

const chardevCommandsCode = `# 모듈 빌드 및 로드
make -C /lib/modules/$(uname -r)/build M=$PWD modules
insmod mydev.ko
lsmod | grep mydev

# major 번호 확인
cat /proc/devices | grep mydev
# 234 mydev

# /dev 노드 자동 생성 확인 (udev가 class_create 감지)
ls -la /dev/mydev
# crw------- 1 root root 234, 0 ...

# 유저 공간 테스트
echo "hello kernel" > /dev/mydev
cat /dev/mydev
# hello kernel

# 모듈 제거
rmmod mydev
dmesg | tail -5
# mydev: unloaded`

// ─────────────────────────────────────────────────────────────────────────────
// Static table data
// ─────────────────────────────────────────────────────────────────────────────

const moduleCommandRows: TableRow[] = [
    { cells: ['insmod hello.ko', '모듈 로드'] },
    { cells: ['rmmod hello', '모듈 언로드'] },
    { cells: ['modprobe hello', '의존성 자동 해결 후 로드'] },
    { cells: ['lsmod', '로드된 모듈 목록'] },
    { cells: ['modinfo hello.ko', '모듈 정보 (버전, 파라미터)'] },
]

const driverTypeRows: TableRow[] = [
    { cells: ['문자(char)', '시리얼, 키보드', '/dev/ttyS0', '순차 접근, read/write'] },
    { cells: ['블록(block)', 'HDD, SSD', '/dev/sda', '랜덤 접근, 버퍼링'] },
    { cells: ['네트워크', 'NIC 드라이버', 'eth0, ens3', '패킷 송수신'] },
]

const netdevOpsRows: TableRow[] = [
    { cells: ['ndo_open', 'ifconfig up / ip link set up', '링 버퍼 할당, IRQ 등록'] },
    { cells: ['ndo_stop', 'ifconfig down', '리소스 해제'] },
    { cells: ['ndo_start_xmit', '패킷 송신 요청', 'TX 링 버퍼에 패킷 추가'] },
    { cells: ['ndo_get_stats64', '통계 조회', 'ifconfig, ip -s 명령'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topic09() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    // suppress unused-state lint; useState is imported per project context requirement
    const [, ] = useState(0)

    const renderDriverTreeFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, w: number, h: number) => {
            renderDriverTree(svg, w, h, isDark)
        },
        [isDark]
    )

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Topic 10
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    디바이스 드라이버와 커널 모듈
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Device Drivers & Kernel Modules
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    커널 모듈, 문자/블록/네트워크 드라이버, NIC+DMA, PCI/PCIe 드라이버, platform driver
                </p>
            </header>

            <LearningCard
                topicId="10-drivers"
                items={[
                    '커널 모듈의 초기화/종료 생명주기와 module_init/module_exit 매크로를 이해합니다',
                    '문자 디바이스 드라이버가 file_operations 구조체를 통해 시스템 콜과 연결되는 방법을 배웁니다',
                    'NIC 드라이버의 DMA 설정과 IRQ 등록, NAPI 처리 루프를 파악합니다',
                ]}
            />

            {/* 10.1 커널 모듈 */}
            <Section id="s101" title="10.1  커널 모듈">
                <Prose>
          커널 모듈은 실행 중인 커널에 동적으로 로드/언로드 가능한 코드입니다. 재부팅 없이
          드라이버를 추가하거나 제거할 수 있으며, <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">module_init</code> / <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">module_exit</code> 매크로로
          로드·언로드 시 실행할 함수를 등록합니다.
                </Prose>
                <CodeBlock code={helloModuleCode} language="c" filename="hello.c" />
                <InfoTable
                    headers={['명령어', '동작']}
                    rows={moduleCommandRows}
                />
            </Section>

            {/* 10.2 디바이스 드라이버 종류 */}
            <Section id="s102" title="10.2  디바이스 드라이버 종류">
                <InfoTable
                    headers={['종류', '예시', '인터페이스', '특징']}
                    rows={driverTypeRows}
                />
                <div className="rounded-xl border border-gray-200 dark:border-gray-700">
                    <D3Container
                        renderFn={renderDriverTreeFn}
                        deps={[isDark]}
                        height={260}
                        zoomable={true}
                    />
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                        { label: '문자 디바이스', desc: '순차적 I/O. /dev/ttyS0, /dev/random 등. open/read/write/ioctl 인터페이스.', color: '#f59e0b' },
                        { label: '블록 디바이스', desc: '랜덤 접근 + 커널 버퍼 캐시. /dev/sda, /dev/nvme0. 블록 단위 I/O.', color: '#3b82f6' },
                        { label: '네트워크 디바이스', desc: '/dev 파일 없음. net_device 구조체로 등록. 소켓 계층과 연결.', color: '#22c55e' },
                    ].map((item) => (
                        <div
                            key={item.label}
                            className="rounded-lg px-3 py-3"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold mb-1" style={{ color: item.color }}>
                                {item.label}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 leading-snug">{item.desc}</div>
                        </div>
                    ))}
                </div>

                {/* 문자 디바이스 등록 흐름 */}
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-2">
          문자 디바이스 등록 흐름
                </h3>
                <CodeBlock code={cdevRegisterCode} language="c" filename="drivers/char/my_char.c" />
                <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                        {
                            title: '정적 할당',
                            code: 'register_chrdev_region(dev, count, name)',
                            desc: 'major 번호 직접 지정, 충돌 위험',
                            color: '#f59e0b',
                        },
                        {
                            title: '동적 할당',
                            code: 'alloc_chrdev_region(&dev, baseminor, count, name)',
                            desc: '커널이 빈 번호 자동 선택, 권장',
                            color: '#22c55e',
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-lg px-3 py-3 space-y-1.5"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}55`,
                            }}
                        >
                            <div className="font-semibold" style={{ color: item.color }}>
                                {item.title}
                            </div>
                            <div
                                className="font-mono text-[11px] break-all rounded px-2 py-1"
                                style={{
                                    background: isDark ? '#00000040' : '#ffffff80',
                                    color: isDark ? '#e5e7eb' : '#1f2937',
                                }}
                            >
                                {item.code}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 leading-snug">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 10.3 NIC 드라이버와 DMA */}
            <Section id="s103" title="10.3  NIC 드라이버와 DMA">
                <Prose>
          고성능 NIC는 CPU를 거치지 않고 <T id="dma">DMA</T>(Direct Memory Access)로 직접 메모리에 패킷을 씁니다.
          드라이버가 사전에 RX 링 버퍼의 <T id="dma">DMA</T> 주소를 NIC에 알려주면, NIC는 패킷 수신 시 해당
          주소로 데이터를 전송하고 <T id="irq">IRQ</T>를 발생시킵니다.
                </Prose>
                <AnimatedDiagram
                    steps={dmaSteps}
                    renderStep={(step) => <DMAViz step={step} />}
                    autoPlayInterval={2200}
                />
            </Section>

            {/* 10.4 DMA 링 버퍼 */}
            <Section id="s104" title="10.4  DMA 링 버퍼">
                <Prose>
          NIC 드라이버는 RX/TX 링 버퍼를 준비하고 NIC에 <T id="dma">DMA</T> 주소를 알려줍니다. 각 서술자(descriptor)에는
          물리 주소와 길이, 상태 플래그가 있으며, NIC는 수신 완료 시 status 필드를 갱신합니다.
                </Prose>
                <CodeBlock code={rxRingCode} language="c" filename="rx_ring_init.c" />
                <div className="rounded-lg border border-blue-800/40 bg-blue-900/20 px-4 py-3 text-xs text-blue-200">
                    <span className="font-bold text-blue-300">핵심:</span>{' '}
                    <span className="font-mono">dma_map_single()</span>은 가상 주소를 PCIe 버스에서
          접근 가능한 물리 주소로 변환합니다. IOMMU가 있는 환경에서는 IOMMU 매핑 테이블을 통해
          DMA 격리(isolation)가 이루어집니다.
                </div>
            </Section>

            {/* 10.5 드라이버와 커널 서브시스템 연결 */}
            <Section id="s105" title="10.5  드라이버와 커널 서브시스템 연결">
                <Prose>
          드라이버는 커널의 다양한 프레임워크에 콜백을 등록하는 방식으로 동작합니다.
          네트워크 드라이버는 <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">net_device_ops</code> 구조체에 함수 포인터를 채워
          커널에 등록하며, 커널은 필요한 시점에 해당 콜백을 호출합니다.
                </Prose>
                <InfoTable
                    headers={['콜백', '호출 시점', '동작']}
                    rows={netdevOpsRows}
                />
                <CodeBlock code={netdevOpsCode} language="c" filename="my_driver.c" />
            </Section>

            {/* 10.6 모듈 파라미터와 sysfs */}
            <Section id="s106" title="10.6  모듈 파라미터와 sysfs">
                <Prose>
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">module_param()</code> 매크로로
          로드 시 파라미터를 받을 수 있고, 권한(0644)에 따라 런타임에
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">/sys/module/&lt;name&gt;/parameters/</code>를 통해 동적으로 변경할 수도 있습니다.
                </Prose>
                <CodeBlock code={moduleParamCode} language="c" filename="module_param.c" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                        {
                            title: '로드 시 파라미터',
                            code: 'insmod my_driver.ko debug_level=1 rx_ring_size=512',
                            color: '#22c55e',
                        },
                        {
                            title: '런타임 변경 (0644 권한)',
                            code: 'echo 2 > /sys/module/my_driver/parameters/debug_level',
                            color: '#f59e0b',
                        },
                        {
                            title: '파라미터 조회',
                            code: 'cat /sys/module/my_driver/parameters/rx_ring_size',
                            color: '#3b82f6',
                        },
                        {
                            title: '모듈 정보',
                            code: 'modinfo my_driver.ko | grep parm',
                            color: '#8b5cf6',
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-lg px-3 py-3 space-y-1.5"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}55`,
                            }}
                        >
                            <div className="font-semibold" style={{ color: item.color }}>
                                {item.title}
                            </div>
                            <div
                                className="font-mono text-[11px] break-all rounded px-2 py-1"
                                style={{
                                    background: isDark ? '#00000040' : '#ffffff80',
                                    color: isDark ? '#e5e7eb' : '#1f2937',
                                }}
                            >
                                {item.code}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 10.7 ioctl / mmap */}
            <Section id="s107" title="10.7  ioctl / mmap — 고급 디바이스 인터페이스">
                <Prose>
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">read()</code>/
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">write()</code>로
          처리하기 어려운 디바이스 제어 명령은{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">ioctl()</code>로,
          대용량 데이터 공유는{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">mmap()</code>으로 처리합니다.
                </Prose>
                <CodeBlock code={ioctlCode} language="c" filename="drivers/my_driver_ioctl.c" />
                <CodeBlock code={mmapCode} language="c" filename="mmap으로 디바이스 메모리 직접 접근" />
                <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                        {
                            title: 'ioctl',
                            items: [
                                'GPU 드라이버 렌더링 명령',
                                'V4L2 카메라 설정',
                                '네트워크 인터페이스 설정 (SIOCGIFADDR)',
                                '암호화 가속기 키 설정',
                            ],
                            color: '#8b5cf6',
                        },
                        {
                            title: 'mmap',
                            items: [
                                'GPU VRAM 직접 접근',
                                'DMA 버퍼 공유 (DMA-BUF)',
                                '비디오 캡처 zero-copy',
                                'DPDK 패킷 버퍼',
                            ],
                            color: '#3b82f6',
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-lg px-3 py-3 space-y-1.5"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold mb-2" style={{ color: item.color }}>
                                {item.title}
                            </div>
                            <ul className="space-y-1">
                                {item.items.map((text) => (
                                    <li key={text} className="text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                                        <span style={{ color: item.color }}>·</span>
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 10.8 platform_driver */}
            <Section id="s108" title="10.8  platform_driver — 임베디드 드라이버 모델">
                <Prose>
                    <T id="pci">PCI</T>, USB와 달리 ARM/임베디드 보드의 온칩 주변장치는 장치를 자동 감지할 수 없습니다.{' '}
                    <strong className="text-gray-700 dark:text-gray-300">Device Tree</strong>와{' '}
                    <strong className="text-gray-700 dark:text-gray-300">platform_driver</strong>가 이를 해결합니다.
                </Prose>
                <CodeBlock code={platformDriverCode} language="c" filename="drivers/my_platform.c" />
                <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                        {
                            title: 'probe()',
                            desc: '커널이 DT compatible 매칭 후 호출. 리소스 할당, IRQ 등록, 하드웨어 초기화',
                            color: '#22c55e',
                        },
                        {
                            title: 'remove()',
                            desc: '모듈 언로드 또는 hotplug 제거 시. devm_ 리소스는 자동 해제',
                            color: '#ef4444',
                        },
                        {
                            title: 'devm_ 패턴',
                            desc: 'devm_kzalloc, devm_ioremap, devm_request_irq — remove 시 자동 정리, 누락 방지',
                            color: '#f59e0b',
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-lg px-3 py-3"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold mb-1" style={{ color: item.color }}>
                                {item.title}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 leading-snug">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 10.9 PCI/PCIe 드라이버 모델 */}
            <Section id="s109" title="10.9  PCI/PCIe 드라이버 모델">
                <Prose>
          서버의 NIC, NVMe SSD, GPU는 모두 <T id="pci">PCIe</T> 버스로 연결됩니다.{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">pci_driver</code>는
          커널이 PCIe 디바이스를 감지하면 자동으로 드라이버를 매칭하고{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">probe()</code>를
          호출하는 표준 프레임워크입니다. platform_driver와 구조는 같지만 Device Tree 대신
          Vendor/Device ID로 매칭합니다.
                </Prose>
                <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                        {
                            title: 'Vendor/Device ID',
                            desc: 'PCI 장치의 고유 식별자. lspci -nn으로 확인. 예: 8086:10d3 (Intel 82574L NIC)',
                            color: '#3b82f6',
                        },
                        {
                            title: 'BAR (Base Address Register)',
                            desc: '디바이스의 레지스터/메모리가 매핑될 주소 공간. 최대 6개. pci_resource_start()로 접근',
                            color: '#8b5cf6',
                        },
                        {
                            title: 'MMIO',
                            desc: 'BAR로 지정된 하드웨어 레지스터를 ioremap()으로 가상 주소에 매핑 후 읽기/쓰기',
                            color: '#f59e0b',
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-lg px-3 py-3"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold mb-1" style={{ color: item.color }}>
                                {item.title}
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 leading-snug">{item.desc}</div>
                        </div>
                    ))}
                </div>
                <CodeBlock
                    code={pciDriverCode}
                    language="c"
                    filename="drivers/net/my_nic.c — PCI 드라이버"
                />
                <CodeBlock
                    code={pciCommandsCode}
                    language="bash"
                    filename="# PCIe 디바이스 확인 명령"
                />
                <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                        {
                            title: 'MSI (Message Signaled Interrupts)',
                            items: [
                                '레거시 INTx: PCI 핀 인터럽트. 공유 IRQ, 낮은 성능. PCIe에서 에뮬레이션',
                                '메모리 쓰기로 인터럽트 전달 (핀 불필요)',
                                '최대 32개 벡터 지원',
                            ],
                            color: '#22c55e',
                        },
                        {
                            title: 'MSI-X',
                            items: [
                                '최대 2048개 독립 인터럽트 벡터',
                                'NIC의 각 큐마다 별도 IRQ 할당 가능',
                                'CPU 어피니티 최적화 → 멀티코어 확장성',
                            ],
                            color: '#3b82f6',
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-lg px-3 py-3 space-y-1.5"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold mb-2" style={{ color: item.color }}>
                                {item.title}
                            </div>
                            <ul className="space-y-1">
                                {item.items.map((text) => (
                                    <li key={text} className="text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                                        <span style={{ color: item.color }}>·</span>
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 10.10 캐릭터 디바이스 전체 생명주기 */}
            <Section id="s110" title="10.10  캐릭터 디바이스 전체 생명주기 — module_init에서 module_exit까지">
                <Prose>
          캐릭터 디바이스 드라이버는 가장 단순한 리눅스 드라이버 형태입니다.
          터미널, 시리얼, 커스텀 하드웨어처럼 바이트 스트림으로 읽고 쓰는 장치를 관리하며,{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">module_init</code> →{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">cdev_init</code> →{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">device_create</code> →{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">file_operations</code>{' '}
          등록 → 유저 open/read/write/ioctl → <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">module_exit</code> 전체 흐름을 한 번에 이해할 수 있습니다.
                </Prose>

                {/* 생명주기 다이어그램 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5 text-xs font-mono space-y-3">
                    <div className="text-gray-400 dark:text-gray-500 text-[11px] uppercase tracking-widest mb-2">생명주기 플로우</div>

                    {/* module_init 블록 */}
                    <div className="rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 space-y-1.5">
                        <div className="font-bold text-amber-700 dark:text-amber-400 text-sm">module_init()</div>
                        {[
                            { fn: 'alloc_chrdev_region()', desc: 'major/minor 번호 할당' },
                            { fn: 'cdev_init(&cdev, &fops)', desc: 'file_operations 등록' },
                            { fn: 'cdev_add()', desc: '커널 cdev 목록에 등록' },
                            { fn: 'device_create()', desc: '/dev/mydev 노드 생성 (udev 트리거)' },
                        ].map((step) => (
                            <div key={step.fn} className="flex items-start gap-2 pl-4">
                                <span className="text-amber-500 dark:text-amber-400 select-none">├─</span>
                                <span className="text-amber-800 dark:text-amber-300">{step.fn}</span>
                                <span className="text-gray-400 dark:text-gray-500 ml-1">← {step.desc}</span>
                            </div>
                        ))}
                    </div>

                    {/* 유저 공간 블록 */}
                    <div className="rounded-lg border border-blue-400/40 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 space-y-1.5">
                        <div className="font-bold text-blue-700 dark:text-blue-400 text-sm">유저 공간 시스템 콜</div>
                        {[
                            { call: 'open("/dev/mydev", O_RDWR)', handler: '.open()', desc: '드라이버 open 핸들러' },
                            { call: 'read(fd, buf, n)', handler: '.read()', desc: '드라이버 read 핸들러' },
                            { call: 'ioctl(fd, CMD, arg)', handler: '.unlocked_ioctl()', desc: '드라이버 ioctl 핸들러' },
                            { call: 'close(fd)', handler: '.release()', desc: '드라이버 release 핸들러' },
                        ].map((step) => (
                            <div key={step.call} className="pl-4 space-y-0.5">
                                <div className="text-blue-800 dark:text-blue-300">{step.call}</div>
                                <div className="flex items-center gap-2 pl-4">
                                    <span className="text-blue-400 dark:text-blue-500 select-none">└─</span>
                                    <span className="text-blue-700 dark:text-blue-400">{step.handler}</span>
                                    <span className="text-gray-400 dark:text-gray-500">→ {step.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* module_exit 블록 */}
                    <div className="rounded-lg border border-rose-400/40 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 space-y-1.5">
                        <div className="font-bold text-rose-700 dark:text-rose-400 text-sm">module_exit()</div>
                        {[
                            { fn: 'device_destroy()', desc: '/dev/mydev 제거' },
                            { fn: 'cdev_del()', desc: 'cdev 목록에서 제거' },
                            { fn: 'unregister_chrdev_region()', desc: 'major/minor 반환' },
                        ].map((step) => (
                            <div key={step.fn} className="flex items-start gap-2 pl-4">
                                <span className="text-rose-500 dark:text-rose-400 select-none">├─</span>
                                <span className="text-rose-800 dark:text-rose-300">{step.fn}</span>
                                <span className="text-gray-400 dark:text-gray-500 ml-1">← {step.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <CodeBlock
                    code={chardevDriverCode}
                    language="c"
                    filename="mydev.c — 최소 캐릭터 디바이스 드라이버"
                />
                <CodeBlock
                    code={chardevCommandsCode}
                    language="bash"
                    filename="# 빌드 · 로드 · 테스트 · 제거"
                />

                {/* copy_to_user / copy_from_user 핵심 설명 */}
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    {[
                        {
                            title: 'copy_to_user(ubuf, kbuf, n)',
                            items: [
                                '커널 → 유저 안전 복사',
                                '반환값 = 못 복사한 바이트 수 (0이면 성공)',
                                '실패 시 -EFAULT 반환 필수',
                            ],
                            color: '#3b82f6',
                        },
                        {
                            title: 'copy_from_user(kbuf, ubuf, n)',
                            items: [
                                '유저 → 커널 안전 복사',
                                '페이지 폴트 안전 처리 (슬립 허용)',
                                '커널이 유저 포인터를 직접 역참조하면 안 됨 (다른 주소 공간)',
                            ],
                            color: '#f59e0b',
                        },
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="rounded-lg px-3 py-3 space-y-1.5"
                            style={{
                                background: item.color + (isDark ? '18' : '0d'),
                                border: `1px solid ${item.color}55`,
                            }}
                        >
                            <div className="font-mono font-bold mb-2" style={{ color: item.color }}>
                                {item.title}
                            </div>
                            <ul className="space-y-1">
                                {item.items.map((text) => (
                                    <li key={text} className="text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                                        <span style={{ color: item.color }}>·</span>
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Section>

            <nav className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">이전 토픽</div>
                    <a href="#/topic/09-synchronization" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        ← 09 · 동기화와 멀티코어 환경
                    </a>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">다음 토픽</div>
                    <a href="#/topic/11-debugging" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        11 · 성능 분석과 디버깅 →
                    </a>
                </div>
            </nav>
        </div>
    )
}
