# Kernel Study — 페이지 목록 및 콘텐츠 개요

> 마지막 업데이트: 2026-03-22

## 라우팅 구조

| URL (Hash) | 컴포넌트 | 상태 |
|------------|----------|------|
| `/#/` | `Home` | ✅ 완료 |
| `/#/topic/01-overview` | `Topic01Overview` | ✅ 완료 |
| `/#/topic/02-scheduler` | `Topic02Scheduler` | ✅ 완료 |
| `/#/topic/03-memory` | `Topic03Memory` | ✅ 완료 |
| `/#/topic/04-filesystem` | `Topic04Filesystem` | ✅ 완료 |
| `/#/topic/05-interrupts` | `Topic05Interrupts` | ✅ 완료 |
| `/#/topic/06-network-stack` | `Topic06NetworkStack` | ✅ 완료 |
| `/#/topic/07-netfilter` | `Topic07Netfilter` | ✅ 완료 |
| `/#/topic/08-xdp-ebpf` | `Topic08XdpEbpf` | ✅ 완료 |
| `/#/topic/09-synchronization` | `Topic09Synchronization` | ✅ 완료 |
| `/#/topic/10-drivers` | `Topic10Drivers` | ✅ 완료 |
| `/#/topic/11-debugging` | `Topic11Debugging` | ✅ 완료 |
| `/#/topic/12-security` | `Topic12Security` | ✅ 완료 |
| `/#/topic/13-kvm` | `Topic13KVM` | ✅ 완료 |
| `/#/glossary` | `Glossary` | ✅ 완료 |
| `/#/graph` | `Graph` | ✅ 완료 |

---

## 페이지별 콘텐츠 개요

### 홈 (`/`)
- 사이트 소개 Hero 섹션 (Cmd+K 검색 힌트 포함)
- 13개 토픽 카드 그리드 (제목, 설명, 태그, 난이도 배지)
- 학습 가이드 안내

---

### 용어 사전 (`/glossary`)

