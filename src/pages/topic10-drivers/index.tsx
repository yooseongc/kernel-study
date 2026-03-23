import { DriverTreeChart } from '../../components/concepts/driver/DriverTreeChart'
import { DMAViz, dmaSteps } from '../../components/concepts/driver/DMAViz'
import { KernelRef } from '../../components/ui/KernelRef'
import * as snippets from './codeSnippets'
import { AnimatedDiagram, CodeBlock, InfoBox, InfoTable, LearningCard, Prose, Section, T, TopicNavigation , useTheme , type TableRow } from '@study-ui/components'

// ─────────────────────────────────────────────────────────────────────────────
// Code snippets
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 10.X  캐릭터 디바이스 전체 생명주기
// ─────────────────────────────────────────────────────────────────────────────

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
// ─────────────────────────────────────────────────────────────────────────────
// 10.11  관련 커널 파라미터
// ─────────────────────────────────────────────────────────────────────────────
const driverKernelParamRows: TableRow[] = [
    { cells: ['kernel.modules_disabled', '0', '1이면 모듈 로드/언로드 영구 차단 (보안)'] },
    { cells: ['kernel.modprobe', '/sbin/modprobe', '자동 모듈 로드 시 사용할 유저공간 헬퍼 경로'] },
    { cells: ['kernel.tainted', '0', '커널 오염 플래그 비트마스크 (비공식 모듈 등)'] },
    { cells: ['vm.legacy_va_layout', '0', '1이면 레거시 가상 주소 레이아웃 사용'] },
    { cells: ['kernel.printk', '4 4 1 7', '콘솔 로그 레벨 (현재/기본/최소/부팅시)'] },
    { cells: ['kernel.dmesg_restrict', '0', '1이면 일반 사용자의 dmesg 접근 차단'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topic09() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">Topic 10</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">디바이스 드라이버와 커널 모듈</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Device Drivers & Kernel Modules</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    커널 모듈, 문자/블록/네트워크 드라이버, NIC+DMA, PCI/PCIe 드라이버, platform driver
                </p>
            </header>

            <LearningCard
                topicId="10-drivers"
                items={[
                    '커널 모듈의 초기화/종료 생명주기와 module_init/module_exit 매크로를 이해합니다',
                    '문자 디바이스 드라이버가 file_operations 구조체를 통해 시스템 콜과 연결되는 방법을 배웁니다',
                    'NIC 드라이버의 DMA 설정과 IRQ 등록, <T id="napi">NAPI</T> 처리 루프를 파악합니다',
                ]}
            />

            {/* 10.1 커널 모듈 */}
            <Section id="s101" title="10.1  커널 모듈">
                <Prose>
                    커널 모듈은 실행 중인 커널에 동적으로 로드/언로드 가능한 코드입니다.{' '}
                    <KernelRef path="include/linux/module.h" sym="module" /> 재부팅 없이 드라이버를
                    추가하거나 제거할 수 있으며,{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">module_init</code> /{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">module_exit</code>{' '}
                    매크로로 로드·언로드 시 실행할 함수를 등록합니다.
                </Prose>
                <CodeBlock code={snippets.helloModuleCode} language="c" filename="hello.c" />
                <InfoTable headers={['명령어', '동작']} rows={moduleCommandRows} />
            </Section>

            {/* 10.2 디바이스 드라이버 종류 */}
            <Section id="s102" title="10.2  디바이스 드라이버 종류">
                <InfoTable headers={['종류', '예시', '인터페이스', '특징']} rows={driverTypeRows} />
                <DriverTreeChart />
                <div className="grid grid-cols-3 gap-3 text-xs">
                    {[
                        {
                            label: '문자 디바이스',
                            desc: '순차적 I/O. /dev/ttyS0, /dev/random 등. open/read/write/ioctl 인터페이스.',
                            color: '#f59e0b',
                        },
                        {
                            label: '블록 디바이스',
                            desc: '랜덤 접근 + 커널 버퍼 캐시. /dev/sda, /dev/nvme0. 블록 단위 I/O.',
                            color: '#3b82f6',
                        },
                        {
                            label: '네트워크 디바이스',
                            desc: '/dev 파일 없음. net_device 구조체로 등록. 소켓 계층과 연결.',
                            color: '#22c55e',
                        },
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
                    문자 디바이스 등록 흐름 <KernelRef path="include/linux/cdev.h" sym="cdev" />
                </h3>
                <CodeBlock code={snippets.cdevRegisterCode} language="c" filename="drivers/char/my_char.c" />
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
                    고성능 NIC는 CPU를 거치지 않고 <T id="dma">DMA</T>(Direct Memory Access)로 직접 메모리에 패킷을
                    씁니다. 드라이버가 사전에 RX <T id="ring_buffer">링 버퍼</T>의 <T id="dma">DMA</T> 주소를 NIC에 알려주면, NIC는 패킷 수신 시
                    해당 주소로 데이터를 전송하고 <T id="irq">IRQ</T>를 발생시킵니다.
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
                    NIC 드라이버는 RX/TX 링 버퍼를 준비하고 NIC에 <T id="dma">DMA</T> 주소를 알려줍니다. 각
                    서술자(descriptor)에는 물리 주소와 길이, 상태 플래그가 있으며, NIC는 수신 완료 시 status 필드를
                    갱신합니다.
                </Prose>
                <CodeBlock code={snippets.rxRingCode} language="c" filename="rx_ring_init.c" />
                <div className="rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-xs text-blue-800 dark:text-blue-200">
                    <span className="font-bold text-blue-700 dark:text-blue-300">핵심:</span>{' '}
                    <span className="font-mono">dma_map_single()</span>은 가상 주소를 PCIe 버스에서 접근 가능한 물리
                    주소로 변환합니다. <T id="iommu">IOMMU</T>가 있는 환경에서는 IOMMU 매핑 테이블을 통해 DMA 격리(isolation)가
                    이루어집니다.
                </div>
            </Section>

            {/* 10.5 드라이버와 커널 서브시스템 연결 */}
            <Section id="s105" title="10.5  드라이버와 커널 서브시스템 연결">
                <Prose>
                    드라이버는 커널의 다양한 프레임워크에 콜백을 등록하는 방식으로 동작합니다. 네트워크 드라이버는{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">net_device_ops</code>{' '}
                    <KernelRef path="include/linux/netdevice.h" sym="net_device_ops" />{' '}
                    구조체에 함수 포인터를 채워 커널에 등록하며, 커널은 필요한 시점에 해당 콜백을 호출합니다.
                </Prose>
                <InfoTable headers={['콜백', '호출 시점', '동작']} rows={netdevOpsRows} />
                <CodeBlock code={snippets.netdevOpsCode} language="c" filename="my_driver.c" />
            </Section>

            {/* 10.6 모듈 파라미터와 sysfs */}
            <Section id="s106" title="10.6  모듈 파라미터와 sysfs">
                <Prose>
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">module_param()</code>{' '}
                    매크로로 로드 시 파라미터를 받을 수 있고, 권한(0644)에 따라 런타임에
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">
                        /sys/module/&lt;name&gt;/parameters/
                    </code>
                    를 통해 동적으로 변경할 수도 있습니다.
                </Prose>
                <CodeBlock code={snippets.moduleParamCode} language="c" filename="module_param.c" />
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
                    <T id="mmap">mmap()</T>으로
                    처리합니다.
                </Prose>
                <CodeBlock code={snippets.ioctlCode} language="c" filename="drivers/my_driver_ioctl.c" />
                <CodeBlock code={snippets.mmapCode} language="c" filename="mmap으로 디바이스 메모리 직접 접근" />
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
                                    <li
                                        key={text}
                                        className="text-gray-500 dark:text-gray-400 flex items-start gap-1.5"
                                    >
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
                    <T id="device_tree">Device Tree</T>와{' '}
                    <strong className="text-gray-700 dark:text-gray-300">platform_driver</strong>가 이를 해결합니다.
                </Prose>
                <CodeBlock code={snippets.platformDriverCode} language="c" filename="drivers/my_platform.c" />
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
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">pci_driver</code>{' '}
                    <KernelRef path="include/linux/pci.h" sym="pci_driver" />는
                    커널이 PCIe 디바이스를 감지하면 자동으로 드라이버를 매칭하고{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">probe()</code>를
                    호출하는 표준 프레임워크입니다. platform_driver와 구조는 같지만 Device Tree 대신 Vendor/Device ID로
                    매칭합니다.
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
                <CodeBlock code={snippets.pciDriverCode} language="c" filename="drivers/net/my_nic.c — PCI 드라이버" />
                <CodeBlock code={snippets.pciCommandsCode} language="bash" filename="# PCIe 디바이스 확인 명령" />
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
                                    <li
                                        key={text}
                                        className="text-gray-500 dark:text-gray-400 flex items-start gap-1.5"
                                    >
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
                    캐릭터 디바이스 드라이버는 가장 단순한 리눅스 드라이버 형태입니다. 터미널, 시리얼, 커스텀
                    하드웨어처럼 바이트 스트림으로 읽고 쓰는 장치를 관리하며,{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">module_init</code> →{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">cdev_init</code> →{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">device_create</code> →{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">file_operations</code>{' '}
                    등록 → 유저 open/read/write/ioctl →{' '}
                    <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">module_exit</code>{' '}
                    전체 흐름을 한 번에 이해할 수 있습니다.
                </Prose>

                {/* 생명주기 다이어그램 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-5 text-xs font-mono space-y-3">
                    <div className="text-gray-400 dark:text-gray-500 text-[11px] uppercase tracking-widest mb-2">
                        생명주기 플로우
                    </div>

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
                            {
                                call: 'ioctl(fd, CMD, arg)',
                                handler: '.unlocked_ioctl()',
                                desc: '드라이버 ioctl 핸들러',
                            },
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

                <CodeBlock code={snippets.chardevDriverCode} language="c" filename="mydev.c — 최소 캐릭터 디바이스 드라이버" />
                <CodeBlock code={snippets.chardevCommandsCode} language="bash" filename="# 빌드 · 로드 · 테스트 · 제거" />

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
                                    <li
                                        key={text}
                                        className="text-gray-500 dark:text-gray-400 flex items-start gap-1.5"
                                    >
                                        <span style={{ color: item.color }}>·</span>
                                        {text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 10.11 IOMMU */}
            <Section id="s1011" title="10.11  IOMMU와 디바이스 격리">
                <Prose>
                    <T id="iommu">IOMMU</T> <KernelRef path="drivers/iommu/" label="drivers/iommu/" />는
                    디바이스가 DMA로 접근할 수 있는 메모리 영역을 제한하는 하드웨어 유닛입니다.
                    CPU의 MMU가 가상→물리 주소를 변환하듯, IOMMU는 디바이스의 DMA 주소(IOVA)를 물리 주소로 변환합니다.
                </Prose>
                <InfoTable
                    headers={['구현', '플랫폼', '커널 드라이버']}
                    rows={[
                        { cells: ['Intel VT-d', 'x86 (Intel)', 'drivers/iommu/intel/'] },
                        { cells: ['AMD-Vi', 'x86 (AMD)', 'drivers/iommu/amd/'] },
                        { cells: ['ARM SMMU', 'ARM64', 'drivers/iommu/arm/'] },
                    ]}
                />
                <Prose>
                    IOMMU의 핵심 활용은 두 가지입니다. 첫째, <strong className="text-gray-800 dark:text-gray-200">DMA 격리</strong> —
                    잘못된 드라이버나 악의적 디바이스가 임의 메모리를 읽고 쓰는 것을 차단합니다.
                    둘째, <strong className="text-gray-800 dark:text-gray-200">VFIO 디바이스 패스스루</strong> — 가상 머신에 물리 디바이스를
                    직접 할당할 때 IOMMU가 게스트 메모리 경계를 강제하여 안전한 패스스루를 보장합니다.
                </Prose>
                <CodeBlock code={`# IOMMU 활성화 상태 확인
dmesg | grep -i iommu
# DMAR: IOMMU enabled
# DMAR: Intel(R) Virtualization Technology for Directed I/O

# IOMMU 그룹 확인 (VFIO 패스스루 단위)
find /sys/kernel/iommu_groups/ -type l | head -10
# /sys/kernel/iommu_groups/0/devices/0000:00:02.0

# 특정 디바이스의 IOMMU 그룹
readlink /sys/bus/pci/devices/0000:03:00.0/iommu_group
# ../../../kernel/iommu_groups/15

# VFIO 패스스루 설정 (GPU 등)
# 1. IOMMU 부트 파라미터
# intel_iommu=on iommu=pt  (Intel)
# amd_iommu=on iommu=pt    (AMD)

# 2. 디바이스를 vfio-pci에 바인딩
echo "10de 1b80" > /sys/bus/pci/drivers/vfio-pci/new_id
echo 0000:03:00.0 > /sys/bus/pci/devices/0000:03:00.0/driver/unbind
echo 0000:03:00.0 > /sys/bus/pci/drivers/vfio-pci/bind`} language="bash" filename="# IOMMU 설정 및 확인" />
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="drivers/iommu/iommu.c" sym="iommu_map" />
                        <KernelRef path="drivers/vfio/vfio.c" label="VFIO" />
                        <KernelRef path="include/linux/iommu.h" label="iommu.h" />
                    </div>
                </InfoBox>
            </Section>

            {/* 10.12 전력 관리 */}
            <Section id="s1012" title="10.12  전력 관리 — Runtime PM과 System Sleep">
                <Prose>
                    리눅스 커널의 전력 관리는 두 축으로 구성됩니다.{' '}
                    <strong className="text-gray-800 dark:text-gray-200">System Sleep</strong>은 시스템 전체를 절전 모드(Suspend/Hibernate)로
                    전환하고, <strong className="text-gray-800 dark:text-gray-200">Runtime PM</strong>{' '}
                    <KernelRef path="drivers/base/power/runtime.c" label="runtime.c" />은 개별 디바이스를 유휴 시 자동으로 저전력 상태로
                    전환합니다.
                </Prose>
                <InfoTable
                    headers={['메커니즘', '범위', '드라이버 콜백', '사용 예']}
                    rows={[
                        { cells: ['Runtime PM', '개별 디바이스', 'runtime_suspend / runtime_resume', 'NIC가 유휴 시 클럭 차단'] },
                        { cells: ['System Suspend', '시스템 전체', 'suspend / resume', '노트북 덮개 닫기'] },
                        { cells: ['System Hibernate', '시스템 전체', 'freeze / thaw / restore', '메모리 → 디스크 저장 후 전원 차단'] },
                    ]}
                />
                <CodeBlock code={`/* 드라이버의 Runtime PM 콜백 등록 */
static const struct dev_pm_ops my_pm_ops = {
    /* Runtime PM */
    SET_RUNTIME_PM_OPS(
        my_runtime_suspend,   /* 유휴 시 호출 */
        my_runtime_resume,    /* 다시 활성화 시 호출 */
        NULL
    )
    /* System Sleep */
    SET_SYSTEM_SLEEP_PM_OPS(
        my_suspend,           /* 시스템 절전 진입 */
        my_resume             /* 시스템 깨어남 */
    )
};

static struct platform_driver my_driver = {
    .driver = {
        .name = "my_device",
        .pm   = &my_pm_ops,
    },
    .probe  = my_probe,
    .remove = my_remove,
};

/* 프로브 함수에서 Runtime PM 활성화 */
static int my_probe(struct platform_device *pdev)
{
    /* ... 초기화 ... */
    pm_runtime_enable(&pdev->dev);
    pm_runtime_set_autosuspend_delay(&pdev->dev, 200); /* 200ms */
    pm_runtime_use_autosuspend(&pdev->dev);
    return 0;
}

/* 디바이스 사용 시 pm_runtime_get/put */
pm_runtime_get_sync(&pdev->dev);   /* 활성화 보장 */
/* ... I/O 작업 ... */
pm_runtime_put_autosuspend(&pdev->dev);  /* 유휴 타이머 시작 */`} language="c" filename="drivers/my_device.c" />
                <CodeBlock code={`# Runtime PM 상태 확인
cat /sys/devices/.../power/runtime_status
# active / suspended / suspending

# autosuspend 지연 시간 (ms)
cat /sys/devices/.../power/autosuspend_delay_ms

# Runtime PM 사용 횟수
cat /sys/devices/.../power/runtime_usage

# 시스템 절전 상태 확인
cat /sys/power/state
# freeze mem disk

# 절전 모드 진입
echo mem > /sys/power/state  # Suspend-to-RAM`} language="bash" filename="# 전력 관리 상태 확인" />
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="drivers/base/power/runtime.c" sym="pm_runtime_get_sync" />
                        <KernelRef path="include/linux/pm.h" label="pm.h" />
                        <KernelRef path="kernel/power/suspend.c" sym="suspend_enter" />
                    </div>
                </InfoBox>
            </Section>

            {/* 10.13 관련 커널 파라미터 */}
            <Section id="s1013" title="10.13  관련 커널 파라미터">
                <Prose>
                    디바이스 드라이버와 커널 모듈 관리에 영향을 미치는 주요 커널 파라미터입니다.
                    보안 강화 시 모듈 로드 제한과 dmesg 접근 제어를 함께 설정합니다.
                </Prose>
                <InfoTable headers={['파라미터', '기본값', '설명']} rows={driverKernelParamRows} />
                <CodeBlock code={snippets.driverKernelParamCode} language="bash" filename="# 드라이버/모듈 관련 파라미터 확인" />
            </Section>

            <TopicNavigation topicId="10-drivers" />
        </div>
    )
}
