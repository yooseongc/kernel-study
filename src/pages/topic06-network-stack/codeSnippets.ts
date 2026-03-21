export const napiPollCode = `/* NAPI poll 콜백 (드라이버가 구현) */
int driver_poll(struct napi_struct *napi, int budget) {
    struct my_adapter *adapter = container_of(napi, ...);
    int work_done = 0;

    while (work_done < budget) {
        struct sk_buff *skb = get_next_rx_skb(adapter);
        if (!skb) break;

        /* sk_buff를 네트워크 스택으로 전달 */
        netif_receive_skb(skb);
        work_done++;
    }

    /* budget 미달 = 큐가 비었음 → 인터럽트 모드로 복귀 */
    if (work_done < budget) {
        napi_complete_done(napi, work_done);
        enable_irq(adapter->irq);
    }

    return work_done;
}`

export const skbuffCode = `/* include/linux/skbuff.h (핵심 필드만 발췌) */
struct sk_buff {
    /* ── 데이터 포인터 ── */
    unsigned char   *head;      /* 할당된 버퍼 시작 */
    unsigned char   *data;      /* 현재 데이터 시작 (헤더 제거 시 증가) */
    unsigned char   *tail;      /* 현재 데이터 끝 */
    unsigned char   *end;       /* 할당된 버퍼 끝 */

    /* ── 메타데이터 ── */
    __u32           len;        /* 데이터 길이 */
    __u16           protocol;   /* ETH_P_IP, ETH_P_IPV6, ... */
    __u8            pkt_type;   /* PACKET_HOST, BROADCAST, ... */

    /* ── 네트워크 계층 ── */
    struct net_device *dev;     /* 수신/송신 장치 */
    sk_buff_data_t  transport_header;  /* L4 헤더 오프셋 */
    sk_buff_data_t  network_header;    /* L3 헤더 오프셋 */
    sk_buff_data_t  mac_header;        /* L2 헤더 오프셋 */

    /* ── 소켓 연결 ── */
    struct sock     *sk;        /* 이 패킷을 소유한 소켓 (수신 시 설정) */

    /* ── Netfilter ── */
    __u8            nf_trace:1;
    __u32           mark;       /* fwmark (라우팅, TC에 사용) */
};`

export const netClsCode = `# myapp cgroup의 패킷에 classid 1:10 태그
echo 0x00010010 > /sys/fs/cgroup/myapp/net_cls.classid

# tc로 classid 1:10에 100Mbps 제한
tc qdisc add dev eth0 root handle 1: htb default 30
tc class add dev eth0 parent 1: classid 1:10 htb rate 100mbit
tc filter add dev eth0 parent 1: handle 0x10 cgroup`

export const txCode = `/* TCP 송신 경로 핵심 함수 */
int tcp_sendmsg(struct sock *sk, struct msghdr *msg, size_t size)
{
    /* 1. 데이터를 MSS 단위로 sk_buff에 복사 */
    skb = sk_stream_alloc_skb(sk, 0, sk->sk_allocation, false);
    skb_add_data_nocache(sk, skb, &msg->msg_iter, copy);

    /* 2. TCP 헤더 + 체크섬 계산 */
    tcp_push(sk, flags, mss_now, nonagle, size_goal);
}

/* IP 레이어 송신 */
int ip_queue_xmit(struct sock *sk, struct sk_buff *skb, struct flowi *fl)
{
    /* 라우팅 테이블 조회 */
    rt = (struct rtable *)__sk_dst_check(sk, 0);

    /* IP 헤더 설정 */
    iph = ip_hdr(skb);
    iph->protocol = sk->sk_protocol;
    iph->ttl      = ip_select_ttl(inet, &rt->dst);

    return ip_local_out(net, sk, skb);
}

/* 드라이버 큐로 전달 */
int dev_queue_xmit(struct sk_buff *skb)
{
    txq = netdev_pick_tx(dev, skb, NULL);
    q = rcu_dereference_bh(txq->qdisc);  /* pfifo_fast, etc. */
    return __dev_xmit_skb(skb, q, dev, txq);
}`

export const tsoCheckCode = `# TSO/GSO/GRO 상태 확인
ethtool -k eth0 | grep -E "tcp-segmentation|generic-segmentation|generic-receive"

# TSO 비활성화 (디버깅 목적)
ethtool -K eth0 tso off

# 큰 sk_buff 전송 허용 크기 확인
ip link show eth0  # mtu 1500 부분
cat /proc/sys/net/ipv4/tcp_gso_max_size`

export const rssConfigCode = `# RSS: NIC 큐 수 확인 / 설정
ethtool -l eth0                          # 현재 큐 수
ethtool -L eth0 combined 8               # 8개 큐로 설정

# RPS: 소프트웨어 CPU 분산 (큐가 1개인 경우)
echo f > /sys/class/net/eth0/queues/rx-0/rps_cpus  # 모든 CPU 사용

# RFS: flow를 처리 중인 CPU로 스티어링
echo 32768 > /sys/class/net/eth0/queues/rx-0/rps_flow_cnt
echo 32768 > /proc/sys/net/core/rps_sock_flow_entries

# IRQ 어피니티 확인 (RSS와 연계)
cat /proc/interrupts | grep eth0`