**기능:**
- 커널 핵심 용어 92개 수록 (11개 카테고리: 프로세스, 메모리, 네트워크, 인터럽트, 동기화, 드라이버, 디버깅, 일반, 파일시스템, 보안, 가상화)
- 카테고리별 색상 배지 + 필터 칩
- 전문 검색 (용어명, alias, 정의)
- 가나다순 정렬
- URL 앵커(#term-id)로 특정 용어에 직접 링크 가능
- 관련 토픽 링크 제공
- SearchModal에서 용어 검색 지원
- 인라인 GlossaryTooltip (`<T>`) 연동 — 전 토픽에서 용어 첫 등장 시 툴팁 표시

### 개념 지도 (`/graph`)
- D3 force-directed 그래프
- 13개 토픽 + 92개 용어 노드
- 공통 태그/topicRef 기반 엣지
- 줌/팬/드래그, 카테고리 필터

---

### Topic 01 — 리눅스 커널 개요와 전체 구조

**시각화:** D3 (동심원 Ring, force-directed 서브시스템 그래프), AnimatedDiagram

**섹션 구성:**
1. 커널이 하는 일 — 4개 역할 카드 (프로세스/메모리/파일/네트워크)
2. 유저 공간과 커널 공간 — Mermaid sequence diagram (syscall 흐름)
3. CPU 권한 레벨 — D3 동심원 Ring 0~3 다이어그램 (인터랙티브)
4. 커널 서브시스템 구조 — D3 force-directed 인터랙티브 그래프
5. 전체 계층 구조 — 정적 JSX 4레이어 카드
6. task_struct — 실제 커널 소스 코드 + KernelRef
7. 시스템 콜 전체 흐름 — 단계별 애니메이션 + KernelRef
8. 주요 시스템 콜 카탈로그 — syscall 비교 표, fork/clone/vfork 비교
9. 관련 커널 파라미터 — sysctl 파라미터 표 + 확인 명령어

---

### Topic 02 — 프로세스, 스레드, 스케줄러

**시각화:** D3 (CFS Red-Black 트리, 프로세스 상태 다이어그램, 컨텍스트 스위치 애니메이션, cgroup 계층 트리)

**섹션 구성:**
1. 프로세스와 스레드 — 비교 표, fork/clone 차이
2. task_struct 심층 탐색 — 주요 필드 + 관련 커널 소스 박스
3. 프로세스 상태 전이 — D3 상태 다이어그램
4. CFS 스케줄러 — Red-Black 트리 인터랙티브 시각화 + 관련 커널 소스 박스
5. 컨텍스트 스위치 — 단계별 애니메이션 + 관련 커널 소스 박스
6. 프로세스와 스레드 비교 — 상세 비교 표
7. NUMA 인지 스케줄링
8. cgroup 자원 제어 — D3 트리
9~12. 실시간 스케줄링, SCHED_DEADLINE, 커널 파라미터

---

### Topic 03 — 가상 메모리와 메모리 관리

**시각화:** D3 (가상 주소 분해, 페이지 테이블 워크, Buddy Allocator, SLUB, Page Fault, CoW 애니메이션)

**섹션 구성:**
1. 가상 주소와 물리 주소 — 다중 프로세스 VA 시각화
2. 페이지와 페이지 테이블 — 4단계 워크 시각화 + 관련 커널 소스 박스
3. mm_struct와 VMA
4. Page Fault — 단계별 처리 흐름
5. Buddy Allocator — 블록 분할/합병 인터랙티브 + 관련 커널 소스 박스
6. SLUB Allocator — 캐시 구조 D3 + 관련 커널 소스 박스
7. OOM Killer, kswapd
8. GFP 플래그와 메모리 영역
9~13. mmap, Huge Pages, CoW, NUMA 정책, 커널 파라미터

---

### Topic 04 — VFS와 파일시스템

**시각화:** D3 (VFS 계층 다이어그램, open() 흐름 애니메이션)

**섹션 구성:**
1. VFS 계층 구조 — inode/dentry/file 관계 + KernelRef
2. open() 흐름 — 단계별 애니메이션
3. 페이지 캐시 구조
4. ext4 저널링 메커니즘 + KernelRef
5. 블록 I/O 경로 — bio 구조체 + KernelRef
6. 대표 파일시스템 비교
7. 리눅스 파일 종류와 권한
8. 관련 커널 파라미터

---

### Topic 05 — 인터럽트, 예외, Deferred Work

**시각화:** D3 (IRQ 처리 흐름 DAG, Deferred Work 비교)

**섹션 구성:**
1. 인터럽트와 예외 개요
2. IRQ 처리 흐름 + KernelRef
3. Top Half / Bottom Half 타임라인
4. Softirq / Tasklet / Workqueue 비교 + KernelRef
5. 비교 표
6. Threaded IRQ + KernelRef
7. PREEMPT_RT
8. 타이머와 hrtimer
9. IRQ Coalescing + NAPI
10. 관련 커널 파라미터

---

### Topic 06 — 네트워크 스택의 전체 흐름

**시각화:** D3 (NetworkLayerDiagram, SkbuffLayout, NAPI 비교, TX 흐름)

**섹션 구성:**
1. 패킷 수신 과정 — 7단계 상세 + NAPI 핵심 포인트
2. NIC 드라이버와 NAPI + 관련 커널 소스 박스
3. sk_buff 구조 + 관련 커널 소스 박스
4. L2/L3/L4 처리 흐름
5. 소켓 계층
6. TC 트래픽 제어 + qdisc
7~14. TX 경로, TSO/GSO, RSS/RPS/RFS, 네트워크 네임스페이스, zero-copy, io_uring, TCP 혼잡 제어, 커널 파라미터

---

### Topic 07 — 패킷 처리 경로와 후킹 지점

**섹션 구성:**
1. Netfilter 5개 훅 포인트 + KernelRef
2~4. iptables Table×Chain 매트릭스, NAT, 패킷 경로 시뮬레이션
5. Conntrack + KernelRef
6. TPROXY
7~10. TC Hook, 커널 파라미터

---

### Topic 08 — XDP, eBPF, 고성능 패킷 처리

**시각화:** D3 (XDP vs Normal 비교, eBPF 파이프라인)

**섹션 구성:**
1~4. XDP, eBPF 실행 모델, verifier/JIT, BPF 맵
5~8. BCC, TC BPF, Netfilter 연동, seccomp
9~13. bpftrace, Flame Graph, 커널 파라미터

---

### Topic 09 — 동기화와 멀티코어 환경

**시각화:** D3 (Race Condition 시뮬레이션, Lock 비교 차트, RCU Grace Period 타임라인)

**섹션 구성:**
1~3. Race Condition, Spinlock, Mutex
4. RWLock + 관련 커널 소스 박스
5~8. Atomic, Seqlock, Wait Queue, Completion
9. RCU + 관련 커널 소스 박스
10~15. Per-CPU, Memory Barrier, 커널 파라미터

---

### Topic 10 — 디바이스 드라이버와 커널 모듈

**시각화:** D3 (드라이버 계층 트리, DMA 전송)

**섹션 구성:**
1. 커널 모듈 + KernelRef
2. 문자 디바이스 + KernelRef
3~4. 블록/네트워크 디바이스 + KernelRef
5~8. DMA, ioctl/mmap, Device Tree, PCI + KernelRef
9~11. 커널 파라미터

---

### Topic 11 — 성능 분석과 디버깅

**시각화:** D3 (Flame Graph, /proc 트리, 네트워크 병목 차트)

**섹션 구성:**
1~4. /proc, /sys, dmesg, Oops/Panic, kdump
5~7. perf stat/record/report
8~9. ftrace + KernelRef
10. lockdep + KernelRef
11. KASAN + KernelRef
12. Flame Graph
13. 커널 파라미터

---

### Topic 12 — Linux 보안 모델

**섹션 구성:**
1~2. DAC, Capabilities
3. LSM 프레임워크 + KernelRef (AppArmor, SELinux)
4~5. 컨테이너 보안 계층, seccomp + KernelRef
6. Namespace + KernelRef
7~8. PID Namespace 심화, 커널 파라미터

---

### Topic 13 — KVM / 가상화

**섹션 구성:**
1. KVM 커널 하이퍼바이저 구조 + KernelRef
2. VMCS/VMCB — VMENTRY·VMEXIT + KernelRef
3. EPT 중첩 페이지 테이블
4~5. virtio 반가상화 I/O, KVM 관리 실전
6. vhost 커널 내 virtio 백엔드 + KernelRef
7. 관련 커널 파라미터
