# Kernel Study — 페이지 목록 및 콘텐츠 개요

> 마지막 업데이트: 2026-03-21

## 라우팅 구조

| URL (Hash) | 컴포넌트 | 상태 |
|------------|----------|------|
| `/#/` | `Home` | ✅ 완료 |
| `/#/topic/01-overview` | `Topic01Overview` | ✅ 완료 |
| `/#/topic/02-scheduler` | `Topic02Scheduler` | 🚧 플레이스홀더 |
| `/#/topic/03-memory` | `Topic03Memory` | 🚧 플레이스홀더 |
| `/#/topic/04-filesystem` | `Topic04Filesystem` | ✅ 완료 |
| `/#/topic/05-interrupts` | `Topic05Interrupts` | 🚧 플레이스홀더 |
| `/#/topic/06-network-stack` | `Topic06NetworkStack` | 🚧 플레이스홀더 |
| `/#/topic/07-netfilter` | `Topic07Netfilter` | 🚧 플레이스홀더 |
| `/#/topic/08-xdp-ebpf` | `Topic08XdpEbpf` | 🚧 플레이스홀더 |
| `/#/topic/09-synchronization` | `Topic09Synchronization` | 🚧 플레이스홀더 |
| `/#/topic/10-drivers` | `Topic10Drivers` | 🚧 플레이스홀더 |
| `/#/topic/11-debugging` | `Topic11Debugging` | 🚧 플레이스홀더 |
| `/#/topic/12-security` | `Topic12Security` | ✅ 완료 |
| `/#/glossary` | `Glossary` | ✅ 완료 |

---

## 페이지별 콘텐츠 개요

### 홈 (`/`)
- 사이트 소개 Hero 섹션 (Cmd+K 검색 힌트 포함)
- 12개 토픽 카드 그리드 (제목, 설명, 태그)
- 학습 가이드 안내

---

### 용어 사전 (`/glossary`)

**기능:**
- 커널 핵심 용어 36개 수록
- 카테고리별 색상 배지 (프로세스, 메모리, 네트워크, 인터럽트, 동기화, 드라이버, 디버깅, 일반)
- 가나다순 정렬
- URL 앵커(#term-id)로 특정 용어에 직접 링크 가능
- 관련 토픽 링크 제공
- SearchModal에서 용어 검색 지원

---

### Topic 01 — 리눅스 커널 개요와 전체 구조

**시각화 도구:** D3 (force-directed graph), Mermaid

**섹션 구성:**
1. 커널이 하는 일 — 4개 역할 카드 (프로세스/메모리/파일/네트워크)
2. 유저 공간과 커널 공간 — Mermaid sequence diagram (syscall 흐름)
3. CPU 권한 레벨 — D3 동심원 Ring 0~3 다이어그램 (인터랙티브)
4. 커널 서브시스템 구조 — D3 force-directed 인터랙티브 그래프 (드래그 가능)
5. 전체 계층 구조 — Mermaid graph TB
6. task_struct — 실제 커널 소스 코드 (CodeBlock, C언어 하이라이팅)
7. 시스템 콜 전체 흐름 — 단계별 애니메이션 (AnimatedDiagram)

---

### Topic 02 — 프로세스, 스레드, 스케줄러

**시각화 도구:** D3

**계획:**
- task_struct 필드 심층 탐색
- CFS Red-Black 트리 인터랙티브 시각화
- 컨텍스트 스위치 단계별 애니메이션 (AnimatedDiagram)
- `sched_entity`와 `vruntime` 비교 그래프
- 관련 커널 파라미터 (CFS sysctl 파라미터 표 + 확인 명령어)

---

### Topic 03 — 가상 메모리와 메모리 관리

**시각화 도구:** D3

**계획:**
- 가상→물리 주소 변환 단계 애니메이션
- 4단계 페이지 테이블 워크 시각화
- Buddy Allocator 블록 분할/합병 인터랙티브
- SLUB 캐시 구조 다이어그램
- 관련 커널 파라미터 (vm.* sysctl 파라미터 표 + 확인 명령어)

---

### Topic 04 — VFS와 파일시스템

**시각화 도구:** D3

**섹션 구성:**
- VFS 계층 구조 다이어그램
- open() 흐름 단계별 애니메이션
- 페이지 캐시 구조
- ext4 저널링 메커니즘
- 블록 I/O 경로
- 대표 파일시스템 비교
- 리눅스 파일 종류와 권한 (7종 파일 타입, mode bits, 특수 비트, setuid 보안)

---

### Topic 05 — 인터럽트, 예외, Deferred Work

**시각화 도구:** D3

**계획:**
- IRQ 처리 흐름 DAG
- Top Half vs Bottom Half 타임라인 비교
- Softirq / Tasklet / Workqueue 비교 표 + 다이어그램
- 관련 커널 파라미터 (IRQ 친화도, softlockup, NAPI budget 파라미터 표 + 확인 명령어)

---

### Topic 06 — 네트워크 스택의 전체 흐름

**시각화 도구:** D3

**계획:**
- 레이어 스택 (NIC → NAPI → sk_buff → L2 → L3 → L4 → Socket)
- 패킷이 각 레이어를 통과하는 애니메이션
- sk_buff 구조체 시각화

---

### Topic 07 — 패킷 처리 경로와 후킹 지점

**시각화 도구:** D3

**계획:**
- Netfilter 5개 훅 포인트 흐름도 (PREROUTING/INPUT/FORWARD/OUTPUT/POSTROUTING)
- D3 Sankey 다이어그램으로 패킷 경로
- iptables 규칙 적용 순서 시뮬레이션
- iptables Table × Chain 매트릭스 (raw/mangle/nat/filter)
- NAT 종류 (SNAT/DNAT/MASQUERADE) 설명 및 명령어 예제

---

### Topic 08 — XDP, eBPF, 고성능 패킷 처리

**시각화 도구:** D3

**계획:**
- XDP vs 일반 네트워크 스택 경로 비교
- eBPF 실행 모델 (verifier → JIT → 실행)
- BPF 맵 구조 시각화

---

### Topic 09 — 동기화와 멀티코어 환경

**시각화 도구:** D3

**계획:**
- Race Condition 시뮬레이션 (2 CPU 타임라인)
- Lock 유형 비교 (Spinlock/Mutex/RWLock/RCU)
- RCU read-copy-update 메커니즘 애니메이션

---

### Topic 10 — 디바이스 드라이버와 커널 모듈

**시각화 도구:** D3

**계획:**
- 드라이버 모델 계층 트리
- 모듈 로드/언로드 흐름
- DMA 전송 메커니즘 시각화

---

### Topic 11 — 성능 분석과 디버깅

**시각화 도구:** D3

**계획:**
- `/proc` 파일 시스템 트리 탐색기
- Oops/Panic 메시지 해부 (인터랙티브 주석)
- perf/ftrace 출력 시각화

---

### Topic 12 — Linux 보안 모델

**시각화 도구:** D3

**섹션 구성:**
- DAC (임의적 접근 제어) 구조
- Capabilities 권한 분리
- LSM 프레임워크 (AppArmor, SELinux)
