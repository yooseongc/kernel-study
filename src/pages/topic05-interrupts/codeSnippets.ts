// ─────────────────────────────────────────────────────────────────────────────
// Topic 05 — 인터럽트, 예외, Deferred Work
// 코드 문자열 상수 모음 (index.tsx에서 분리)
// ─────────────────────────────────────────────────────────────────────────────

export const topBottomHalfCode = `/* Top Half — NIC 인터럽트 핸들러 (간략화) */
irqreturn_t e1000_intr(int irq, void *data) {
    struct e1000_adapter *adapter = data;

    /* 1. 인터럽트 ACK (장치에 신호 처리 완료 알림) */
    E1000_WRITE_REG(&adapter->hw, ICR, icr);

    /* 2. NAPI 스케줄 — rx 처리를 Bottom Half로 예약 */
    if (napi_schedule_prep(&adapter->napi))
        __napi_schedule(&adapter->napi);

    return IRQ_HANDLED;  /* Top Half 종료 */
}

/* Bottom Half — NAPI poll (softirq 컨텍스트) */
int e1000_clean(struct napi_struct *napi, int budget) {
    /* 실제 패킷 처리, netif_receive_skb() 호출 등 */
    ...
}`

export const threadedIrqCode = `/* Threaded IRQ 등록 */
ret = request_threaded_irq(
    irq,
    my_irq_handler,        /* Top Half: 빠른 확인, IRQ_WAKE_THREAD 반환 */
    my_thread_handler,     /* Bottom Half: 커널 스레드에서 실행 */
    IRQF_SHARED,
    "my_device",
    dev
);

/* Top Half — 가능한 짧게 */
static irqreturn_t my_irq_handler(int irq, void *dev_id)
{
    struct my_dev *dev = dev_id;

    /* 이 장치의 인터럽트인지 확인 */
    if (!(readl(dev->base + STATUS) & IRQ_FLAG))
        return IRQ_NONE;

    /* 하드웨어 인터럽트 clear */
    writel(IRQ_FLAG, dev->base + STATUS);

    /* 스레드 핸들러 깨우기 */
    return IRQ_WAKE_THREAD;
}

/* Thread Handler — 슬립 가능 */
static irqreturn_t my_thread_handler(int irq, void *dev_id)
{
    struct my_dev *dev = dev_id;

    /* mutex 사용 가능, 슬립 가능 */
    mutex_lock(&dev->lock);
    process_data(dev);         /* 시간이 걸려도 OK */
    mutex_unlock(&dev->lock);

    return IRQ_HANDLED;
}`

export const threadedIrqCheckCode = `# irq 스레드 목록 확인
ps aux | grep "irq/"
# 예: irq/16-ahci  irq/27-eth0  irq/29-xhci_hcd

# 스레드 우선순위 조정 (RT 우선순위 50으로)
chrt -f -p 50 $(pgrep "irq/27-eth0")

# 또는 /proc/irq/<n>/... 으로 확인
cat /proc/irq/27/actions   # eth0`

export const irqAffinityCode = `# 현재 IRQ 분포 확인
cat /proc/interrupts

# IRQ 27번을 CPU 2번에 고정 (비트마스크: 0x4 = CPU2)
echo 4 > /proc/irq/27/smp_affinity

# CPU 0,1에 IRQ 분산 허용 (비트마스크: 0x3 = CPU0+CPU1)
echo 3 > /proc/irq/27/smp_affinity

# irqbalance 데몬: 자동으로 IRQ를 코어에 분산
systemctl start irqbalance

# NIC 큐별 IRQ 어피니티 자동 설정 스크립트
set_irq_affinity.sh eth0`

export const hrtimerCode = `/* hrtimer 예제 */
struct hrtimer my_timer;

enum hrtimer_restart my_callback(struct hrtimer *timer) {
    /* 타이머 만료 시 호출 */
    do_something();

    /* 다음 만료: 지금으로부터 10ms 후 */
    hrtimer_forward_now(timer, ms_to_ktime(10));
    return HRTIMER_RESTART;  /* 반복 */
}

void setup_timer(void) {
    hrtimer_init(&my_timer, CLOCK_MONOTONIC, HRTIMER_MODE_REL);
    my_timer.function = my_callback;
    hrtimer_start(&my_timer, ms_to_ktime(10), HRTIMER_MODE_REL);
}`

export const irqCoalescingCode = `# 현재 coalescing 설정 확인
ethtool -c eth0
# Coalesce parameters for eth0:
# Adaptive RX: on  TX: on
# rx-usecs: 50    rx-frames: 0
# tx-usecs: 50    tx-frames: 0

# 저레이턴시 설정 (HFT, 실시간 게임)
ethtool -C eth0 rx-usecs 0 rx-frames 1

# 고처리량 설정 (스트리밍, 파일 전송)
ethtool -C eth0 rx-usecs 1000 rx-frames 256

# Adaptive coalescing 활성화
ethtool -C eth0 adaptive-rx on adaptive-tx on

# NAPI poll 통계 확인
cat /proc/net/softnet_stat
# 열 1: 처리된 패킷 수
# 열 2: 드롭된 패킷 수 (budget 소진)
# 열 3: throttled 횟수 (CPU 과부하)

# IRQ 분배 확인 (RPS/RFS)
cat /proc/irq/*/smp_affinity`
