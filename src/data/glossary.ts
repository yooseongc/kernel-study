export interface GlossaryTerm {
    id: string
    term: string
    aliases?: string[]
    category:
        | 'process'
        | 'memory'
        | 'network'
        | 'interrupt'
        | 'sync'
        | 'driver'
        | 'debug'
        | 'general'
        | 'fs'
        | 'security'
        | 'virt'
    definition: string
    topicRef?: string // e.g. '01-overview'
}

export const glossary: GlossaryTerm[] = [
    // ── 프로세스 / 스케줄러 ────────────────────────────────────────────────────
    {
        id: 'task_struct',
        term: 'task_struct',
        category: 'process',
        definition:
            '리눅스 커널에서 프로세스/스레드를 표현하는 핵심 데이터 구조. PID, 메모리 정보(mm_struct), 열린 파일, 스케줄링 엔티티(sched_entity) 등 모든 프로세스 정보를 담고 있습니다. include/linux/sched.h에 정의되어 있으며 수백 개의 필드를 포함합니다.',
        topicRef: '02-scheduler',
    },
    {
        id: 'cfs',
        term: 'CFS',
        aliases: ['Completely Fair Scheduler'],
        category: 'process',
        definition:
            '리눅스의 기본 CPU 스케줄러(Completely Fair Scheduler). 각 프로세스의 "가상 실행 시간(vruntime)"을 레드-블랙 트리로 관리하여, vruntime이 가장 작은 태스크를 다음에 실행합니다. O(log N) 복잡도.',
        topicRef: '02-scheduler',
    },
    {
        id: 'context_switch',
        term: '컨텍스트 스위치',
        aliases: ['Context Switch'],
        category: 'process',
        definition:
            'CPU가 한 프로세스/스레드에서 다른 것으로 전환할 때 발생하는 작업. 현재 레지스터 상태, 프로그램 카운터, 스택 포인터를 저장하고 새 태스크의 상태를 복원합니다. 비용이 높으므로 커널은 이를 최소화하려 합니다.',
        topicRef: '02-scheduler',
    },
    {
        id: 'pid',
        term: 'PID',
        aliases: ['Process ID', '프로세스 ID'],
        category: 'process',
        definition:
            '커널이 각 프로세스/스레드에 부여하는 고유 식별자. 스레드는 각자 PID를 가지지만, 같은 프로세스의 스레드는 동일한 TGID(Thread Group ID)를 공유합니다. 유저 공간에서 getpid()가 반환하는 값은 실제로 TGID입니다.',
        topicRef: '02-scheduler',
    },
    {
        id: 'kthread',
        term: 'Kernel Thread',
        aliases: ['kthread', '커널 스레드'],
        category: 'process',
        definition:
            '유저 공간 없이 커널 내부에서만 실행되는 스레드. mm_struct가 NULL이며 유저 주소 공간이 없습니다. ksoftirqd, kworker, kswapd 등이 대표적이며 ps 명령으로 [] 안에 표시됩니다.',
        topicRef: '02-scheduler',
    },
    {
        id: 'preemption',
        term: 'Preemption',
        aliases: ['선점', '선점 스케줄링'],
        category: 'process',
        definition:
            '실행 중인 태스크를 강제로 중단하고 다른 태스크를 실행하는 것. 리눅스는 CONFIG_PREEMPT 설정에 따라 커널 코드 실행 중에도 선점이 가능합니다(Fully Preemptible Kernel). 실시간 시스템에서 특히 중요합니다.',
        topicRef: '02-scheduler',
    },
    {
        id: 'sched_deadline',
        term: 'SCHED_DEADLINE',
        aliases: ['EDF', 'CBS'],
        category: 'process',
        definition:
            '리눅스의 실시간 스케줄링 정책 중 하나. EDF(Earliest Deadline First) 알고리즘으로 마감 시간이 가장 가까운 태스크를 우선 실행합니다. CBS(Constant Bandwidth Server)로 대역폭을 보장하면서 일반 태스크 아사(starvation)를 방지합니다. sched_setattr()로 runtime/deadline/period를 설정합니다.',
        topicRef: '02-scheduler',
    },

    // ── 메모리 관리 ──────────────────────────────────────────────────────────
    {
        id: 'mm_struct',
        term: 'mm_struct',
        category: 'memory',
        definition:
            '프로세스의 가상 주소 공간을 기술하는 구조체. 페이지 테이블 포인터, VMA 목록, 코드/데이터/스택 영역의 주소 범위 등을 담고 있습니다. 커널 스레드는 mm_struct가 NULL입니다.',
        topicRef: '03-memory',
    },
    {
        id: 'vma',
        term: 'VMA',
        aliases: ['vm_area_struct', 'Virtual Memory Area'],
        category: 'memory',
        definition:
            '가상 메모리 영역(Virtual Memory Area). 프로세스의 가상 주소 공간을 연속된 영역으로 나눈 단위. 각 VMA는 시작/끝 주소, 보호 속성(읽기/쓰기/실행), 파일 매핑 여부 등을 갖습니다. mm_struct 내에 레드-블랙 트리로 관리됩니다.',
        topicRef: '03-memory',
    },
    {
        id: 'page_fault',
        term: 'Page Fault',
        aliases: ['페이지 폴트'],
        category: 'memory',
        definition:
            'CPU가 매핑되지 않았거나 접근 권한이 없는 가상 주소에 접근할 때 발생하는 예외. 커널의 페이지 폴트 핸들러가 물리 페이지를 할당하거나(요청 페이징), 스왑에서 복원하거나, SIGSEGV를 보냅니다.',
        topicRef: '03-memory',
    },
    {
        id: 'buddy_allocator',
        term: 'Buddy Allocator',
        aliases: ['버디 할당자'],
        category: 'memory',
        definition:
            '리눅스 커널의 물리 페이지 할당 시스템. 2의 거듭제곱 크기 블록으로 메모리를 관리합니다. 블록을 절반씩 분할(split)하여 요청 크기에 맞추고, 해제 시 인접한 "버디" 블록과 합병(merge)하여 단편화를 방지합니다.',
        topicRef: '03-memory',
    },
    {
        id: 'slub',
        term: 'SLUB Allocator',
        aliases: ['Slab Allocator', 'SLAB', 'SLUB'],
        category: 'memory',
        definition:
            '커널 오브젝트(task_struct, sk_buff 등)를 빠르게 할당/해제하는 캐시 기반 메모리 할당자. 동일한 크기의 오브젝트를 슬랩(slab)이라는 페이지 집합에 미리 초기화해 두어 malloc보다 훨씬 빠릅니다. 현재 리눅스 기본은 SLUB.',
        topicRef: '03-memory',
    },
    {
        id: 'tlb',
        term: 'TLB',
        aliases: ['Translation Lookaside Buffer'],
        category: 'memory',
        definition:
            '가상→물리 주소 변환 결과를 캐싱하는 CPU 내부 캐시. 페이지 테이블 워크는 비용이 높으므로, TLB가 최근 변환을 저장하여 대부분의 접근에서 즉시 물리 주소를 얻습니다. 컨텍스트 스위치 시 TLB flush가 발생합니다.',
        topicRef: '03-memory',
    },
    {
        id: 'hugepage',
        term: 'HugePage',
        aliases: ['Huge Page', 'THP', '거대 페이지'],
        category: 'memory',
        definition:
            '기본 4KB 대신 2MB(또는 1GB) 크기의 페이지. 대용량 메모리를 다루는 애플리케이션에서 TLB 미스를 줄여 성능을 향상시킵니다. Transparent Huge Pages(THP)는 커널이 자동으로 합쳐주는 기능입니다.',
        topicRef: '03-memory',
    },
    {
        id: 'mmap',
        term: 'mmap()',
        aliases: ['Memory Map'],
        category: 'memory',
        definition:
            '파일이나 디바이스를 프로세스의 가상 주소 공간에 직접 매핑하는 시스템 콜. 파일 읽기를 포인터 역참조처럼 할 수 있으며, 프로세스 간 공유 메모리 구현에도 사용됩니다. 매핑된 영역은 VMA로 관리됩니다.',
        topicRef: '03-memory',
    },
    {
        id: 'oom_killer',
        term: 'OOM Killer',
        aliases: ['Out-Of-Memory Killer'],
        category: 'memory',
        definition:
            '시스템 메모리가 완전히 부족할 때 커널이 희생 프로세스를 선택해 강제 종료하는 메커니즘. OOM score를 기반으로 메모리를 가장 많이 사용하면서 중요도가 낮은 프로세스를 선택합니다. /proc/[pid]/oom_score에서 점수 확인 가능.',
        topicRef: '03-memory',
    },
    {
        id: 'kswapd',
        term: 'kswapd',
        aliases: ['kswapd0'],
        category: 'memory',
        definition:
            '백그라운드에서 메모리를 회수(reclaim)하는 커널 스레드. LRU(Least Recently Used) 리스트에서 오래된 페이지를 스왑 또는 해제합니다. 사용 가능한 메모리가 low watermark 아래로 떨어지면 활성화됩니다.',
        topicRef: '03-memory',
    },
    {
        id: 'vmalloc',
        term: 'vmalloc',
        aliases: ['vmalloc()'],
        category: 'memory',
        definition:
            '물리적으로 불연속하지만 가상 주소 공간에서는 연속적인 메모리를 할당하는 커널 함수. kmalloc()은 물리 연속 메모리를 할당하며 DMA에 적합합니다. vmalloc()은 대용량 커널 모듈 로딩 등에 사용되지만 페이지 테이블 설정 오버헤드가 있습니다.',
        topicRef: '03-memory',
    },
    {
        id: 'numa',
        term: 'NUMA',
        aliases: ['Non-Uniform Memory Access'],
        category: 'memory',
        definition:
            '멀티소켓 서버에서 각 CPU 소켓이 로컬 메모리를 가지는 아키텍처. 로컬 메모리 접근은 빠르고 원격 메모리 접근은 느립니다. 커널 메모리 할당자는 NUMA 토폴로지를 인식하여 로컬 노드의 메모리를 우선 할당합니다.',
        topicRef: '03-memory',
    },

    // ── 파일시스템 / VFS ──────────────────────────────────────────────────────
    {
        id: 'cow',
        term: 'CoW',
        aliases: ['Copy-on-Write', '쓰기 시 복사'],
        category: 'memory',
        definition:
            '쓰기 시 복사(Copy-on-Write). fork() 후 부모·자식 프로세스가 동일한 물리 페이지를 읽기 전용으로 공유하다가, 어느 한쪽이 쓰려 할 때 Page Fault가 발생하여 해당 페이지를 복사하는 기법. 불필요한 복사를 줄여 fork() 성능을 향상시킵니다.',
        topicRef: '03-memory',
    },
    {
        id: 'vfs',
        term: 'VFS',
        aliases: ['Virtual File System', '가상 파일 시스템'],
        category: 'fs',
        definition:
            '다양한 파일 시스템(ext4, XFS, tmpfs 등)을 동일한 인터페이스로 다룰 수 있게 하는 커널 추상화 계층. open(), read(), write() 같은 시스템 콜은 VFS를 거쳐 실제 파일 시스템 구현으로 디스패치됩니다.',
        topicRef: '04-filesystem',
    },
    {
        id: 'inode',
        term: 'inode',
        aliases: ['인덱스 노드'],
        category: 'fs',
        definition:
            '파일의 메타데이터(크기, 권한, 타임스탬프, 블록 위치)를 저장하는 디스크 자료 구조. 파일 이름은 inode에 없고 dentry에 있습니다. 커널은 자주 접근하는 inode를 inode cache에 유지합니다.',
        topicRef: '04-filesystem',
    },
    {
        id: 'dentry',
        term: 'dentry',
        aliases: ['Directory Entry', '디렉토리 항목'],
        category: 'fs',
        definition:
            '파일 이름과 inode를 연결하는 커널 자료 구조. 경로 탐색 결과를 dcache(dentry cache)에 캐싱하여 반복적인 경로 해석 비용을 줄입니다. /etc/passwd의 "passwd" 이름이 dentry, 파일 내용 위치가 inode입니다.',
        topicRef: '04-filesystem',
    },
    {
        id: 'page_cache',
        term: 'Page Cache',
        aliases: ['페이지 캐시', 'Buffer Cache'],
        category: 'fs',
        definition:
            '파일 I/O를 가속하기 위해 커널이 디스크 데이터를 메모리에 유지하는 캐시. read() 시 디스크 대신 페이지 캐시에서 즉시 반환합니다. write() 시 더티 페이지로 표시 후 writeback 스레드가 비동기로 디스크에 씁니다.',
        topicRef: '04-filesystem',
    },
    {
        id: 'write_back',
        term: 'Write-back',
        aliases: ['Writeback', 'dirty page', '더티 페이지'],
        category: 'fs',
        definition:
            '쓰기 요청을 즉시 디스크에 반영하지 않고, 페이지 캐시에 "더티(dirty)" 상태로 표시한 후 나중에 일괄 기록하는 I/O 전략. dirty_expire_centisecs(기본 30초) 이후 또는 dirty 비율이 임계치를 초과하면 writeback 스레드(bdi-default/flush)가 디스크에 씁니다. 쓰기 성능이 높지만 전원 차단 시 데이터 손실 위험이 있습니다.',
        topicRef: '04-filesystem',
    },
    {
        id: 'overlayfs',
        term: 'OverlayFS',
        aliases: ['overlay', 'overlay2'],
        category: 'fs',
        definition:
            '두 디렉토리(lower RO + upper RW)를 겹쳐 merged 뷰를 만드는 유니온 파일 시스템. Docker/Podman이 컨테이너 이미지 레이어링에 사용합니다. lower 레이어는 읽기 전용 이미지이고 upper는 컨테이너 수정 사항을 담습니다. 첫 쓰기 시 lower 파일을 upper로 복사(copy-up)한 후 수정합니다.',
        topicRef: '04-filesystem',
    },
    {
        id: 'bio',
        term: 'bio',
        aliases: ['Block I/O', 'struct bio'],
        category: 'fs',
        definition:
            '블록 레이어의 I/O 요청 기본 단위. 여러 물리 페이지(scatter-gather)를 담을 수 있으며 submit_bio()로 블록 레이어에 전달됩니다. 파일시스템은 bio를 생성해 I/O 스케줄러를 거쳐 드라이버로 전달합니다.',
        topicRef: '04-filesystem',
    },

    // ── 인터럽트 / 비동기 ─────────────────────────────────────────────────────
    {
        id: 'irq_coalescing',
        term: 'IRQ Coalescing',
        aliases: ['인터럽트 병합', 'ethtool -C', 'rx-usecs'],
        category: 'interrupt',
        definition:
            'NIC이 패킷 수신마다 인터럽트를 발생시키는 대신, 일정 시간(rx-usecs) 또는 패킷 수(rx-frames)만큼 묶어 하나의 인터럽트로 처리하는 기법. 고속 트래픽 환경에서 인터럽트 처리 오버헤드를 줄입니다. ethtool -C eth0으로 파라미터를 조정하며, NAPI와 함께 작동합니다.',
        topicRef: '05-interrupts',
    },
    {
        id: 'irq',
        term: 'IRQ',
        aliases: ['Interrupt Request', '인터럽트'],
        category: 'interrupt',
        definition:
            '하드웨어 디바이스가 CPU에 보내는 비동기 신호. NIC, 키보드, 타이머 등이 IRQ를 발생시켜 커널의 인터럽트 핸들러(ISR)를 실행시킵니다. 각 IRQ는 번호가 있으며 /proc/interrupts에서 확인 가능합니다.',
        topicRef: '05-interrupts',
    },
    {
        id: 'softirq',
        term: 'Softirq',
        aliases: ['소프트 인터럽트'],
        category: 'interrupt',
        definition:
            '인터럽트 핸들러의 지연 처리 메커니즘 중 하나. 하드웨어 인터럽트(Top Half)에서는 최소한의 작업만 하고, 나머지를 Softirq(Bottom Half)로 미룹니다. CPU마다 독립적으로 실행되며 재진입이 허용됩니다. 네트워크 수신(NET_RX_SOFTIRQ) 등이 대표적.',
        topicRef: '05-interrupts',
    },
    {
        id: 'tasklet',
        term: 'Tasklet',
        aliases: ['태스크렛'],
        category: 'interrupt',
        definition:
            'Softirq 위에 구현된 하단부 처리 단위. 동일한 Tasklet은 동시에 하나의 CPU에서만 실행됩니다. Softirq보다 사용이 간편하지만 현재는 Workqueue 또는 Threaded IRQ 사용이 권장됩니다.',
        topicRef: '05-interrupts',
    },
    {
        id: 'workqueue',
        term: 'Workqueue',
        aliases: ['워크큐'],
        category: 'interrupt',
        definition:
            '인터럽트 하단부(Bottom Half) 처리를 커널 스레드에서 실행하는 메커니즘. Softirq/Tasklet과 달리 슬립이 가능하고 프로세스 컨텍스트에서 실행되므로 긴 작업에 적합합니다.',
        topicRef: '05-interrupts',
    },
    {
        id: 'threaded_irq',
        term: 'Threaded IRQ',
        aliases: ['request_threaded_irq'],
        category: 'interrupt',
        definition:
            '인터럽트 핸들러를 커널 스레드로 분리하는 방식. Top Half는 최소 작업만 하고 나머지를 kthread에서 처리합니다. 실시간 커널(PREEMPT_RT)에서 인터럽트 지연을 줄이는 데 핵심적입니다.',
        topicRef: '05-interrupts',
    },

    // ── 네트워크 ─────────────────────────────────────────────────────────────
    {
        id: 'sk_buff',
        term: 'sk_buff',
        aliases: ['Socket Buffer', 'skb'],
        category: 'network',
        definition:
            '리눅스 네트워크 스택의 핵심 데이터 구조. 네트워크 패킷과 관련 메타데이터(프로토콜, 인터페이스, 타임스탬프 등)를 담는 범용 버퍼. NIC 수신부터 소켓 레이어까지 전 계층에 걸쳐 동일한 sk_buff를 공유하며 헤더 포인터만 조정합니다.',
        topicRef: '06-network-stack',
    },
    {
        id: 'napi',
        term: 'NAPI',
        aliases: ['New API'],
        category: 'network',
        definition:
            '리눅스 네트워크 드라이버의 패킷 수신 방식. 인터럽트 기반 수신 대신 일정 기간 폴링(polling)하여 고속 환경에서 인터럽트 폭풍을 방지합니다. 트래픽이 많을 때 폴링으로, 적을 때 인터럽트로 자동 전환됩니다.',
        topicRef: '06-network-stack',
    },
    {
        id: 'zero_copy',
        term: 'Zero-copy',
        aliases: ['sendfile()', 'splice()'],
        category: 'network',
        definition:
            '유저 공간 버퍼를 거치지 않고 커널에서 직접 데이터를 전송하는 기법. sendfile()은 파일 → 소켓을 페이지 캐시에서 직접 전달합니다. CPU 복사 횟수를 줄여 Nginx 같은 정적 파일 서버의 처리량을 크게 향상시킵니다.',
        topicRef: '06-network-stack',
    },
    {
        id: 'cubic',
        term: 'TCP CUBIC',
        aliases: ['CUBIC', 'BBR', 'Bottleneck Bandwidth and RTT'],
        category: 'network',
        definition:
            'Linux 기본 TCP 혼잡 제어 알고리즘. 패킷 손실을 기반으로 혼잡 윈도우를 3차 함수(cubic)로 증가시켜 빠른 회복과 높은 처리량을 달성합니다. Google이 개발한 BBR(Bottleneck Bandwidth and RTT)은 손실 대신 대역폭·RTT 측정을 기반으로 하여 높은 BDP 경로에서 CUBIC 대비 처리량이 뛰어납니다.',
        topicRef: '06-network-stack',
    },
    {
        id: 'io_uring',
        term: 'io_uring',
        category: 'network',
        definition:
            'Linux 5.1에서 도입된 비동기 I/O 인터페이스. SQ(제출 큐)와 CQ(완료 큐) 링 버퍼를 유저-커널이 공유해 syscall 없이 I/O를 처리합니다. epoll 대비 시스템 콜 오버헤드가 없어 고성능 서버에서 주목받고 있습니다.',
        topicRef: '06-network-stack',
    },
    {
        id: 'netfilter',
        term: 'Netfilter',
        category: 'network',
        definition:
            '리눅스 커널의 패킷 필터링 프레임워크. 네트워크 스택의 5개 지점(훅)에서 패킷을 가로채 필터링, NAT, 로깅 등을 수행합니다. iptables와 nftables가 Netfilter 위에서 동작합니다.',
        topicRef: '07-netfilter',
    },
    {
        id: 'iptables',
        term: 'iptables',
        aliases: ['nftables'],
        category: 'network',
        definition:
            'Netfilter 훅에 규칙을 등록하는 유저 공간 도구. PREROUTING, INPUT, FORWARD, OUTPUT, POSTROUTING 체인에 필터링·NAT·MARK 규칙을 적용합니다. nftables는 iptables의 후속 도구로 더 유연한 문법을 제공합니다.',
        topicRef: '07-netfilter',
    },
    {
        id: 'conntrack',
        term: 'conntrack',
        aliases: ['nf_conntrack', 'Connection Tracking'],
        category: 'network',
        definition:
            '커널이 네트워크 연결 상태(NEW, ESTABLISHED, RELATED, INVALID)를 추적하는 Netfilter 서브시스템. Stateful 방화벽과 NAT의 기반입니다. /proc/net/nf_conntrack에서 현재 연결 테이블을 확인할 수 있습니다.',
        topicRef: '07-netfilter',
    },
    {
        id: 'ebpf',
        term: 'eBPF',
        aliases: ['Extended BPF', 'BPF'],
        category: 'network',
        definition:
            '커널을 재컴파일 없이 확장할 수 있는 프로그래밍 모델. 사용자가 작성한 eBPF 프로그램을 커널 검증기(verifier)가 안전성을 확인 후 JIT 컴파일하여 커널 내 특정 훅 포인트에서 실행합니다. 고성능 네트워킹, 관찰가능성, 보안에 활용됩니다.',
        topicRef: '08-xdp-ebpf',
    },
    {
        id: 'xdp',
        term: 'XDP',
        aliases: ['eXpress Data Path'],
        category: 'network',
        definition:
            '드라이버 레벨에서 패킷을 처리하는 고성능 eBPF 실행 환경. 커널 네트워크 스택을 거치기 전에 패킷을 처리하므로 극도로 낮은 지연시간을 달성합니다. XDP_DROP, XDP_PASS, XDP_TX, XDP_REDIRECT 액션을 반환합니다.',
        topicRef: '08-xdp-ebpf',
    },

    // ── 동기화 ───────────────────────────────────────────────────────────────
    {
        id: 'grace_period',
        term: 'Grace Period',
        aliases: ['RCU grace period', '유예 기간'],
        category: 'sync',
        definition:
            'RCU에서 기존 포인터를 사용하는 모든 읽기 크리티컬 섹션이 종료될 때까지 기다리는 기간. 쓰기 측은 데이터를 복사·수정하고 포인터를 교체한 뒤 grace period가 끝날 때까지 구 버전을 해제하지 않습니다. synchronize_rcu()로 대기하거나 call_rcu()로 콜백을 등록합니다.',
        topicRef: '09-synchronization',
    },
    {
        id: 'spinlock',
        term: 'Spinlock',
        aliases: ['스핀락'],
        category: 'sync',
        definition:
            '공유 자원 보호를 위한 락 메커니즘. 락을 획득할 수 없을 때 CPU를 양보하지 않고 계속 루프(spin)하며 대기합니다. 대기 시간이 매우 짧은 경우에 효율적이며, 인터럽트 컨텍스트에서도 사용 가능합니다.',
        topicRef: '09-synchronization',
    },
    {
        id: 'mutex',
        term: 'Mutex',
        aliases: ['뮤텍스'],
        category: 'sync',
        definition:
            'Mutual Exclusion Lock. 락을 획득할 수 없을 때 스케줄러에 CPU를 양보하고 슬립합니다. Spinlock과 달리 슬립이 가능하므로 프로세스 컨텍스트에서만 사용 가능합니다. 대기 시간이 길 때 CPU 자원을 낭비하지 않습니다.',
        topicRef: '09-synchronization',
    },
    {
        id: 'rcu',
        term: 'RCU',
        aliases: ['Read-Copy-Update'],
        category: 'sync',
        definition:
            '읽기가 쓰기보다 월등히 많은 상황에 최적화된 동기화 메커니즘. 읽기는 완전히 락 없이(lock-free) 수행됩니다. 쓰기 시에는 데이터를 복사해 수정하고, 모든 읽기가 완료된 후(grace period) 포인터를 교체합니다.',
        topicRef: '09-synchronization',
    },
    {
        id: 'atomic',
        term: 'Atomic Operation',
        aliases: ['원자적 연산'],
        category: 'sync',
        definition:
            '분할되지 않고 단일 연산으로 완료되는 작업. CPU의 LOCK 접두사 명령(x86)을 이용하여 읽기-수정-쓰기를 원자적으로 수행합니다. 락 없이도 간단한 카운터 등을 스레드 안전하게 다룰 수 있습니다.',
        topicRef: '09-synchronization',
    },
    {
        id: 'wait_queue',
        term: 'Wait Queue',
        aliases: ['대기 큐', 'wait_event_interruptible'],
        category: 'sync',
        definition:
            '조건이 충족될 때까지 프로세스를 슬립시키는 커널 메커니즘. wait_event_interruptible()로 대기하고, wake_up()으로 깨웁니다. 드라이버·소켓·파이프 등 비동기 I/O 완료 대기에 광범위하게 사용됩니다.',
        topicRef: '09-synchronization',
    },
    {
        id: 'completion',
        term: 'Completion',
        aliases: ['init_completion', 'wait_for_completion'],
        category: 'sync',
        definition:
            '한 스레드가 특정 이벤트 완료를 다른 스레드에게 알리는 단방향 동기화 메커니즘. init_completion()으로 초기화하고, wait_for_completion()으로 대기하며, complete()로 완료를 알립니다. Wait Queue의 특수한 형태입니다.',
        topicRef: '09-synchronization',
    },
    {
        id: 'seqlock',
        term: 'seqlock',
        aliases: ['Sequential Lock'],
        category: 'sync',
        definition:
            '읽기-쓰기 비대칭 락. 쓰기 시 시퀀스 카운터를 홀수로 올리고 완료 후 짝수로 올립니다. 읽기 측은 카운터가 짝수이고 읽기 전후 카운터가 같으면 성공 — 카운터 불일치 시 재시도합니다. jiffies 등 빠른 카운터에 사용됩니다.',
        topicRef: '09-synchronization',
    },

    // ── 드라이버 ─────────────────────────────────────────────────────────────
    {
        id: 'dma',
        term: 'DMA',
        aliases: ['Direct Memory Access'],
        category: 'driver',
        definition:
            'CPU 개입 없이 디바이스와 메모리 사이에 데이터를 직접 전송하는 기술. NIC이 수신 패킷을 CPU를 거치지 않고 직접 RAM에 기록하는 방식이 대표적입니다. DMA 완료 후 인터럽트로 CPU에 알립니다.',
        topicRef: '10-drivers',
    },
    {
        id: 'pci',
        term: 'PCI / PCIe',
        aliases: ['Peripheral Component Interconnect', 'PCIe', 'PCI Express'],
        category: 'driver',
        definition:
            '컴퓨터 버스 표준. PCIe는 직렬 레인 기반으로 NIC, GPU, NVMe SSD 등이 연결됩니다. 커널의 pci_driver 구조체로 드라이버를 등록하고, BAR(Base Address Register)로 디바이스 메모리를 매핑합니다.',
        topicRef: '10-drivers',
    },

    // ── 디버깅 / 성능 ─────────────────────────────────────────────────────────
    {
        id: 'bpftrace',
        term: 'bpftrace',
        category: 'debug',
        definition:
            '고급 eBPF 추적 언어 및 도구. kprobe, uprobe, tracepoint, USDT 등 다양한 프로브에 짧은 스크립트를 붙여 커널·애플리케이션 동작을 실시간으로 관찰합니다. DTrace/awk와 유사한 문법으로 복잡한 분석을 한 줄 명령(one-liner)으로 표현할 수 있습니다.',
        topicRef: '08-xdp-ebpf',
    },
    {
        id: 'flame_graph',
        term: 'Flame Graph',
        aliases: ['플레임 그래프', '불꽃 그래프'],
        category: 'debug',
        definition:
            '프로파일링 스택 트레이스를 시각화하는 도구. X축은 샘플 비율(CPU 점유율), Y축은 콜 스택 깊이를 나타냅니다. perf record → perf script → stackcollapse-perf.pl → flamegraph.pl 파이프라인으로 생성합니다. 병목 함수를 직관적으로 파악할 수 있습니다.',
        topicRef: '11-debugging',
    },
    {
        id: 'ftrace',
        term: 'ftrace',
        aliases: ['Function Tracer'],
        category: 'debug',
        definition:
            '리눅스 커널 함수 추적 도구. /sys/kernel/debug/tracing/을 통해 제어하며, 특정 함수 호출 경로, 지연 시간, 인터럽트 비활성화 구간 등을 추적할 수 있습니다. 오버헤드가 낮아 프로덕션 환경에서도 사용 가능합니다.',
        topicRef: '11-debugging',
    },
    {
        id: 'perf',
        term: 'perf',
        category: 'debug',
        definition:
            '리눅스 성능 분석 도구. CPU 사이클, 캐시 미스, 페이지 폴트 등 하드웨어 성능 카운터를 이용한 프로파일링을 제공합니다. perf stat, perf record, perf report, perf top 등의 서브커맨드가 있습니다.',
        topicRef: '11-debugging',
    },
    {
        id: 'kprobe',
        term: 'kprobe / uprobe',
        category: 'debug',
        definition:
            '실행 중인 커널(kprobe) 또는 유저 프로그램(uprobe) 함수에 동적으로 중단점을 삽입하는 메커니즘. 재컴파일 없이 커널 내부 동작을 관찰할 수 있으며, eBPF 프로그램의 attach 포인트로도 자주 사용됩니다.',
        topicRef: '11-debugging',
    },
    {
        id: 'proc',
        term: '/proc 파일 시스템',
        aliases: ['procfs'],
        category: 'debug',
        definition:
            '커널 정보를 파일 형태로 노출하는 가상 파일 시스템. /proc/[pid]/maps(메모리 맵), /proc/net/tcp(TCP 연결), /proc/interrupts(IRQ 통계) 등을 통해 실행 중인 커널의 내부 상태를 읽고 쓸 수 있습니다.',
        topicRef: '11-debugging',
    },
    {
        id: 'lockdep',
        term: 'lockdep',
        aliases: ['Lock Dependency Validator'],
        category: 'debug',
        definition:
            '커널 잠금 획득 순서를 추적하여 데드락 가능성을 런타임에 감지하는 도구. CONFIG_LOCKDEP 활성화 시 잠금 획득/해제 시 호출 스택을 기록하고 순환 의존성을 발견하면 경고를 출력합니다.',
        topicRef: '11-debugging',
    },
    {
        id: 'kasan',
        term: 'KASAN',
        aliases: ['Kernel Address Sanitizer'],
        category: 'debug',
        definition:
            '커널 메모리 오류(use-after-free, out-of-bounds)를 런타임에 탐지하는 도구. 할당된 메모리 영역 주변에 shadow byte를 배치하여 경계 위반을 감지합니다. CONFIG_KASAN으로 활성화하며 주로 개발·테스트 환경에서 사용합니다.',
        topicRef: '11-debugging',
    },

    // ── 보안 ─────────────────────────────────────────────────────────────────
    {
        id: 'capability',
        term: 'Linux Capabilities',
        aliases: ['capabilities', 'CAP_NET_BIND_SERVICE'],
        category: 'security',
        definition:
            '전통적인 root 전권 권한을 37개 단위로 세분화한 권한 모델. CAP_NET_BIND_SERVICE(1024 이하 포트 바인딩), CAP_SYS_PTRACE(ptrace), CAP_NET_ADMIN(네트워크 설정) 등. 컨테이너 환경에서 불필요한 권한을 --cap-drop으로 제거합니다.',
        topicRef: '12-security',
    },
    {
        id: 'lsm',
        term: 'LSM',
        aliases: ['Linux Security Module'],
        category: 'security',
        definition:
            '커널 보안 결정 지점에 훅을 제공하는 프레임워크. SELinux, AppArmor, Smack 등이 LSM 위에 구현됩니다. 파일 생성, 소켓 연결, 프로그램 실행 등의 지점에서 정책을 검사하며 하나라도 거부하면 -EACCES가 반환됩니다.',
        topicRef: '12-security',
    },
    {
        id: 'apparmor',
        term: 'AppArmor',
        category: 'security',
        definition:
            'LSM 프레임워크 기반의 MAC(강제 접근 제어) 구현. 프로그램 경로를 기준으로 접근 가능한 파일/네트워크를 프로파일로 정의합니다. Ubuntu/Debian 계열의 기본 LSM이며 Docker 컨테이너 기본 보안 프로파일로도 사용됩니다.',
        topicRef: '12-security',
    },
    {
        id: 'selinux',
        term: 'SELinux',
        aliases: ['Security-Enhanced Linux'],
        category: 'security',
        definition:
            'NSA가 개발한 레이블 기반 MAC 시스템. 모든 파일·프로세스·소켓에 보안 컨텍스트(레이블)를 부여하고 정책 데이터베이스로 레이블 간 접근을 제어합니다. RHEL/CentOS/Fedora 계열의 기본 LSM입니다.',
        topicRef: '12-security',
    },
    {
        id: 'linux_namespace',
        term: 'Linux Namespace',
        aliases: ['namespace', 'user namespace', 'mount namespace'],
        category: 'security',
        definition:
            '프로세스 그룹이 독립된 시스템 뷰(PID 공간, 네트워크 스택, 파일시스템, UID 등)를 갖도록 격리하는 커널 기능. Docker·K8s 컨테이너 격리의 기반입니다. user namespace는 UID 매핑으로 rootless 컨테이너를 가능하게 합니다.',
        topicRef: '12-security',
    },
    {
        id: 'pid_namespace',
        term: 'PID Namespace',
        aliases: ['pid ns', 'CLONE_NEWPID'],
        category: 'security',
        definition:
            '프로세스 ID 공간을 격리하는 네임스페이스. 각 PID 네임스페이스에서 PID 1부터 독립적으로 할당됩니다. 컨테이너 내부에서 PID 1은 init 역할을 하며 SIGKILL 수신 시 컨테이너가 종료됩니다. /proc/[pid]/status의 NSpid 필드로 네임스페이스별 PID를 확인할 수 있습니다.',
        topicRef: '12-security',
    },
    {
        id: 'seccomp',
        term: 'seccomp-BPF',
        aliases: ['seccomp', 'Secure Computing'],
        category: 'security',
        definition:
            '프로세스가 호출할 수 있는 시스템 콜을 BPF 필터로 제한하는 보안 기능. Docker는 기본 프로파일에서 44개 위험한 syscall을 차단합니다. Kubernetes Pod에서도 seccompProfile로 적용 가능합니다.',
        topicRef: '12-security',
    },

    // ── 가상화 ───────────────────────────────────────────────────────────────
    {
        id: 'kvm',
        term: 'KVM',
        aliases: ['Kernel-based Virtual Machine'],
        category: 'virt',
        definition:
            'Linux 커널에 내장된 하이퍼바이저. kvm.ko, kvm_intel.ko(또는 kvm_amd.ko) 모듈로 구성됩니다. /dev/kvm ioctl API를 통해 QEMU가 VM·vCPU를 생성·제어합니다. Intel VT-x / AMD-V 하드웨어 지원을 활용합니다.',
        topicRef: '13-kvm',
    },
    {
        id: 'vmcs',
        term: 'VMCS',
        aliases: ['Virtual Machine Control Structure', 'VMCB'],
        category: 'virt',
        definition:
            'Intel VT-x가 VMENTRY·VMEXIT 시 참조하는 4KB 자료 구조(AMD는 VMCB). 게스트 CPU 상태, 호스트 복귀 상태, VM 실행 정책(어떤 명령이 VMEXIT를 유발할지)을 모두 담고 있습니다.',
        topicRef: '13-kvm',
    },
    {
        id: 'vmexit',
        term: 'VMEXIT',
        aliases: ['VMENTRY', 'VM Exit'],
        category: 'virt',
        definition:
            '게스트 VM에서 특권 명령 실행, I/O 접근, 인터럽트 발생 등으로 하이퍼바이저로 제어가 넘어오는 이벤트. VMENTRY는 반대로 하이퍼바이저에서 게스트 코드로 진입하는 것. VMEXIT가 많을수록 가상화 오버헤드가 증가합니다.',
        topicRef: '13-kvm',
    },
    {
        id: 'ept',
        term: 'EPT',
        aliases: ['Extended Page Tables', 'NPT', 'Nested Paging'],
        category: 'virt',
        definition:
            '게스트 물리 주소 → 호스트 물리 주소 변환을 하드웨어가 처리하는 중첩 페이지 테이블. 소프트웨어 기반 Shadow Page Table 대비 VMEXIT 횟수를 크게 줄입니다. AMD의 동등 기능은 NPT(Nested Page Tables)입니다.',
        topicRef: '13-kvm',
    },
    {
        id: 'virtio',
        term: 'virtio',
        aliases: ['virtqueue'],
        category: 'virt',
        definition:
            '게스트-호스트 간 공유 메모리 링 버퍼(virtqueue)로 I/O를 전달하는 반가상화 표준. virtio-net(네트워크), virtio-blk(디스크), virtio-fs(파일시스템) 등이 있습니다. 게스트 드라이버(frontend)와 호스트 백엔드(backend)가 virtqueue를 통해 디스크립터를 교환합니다.',
        topicRef: '13-kvm',
    },
    {
        id: 'vhost',
        term: 'vhost / vhost-user',
        aliases: ['vhost-net', 'vhost-user', 'DPDK vhost'],
        category: 'virt',
        definition:
            'QEMU 유저 공간을 바이패스하여 virtio 데이터 패스를 가속하는 기술. vhost-net은 커널 스레드가 직접 virtqueue를 처리하고, vhost-user는 DPDK 등 유저 공간 프로세스가 처리합니다. I/O 처리 경로에서 QEMU 컨텍스트 스위치를 제거해 네트워크 처리량과 지연시간을 크게 개선합니다.',
        topicRef: '13-kvm',
    },

    // ── 일반 ─────────────────────────────────────────────────────────────────
    {
        id: 'syscall',
        term: '시스템 콜',
        aliases: ['System Call', 'syscall'],
        category: 'general',
        definition:
            '유저 공간 프로그램이 커널 서비스를 요청하는 인터페이스. SYSCALL/INT 0x80 명령으로 Ring 3 → Ring 0 전환이 발생하며, 커널이 요청을 처리한 후 다시 Ring 3로 복귀합니다. read, write, fork, mmap 등이 대표적입니다.',
        topicRef: '01-overview',
    },
    {
        id: 'cgroup',
        term: 'cgroup',
        aliases: ['Control Groups', 'cgroups v2'],
        category: 'general',
        definition:
            '프로세스 그룹의 CPU, 메모리, I/O, 네트워크 자원 사용량을 제한·계측하는 커널 기능. Docker/Kubernetes 컨테이너 자원 제한의 기반입니다. cgroups v2는 단일 계층 구조와 pressure 지표를 제공합니다.',
        topicRef: '02-scheduler',
    },
    {
        id: 'red_black_tree',
        term: 'Red-Black Tree',
        aliases: ['RB Tree', 'rbtree'],
        category: 'general',
        definition:
            '자가 균형 이진 탐색 트리로, 삽입·삭제·검색 모두 O(log N) 복잡도를 보장합니다. 커널에서 CFS 스케줄러의 vruntime 관리, VMA 탐색, epoll 파일디스크립터 관리 등 성능이 중요한 곳에 광범위하게 사용됩니다. include/linux/rbtree.h에 정의되어 있습니다.',
        topicRef: '02-scheduler',
    },

    // ── 메모리 (추가) ────────────────────────────────────────────────────────
    {
        id: 'page_table',
        term: '페이지 테이블',
        aliases: ['Page Table', 'PGD/PUD/PMD/PTE'],
        category: 'memory',
        definition:
            '가상 주소를 물리 주소로 변환하는 커널 자료구조. x86-64에서는 PGD → PUD → PMD → PTE 4단계 구조를 사용하며, CR3 레지스터가 최상위 테이블을 가리킵니다. 각 단계에서 가상 주소의 9비트씩을 인덱스로 사용하여 최종 물리 페이지 프레임을 찾습니다.',
        topicRef: '03-memory',
    },
    {
        id: 'gfp_flags',
        term: 'GFP Flags',
        aliases: ['Get Free Pages', '__GFP_*'],
        category: 'memory',
        definition:
            '커널 메모리 할당 시 동작을 제어하는 플래그. GFP_KERNEL(슬립 가능), GFP_ATOMIC(인터럽트 컨텍스트, 슬립 불가), GFP_DMA(DMA 영역), GFP_HIGHUSER(유저 페이지) 등이 있습니다. 할당 함수(kmalloc, alloc_pages 등)의 필수 인자입니다.',
        topicRef: '03-memory',
    },

    // ── 파일시스템 (추가) ─────────────────────────────────────────────────────
    {
        id: 'ext4',
        term: 'ext4',
        aliases: ['Fourth Extended Filesystem'],
        category: 'fs',
        definition:
            '리눅스의 기본 저널링 파일시스템. ext3의 후속으로, extent 기반 블록 매핑, delayed allocation, 멀티블록 할당, 최대 1EB 볼륨/16TB 파일 크기를 지원합니다. fs/ext4/에 구현되어 있으며 대부분의 리눅스 배포판에서 기본 파일시스템으로 사용됩니다.',
        topicRef: '04-filesystem',
    },
    {
        id: 'journaling',
        term: '저널링',
        aliases: ['Journaling', 'Journal'],
        category: 'fs',
        definition:
            '파일시스템 변경 사항을 먼저 저널(로그) 영역에 기록한 뒤 실제 데이터를 쓰는 기법. 갑작스런 전원 차단 시 저널을 재생(replay)하여 파일시스템 일관성을 복구할 수 있습니다. ext4는 JBD2(Journaling Block Device 2)를 사용하며, data=ordered가 기본 모드입니다.',
        topicRef: '04-filesystem',
    },

    // ── 인터럽트 (추가) ───────────────────────────────────────────────────────
    {
        id: 'idt',
        term: 'IDT',
        aliases: ['Interrupt Descriptor Table'],
        category: 'interrupt',
        definition:
            'x86 아키텍처에서 인터럽트/예외 번호(0~255)를 핸들러 함수 주소에 매핑하는 테이블. CPU가 인터럽트를 받으면 IDTR 레지스터가 가리키는 IDT에서 해당 벡터의 게이트 디스크립터를 읽어 핸들러로 점프합니다. arch/x86/kernel/idt.c에서 초기화됩니다.',
        topicRef: '05-interrupts',
    },

    // ── 네트워크 (추가) ───────────────────────────────────────────────────────
    {
        id: 'qdisc',
        term: 'qdisc',
        aliases: ['Queueing Discipline', 'TC qdisc'],
        category: 'network',
        definition:
            '리눅스 트래픽 제어(TC)의 핵심 구성요소로, 패킷 큐잉과 스케줄링 정책을 정의합니다. pfifo_fast(기본), HTB(계층적 토큰 버킷), fq_codel(공정 큐잉+지연 제어) 등이 있으며, tc 명령으로 설정합니다. net/sched/에 구현되어 있습니다.',
        topicRef: '07-netfilter',
    },
    {
        id: 'tproxy',
        term: 'TPROXY',
        aliases: ['Transparent Proxy'],
        category: 'network',
        definition:
            '클라이언트가 프록시의 존재를 인지하지 못한 채 트래픽을 프록시 서버로 리다이렉트하는 Netfilter 기능. iptables -j TPROXY와 정책 라우팅(ip rule fwmark)을 조합하여 원본 목적지 주소를 유지한 채 로컬 소켓으로 전달합니다.',
        topicRef: '07-netfilter',
    },

    // ── 드라이버 (추가) ───────────────────────────────────────────────────────
    {
        id: 'ring_buffer',
        term: 'Ring Buffer',
        aliases: ['Circular Buffer', 'Descriptor Ring'],
        category: 'driver',
        definition:
            '고정 크기 순환 버퍼로, NIC 드라이버에서 TX/RX 디스크립터 링으로 광범위하게 사용됩니다. head/tail 포인터로 생산자-소비자 패턴을 구현하며, DMA와 결합하여 CPU 개입 없이 패킷을 전송/수신합니다. ftrace 이벤트 버퍼도 ring buffer 구조입니다.',
        topicRef: '10-drivers',
    },
    {
        id: 'device_tree',
        term: 'Device Tree',
        aliases: ['DT', 'DTB', 'FDT'],
        category: 'driver',
        definition:
            '하드웨어 구성을 기술하는 데이터 구조로, ARM/RISC-V 등 비-x86 플랫폼에서 부트로더가 커널에 전달합니다. .dts(소스) → .dtb(바이너리)로 컴파일되며, 커널은 이를 파싱하여 플랫폼 디바이스를 자동 생성합니다. arch/arm64/boot/dts/에 보드별 파일이 있습니다.',
        topicRef: '10-drivers',
    },
    {
        id: 'iommu',
        term: 'IOMMU',
        aliases: ['Input-Output MMU', 'Intel VT-d', 'AMD-Vi', 'SMMU'],
        category: 'driver',
        definition:
            '디바이스의 DMA 주소를 물리 주소로 변환하는 하드웨어 유닛. 디바이스가 임의 메모리에 접근하는 것을 차단하여 보안을 강화하고, VFIO를 통한 디바이스 패스스루 가상화를 가능하게 합니다. Intel VT-d, AMD-Vi, ARM SMMU가 대표적입니다.',
        topicRef: '10-drivers',
    },

    // ── 디버깅 (추가) ─────────────────────────────────────────────────────────
    {
        id: 'kdump',
        term: 'kdump',
        aliases: ['Kernel Dump', 'crash dump'],
        category: 'debug',
        definition:
            '커널 패닉 발생 시 메모리 덤프를 캡처하는 메커니즘. kexec로 미리 로드된 캡처 커널이 패닉 직후 부팅되어 /proc/vmcore를 통해 크래시 덤프를 저장합니다. crash 유틸리티로 덤프를 분석하여 패닉 원인을 추적할 수 있습니다.',
        topicRef: '11-debugging',
    },
    {
        id: 'bcc',
        term: 'BCC',
        aliases: ['BPF Compiler Collection'],
        category: 'debug',
        definition:
            'eBPF 프로그램을 Python/Lua로 작성할 수 있게 하는 도구 모음. execsnoop, biolatency, tcpconnect 등 100+ 분석 도구를 포함합니다. bpftrace보다 복잡한 로직에 적합하며, libbcc가 BPF 프로그램을 런타임에 컴파일합니다.',
        topicRef: '11-debugging',
    },

    // ── 가상화 (추가) ─────────────────────────────────────────────────────────
    {
        id: 'shadow_page_table',
        term: 'Shadow Page Table',
        aliases: ['SPT'],
        category: 'virt',
        definition:
            'EPT/NPT가 없는 환경에서 KVM이 게스트 가상 주소를 호스트 물리 주소로 변환하기 위해 유지하는 페이지 테이블. 게스트 페이지 테이블 변경을 인터셉트하여 shadow 엔트리를 동기화합니다. EPT/NPT 대비 VMEXIT 오버헤드가 크므로 최신 CPU에서는 사용하지 않습니다.',
        topicRef: '13-kvm',
    },
    {
        id: 'qemu',
        term: 'QEMU',
        aliases: ['Quick Emulator'],
        category: 'virt',
        definition:
            'KVM과 함께 사용되는 유저 공간 가상 머신 모니터. CPU 가상화는 KVM 커널 모듈이 담당하고, QEMU는 가상 디바이스(디스크, 네트워크, GPU) 에뮬레이션과 VM 라이프사이클 관리를 담당합니다. QEMU의 ioctl을 통해 KVM에 VCPU 생성·실행을 요청합니다.',
        topicRef: '13-kvm',
    },
]
