// ─────────────────────────────────────────────────────────────────────────────
// Topic 10 — 디바이스 드라이버와 커널 모듈
// 코드 문자열 상수 모음 (index.tsx에서 분리)
// ─────────────────────────────────────────────────────────────────────────────

export const helloModuleCode = `/* 최소 커널 모듈 예제 */
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

export const rxRingCode = `/* RX 링 버퍼 초기화 (간략화) */
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

export const netdevOpsCode = `static const struct net_device_ops my_netdev_ops = {
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

export const cdevRegisterCode = `/* 문자 디바이스 등록 전체 흐름 */
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

export const ioctlCode = `/* ioctl 명령 번호 정의 (include/uapi/linux/my_driver.h) */
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

export const mmapCode = `/* 드라이버 mmap 핸들러 — 하드웨어 레지스터/버퍼를 유저공간에 매핑 */
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

export const platformDriverCode = `/* Device Tree 노드 (arch/arm64/boot/dts/my_board.dts) */
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

export const pciDriverCode = `#include <linux/pci.h>

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

export const pciCommandsCode = `# PCIe 디바이스 목록 (Vendor:Device ID 포함)
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

export const moduleParamCode = `/* 모듈 파라미터 */
static int debug_level = 0;
static int rx_ring_size = 256;

module_param(debug_level, int, 0644);
MODULE_PARM_DESC(debug_level, "디버그 레벨 (0=off, 1=basic, 2=verbose)");

module_param(rx_ring_size, int, 0444);
MODULE_PARM_DESC(rx_ring_size, "RX 링 버퍼 크기 (기본 256)");

/* 로드 시: insmod my_driver.ko debug_level=1 rx_ring_size=512 */
/* 런타임: echo 2 > /sys/module/my_driver/parameters/debug_level */`

export const chardevDriverCode = `/* mydev.c — 최소 캐릭터 디바이스 드라이버 */
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

export const chardevCommandsCode = `# 모듈 빌드 및 로드
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

// 10.11 관련 커널 파라미터
export const driverKernelParamCode = `# 모듈 로드 제한 확인
sysctl kernel.modules_disabled
# 0 → 모듈 로드 가능, 1 → 영구 차단

# 커널 오염 상태 확인
sysctl kernel.tainted
# 0 = 정상, 비트마스크로 오염 원인 표시

# 콘솔 로그 레벨 확인/변경
sysctl kernel.printk
# 4 4 1 7 → 현재/기본/최소/부팅시

# dmesg 접근 제한
sysctl kernel.dmesg_restrict
# 1이면 일반 사용자 dmesg 접근 차단

# modprobe 경로 확인
sysctl kernel.modprobe`