export const sendfileCode = `/* sendfile — 파일을 소켓으로 zero-copy 전송 */
#include <sys/sendfile.h>

int file_fd = open("index.html", O_RDONLY);
off_t offset = 0;
ssize_t sent = sendfile(sock_fd,    /* 출력: 소켓 */
                         file_fd,   /* 입력: 파일 */
                         &offset,   /* 시작 오프셋 */
                         file_size);/* 전송 크기 */
/* → 커널이 페이지 캐시에서 NIC로 직접 전달 */

/* splice — 임의 fd 간 zero-copy (pipe를 통해) */
int pipefd[2];
pipe(pipefd);

/* 파일 → pipe (zero-copy) */
splice(file_fd, &offset, pipefd[1], NULL, chunk_size, SPLICE_F_MOVE);
/* pipe → 소켓 (zero-copy) */
splice(pipefd[0], NULL, sock_fd, NULL, chunk_size, SPLICE_F_MOVE);

/* Nginx의 sendfile 활성화 */
/* nginx.conf: sendfile on; tcp_nopush on; */`

export const reuseportCode = `int sock = socket(AF_INET, SOCK_STREAM, 0);

/* SO_REUSEPORT 활성화 */
int opt = 1;
setsockopt(sock, SOL_SOCKET, SO_REUSEPORT, &opt, sizeof(opt));

/* 모든 워커 프로세스/스레드가 같은 포트에 bind 가능 */
struct sockaddr_in addr = { .sin_port = htons(80), .sin_addr.s_addr = INADDR_ANY };
bind(sock, (struct sockaddr *)&addr, sizeof(addr));
listen(sock, SOMAXCONN);

/* 각 소켓에서 독립적으로 accept() — 경쟁 없음 */
accept(sock, ...);

/* Nginx 설정 예시: */
/* worker_processes auto;  # CPU 수만큼 */
/* reuseport 옵션은 listen 지시어에 자동 적용 */`

export const netnsCode = `# 새 네임스페이스 생성
ip netns add myns

# 네임스페이스 내에서 명령 실행
ip netns exec myns ip addr    # 격리된 인터페이스 확인
ip netns exec myns ping 8.8.8.8  # 초기에는 외부 통신 불가

# veth pair로 두 네임스페이스 연결
ip link add veth0 type veth peer name veth1
ip link set veth1 netns myns        # veth1을 myns로 이동

# IP 설정
ip addr add 10.0.0.1/24 dev veth0
ip netns exec myns ip addr add 10.0.0.2/24 dev veth1
ip link set veth0 up
ip netns exec myns ip link set veth1 up

# 이제 통신 가능
ping 10.0.0.2

# 네임스페이스 목록
ip netns list
lsns -t net

# Docker 컨테이너의 네임스페이스 진입
PID=$(docker inspect -f '{{.State.Pid}}' my_container)
nsenter -t $PID -n ip addr`

export const ioUringCode = `#include <liburing.h>

/* io_uring 초기화 */
struct io_uring ring;
io_uring_queue_init(256, &ring, 0);  /* 256 엔트리 큐 */

/* 비동기 수신 요청 제출 */
struct io_uring_sqe *sqe = io_uring_get_sqe(&ring);
io_uring_prep_recv(sqe, client_fd, buf, sizeof(buf), 0);
sqe->user_data = (uint64_t)client_fd;  /* 식별자 */
io_uring_submit(&ring);  /* SQ → 커널 (syscall 1번) */

/* 여러 요청을 한 번에 제출 (배치) */
for (int i = 0; i < n_clients; i++) {
    sqe = io_uring_get_sqe(&ring);
    io_uring_prep_recv(sqe, clients[i].fd, clients[i].buf, BUF_SIZE, 0);
}
io_uring_submit(&ring);  /* syscall 1번으로 n개 요청 */

/* 완료 대기 및 처리 */
struct io_uring_cqe *cqe;
io_uring_wait_cqe(&ring, &cqe);  /* 완료 대기 */
int bytes = cqe->res;             /* 읽은 바이트 수 */
int fd    = (int)cqe->user_data;
io_uring_cqe_seen(&ring, cqe);   /* CQ 슬롯 반환 */

/* SQPOLL 모드: syscall 완전 제거 */
struct io_uring_params params = { .flags = IORING_SETUP_SQPOLL };
io_uring_queue_init_params(256, &ring, &params);
/* 커널 스레드(io_uring-sq)가 SQ를 폴링 → io_uring_submit() 불필요 */`

export const ioUringCheckCode = `# 커널 버전 확인 (5.1 이상 필요)
uname -r

# io_uring 지원 조작 확인
cat /proc/sys/kernel/io_uring_disabled  # 0: 활성, 1: 비활성

# io_uring 사용 중인 프로세스
cat /proc/*/fdinfo/* 2>/dev/null | grep "sq_ring"

# liburing 설치
apt install liburing-dev  # Ubuntu`

export const congCtrlCode = `# 현재 혼잡 제어 알고리즘 확인
cat /proc/sys/net/ipv4/tcp_congestion_control
# cubic

# 사용 가능한 알고리즘 목록
cat /proc/sys/net/ipv4/tcp_available_congestion_control
# reno cubic bbr

# BBR로 변경 (커널 모듈 로드 필요)
modprobe tcp_bbr
echo bbr > /proc/sys/net/ipv4/tcp_congestion_control

# 영구 설정 (/etc/sysctl.conf)
echo "net.ipv4.tcp_congestion_control = bbr" >> /etc/sysctl.conf
echo "net.core.default_qdisc = fq" >> /etc/sysctl.conf   # BBR 권장 qdisc
sysctl -p

# 소켓별 혼잡 제어 확인 (ss)
ss -tin | grep -A2 "ESTAB"
# cubic rto:204 rtt:1.5/0.75 mss:1448 cwnd:10

# BBR 상태 확인
ss -tin | grep bbr
# bbr bw:100Mbps mrtt:1.5`
