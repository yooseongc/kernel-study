// ─────────────────────────────────────────────────────────────────────────────
// Topic 07 — 패킷 처리 경로와 후킹 지점
// 코드 문자열 상수 모음 (index.tsx에서 분리)
// ─────────────────────────────────────────────────────────────────────────────

export const iptablesVsNftablesCode = `# iptables: SSH(22) 허용, 나머지 DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -j DROP

# nftables 동일 규칙
nft add table inet filter
nft add chain inet filter input { type filter hook input priority 0 \\; policy drop \\; }
nft add rule inet filter input tcp dport 22 accept`

export const iptablesMainSyntaxCode = `# 규칙 조회
iptables -L -n -v --line-numbers          # filter 테이블
iptables -t nat -L -n -v                  # nat 테이블

# INPUT 체인: SSH만 허용, 나머지 차단
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -P INPUT DROP                    # 기본 정책: DROP

# FORWARD: 패킷 포워딩 허용
iptables -A FORWARD -i eth0 -o eth1 -j ACCEPT
iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

# NAT: 출발지 주소 변환 (Masquerade)
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE

# DNAT: 포트 포워딩 (80 → 내부 서버 8080)
iptables -t nat -A PREROUTING -p tcp --dport 80 \\
    -j DNAT --to-destination 192.168.1.10:8080

# 규칙 삭제
iptables -D INPUT -p tcp --dport 22 -j ACCEPT

# 규칙 저장/복원
iptables-save > /etc/iptables/rules.v4
iptables-restore < /etc/iptables/rules.v4`

export const nftablesSyntaxCode = `# nftables로 같은 규칙 표현
nft add table inet filter
nft add chain inet filter input { type filter hook input priority 0 \\; policy drop \\; }
nft add rule inet filter input tcp dport 22 accept
nft add rule inet filter input ct state established,related accept

# NAT
nft add table ip nat
nft add chain ip nat postrouting { type nat hook postrouting priority 100 \\; }
nft add rule ip nat postrouting oifname "eth0" masquerade

# 규칙 조회
nft list ruleset`

export const conntrackCode = `# conntrack 테이블 확인
conntrack -L
# 예시 출력:
# tcp 6 86400 ESTABLISHED src=192.168.1.10 dst=8.8.8.8 sport=54321 dport=443
#   src=8.8.8.8 dst=192.168.1.10 sport=443 dport=54321 [ASSURED]

# 특정 연결 삭제
conntrack -D -s 192.168.1.10`

export const conntrackTuningCode = `# 현재 conntrack 상태 확인
cat /proc/sys/net/netfilter/nf_conntrack_count    # 현재 연결 수
cat /proc/sys/net/netfilter/nf_conntrack_max      # 최대 허용 수

# conntrack 테이블 크기 증가
echo 1000000 > /proc/sys/net/netfilter/nf_conntrack_max
# 또는 sysctl로 영구 설정
echo "net.netfilter.nf_conntrack_max = 1000000" >> /etc/sysctl.conf

# 버킷(해시 테이블) 크기도 함께 조정 (max의 1/4 권장)
echo 250000 > /sys/module/nf_conntrack/parameters/hashsize

# timeout 줄이기 (짧은 연결이 많은 환경)
echo 30  > /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_time_wait
echo 10  > /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_close_wait
echo 120 > /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_established

# conntrack 테이블 내용 확인
conntrack -L | head -20
conntrack -L | wc -l  # 현재 연결 수

# 특정 연결 강제 삭제
conntrack -D -p tcp --dport 8080`

export const ipsetCode = `# ipset 설치 및 집합 생성
ipset create blocklist hash:ip maxelem 1000000

# IP 추가/삭제
ipset add blocklist 192.168.1.100
ipset add blocklist 10.0.0.0/8    # CIDR 지원 (hash:net 타입)
ipset del blocklist 192.168.1.100

# iptables와 연동
iptables -I INPUT -m set --match-set blocklist src -j DROP

# 대량 추가 (파일에서)
ipset restore < blocklist.txt

# 집합 조회
ipset list blocklist | head -20
ipset list blocklist | wc -l

# 저장/복원
ipset save > /etc/ipset.conf
ipset restore < /etc/ipset.conf`

export const conntrackHelperCode = `# conntrack helper 모듈 로드
modprobe nf_conntrack_ftp
modprobe nf_conntrack_sip

# 등록된 helper 확인
cat /proc/net/nf_conntrack_expect
# l3proto = IPv4 proto=tcp src=192.168.1.10 dst=203.0.113.5 sport=0 dport=45678
# ↑ FTP 데이터 채널 expectation

# 현재 conntrack 테이블 (RELATED 항목 확인)
conntrack -L | grep RELATED
# tcp 6 29 TIME_WAIT src=... dst=... RELATED [ASSURED]

# nftables에서 helper 명시 설정 (커널 5.x+ 권장 방식)
nft add rule inet filter input ct helper "ftp" accept

# helper 비활성화 (보안상 필요 시)
echo 0 > /proc/sys/net/netfilter/nf_conntrack_helper`

export const tproxyCode = `# TPROXY 설정 예시 (투명 프록시)

# 1. 패킷을 특별 라우팅 테이블로 마크
iptables -t mangle -A PREROUTING -p tcp --dport 80 \\
    -j TPROXY --tproxy-mark 1 --on-port 8080

# 2. 마크된 패킷을 lo로 라우팅
ip rule add fwmark 1 lookup 100
ip route add local default dev lo table 100

# 3. 프록시 소켓: IP_TRANSPARENT 옵션 필요
# setsockopt(fd, SOL_IP, IP_TRANSPARENT, &opt, sizeof(opt))`
