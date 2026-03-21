# Kernel Study — 진행사항

> 마지막 업데이트: 2026-03-21 (Sprint 10)

## Sprint 1 — 골격 구축 ✅

| 작업 | 상태 |
|------|------|
| `pnpm create vite` 스캐폴딩 | ✅ |
| 의존성 설치 (D3, Three.js, Tailwind, React Router, Mermaid, Syntax Highlighter) | ✅ |
| `vite.config.ts` (base `/kernel-study/`, Tailwind 플러그인) | ✅ |
| `AppLayout` + `Sidebar` + `HashRouter` 라우팅 | ✅ |
| `Home` 페이지 (토픽 카드 그리드) | ✅ |
| 10개 토픽 페이지 (1개 완성 + 9개 플레이스홀더) | ✅ |
| `D3Container`, `MermaidDiagram`, `CodeBlock`, `AnimatedDiagram` 공통 컴포넌트 | ✅ |
| `useD3`, `useThree`, `useAnimationStep` 훅 | ✅ |
| `.github/workflows/deploy.yml` GitHub Actions | ✅ |
| `docs/PAGES.md`, `docs/PROCESS.md` 초기 작성 | ✅ |
| Topic 01 실질적 콘텐츠 구현 | ✅ |

## Sprint 1.5 — UI 강화 ✅

| 작업 | 상태 |
|------|------|
| Tailwind dark mode (class-based) + `@custom-variant dark` | ✅ |
| `ThemeContext` + `ThemeProvider` (localStorage 영속) | ✅ |
| 사이드바 테마 토글 버튼 (sun/moon 아이콘) | ✅ |
| `SearchModal` 컴포넌트 (Cmd+K 단축키, 토픽 + 용어 검색) | ✅ |
| `glossary.ts` 데이터 (핵심 용어 36개) | ✅ |
| `Glossary` 페이지 (`/#/glossary`, 가나다순, 카테고리 배지) | ✅ |
| `MermaidDiagram` 테마 인식 (dark/light 전환 시 재렌더) | ✅ |
| 전체 페이지 dark/light 색상 클래스 적용 | ✅ |
| Home 페이지에서 vizType 배지 제거 | ✅ |
| 사이드바에 용어 사전 링크 추가 | ✅ |

**설치된 라이브러리:**
- React 19 + TypeScript
- Vite 8 + @tailwindcss/vite
- react-router-dom 7 (HashRouter)
- d3 7 + @types/d3
- three 0.183 + @types/three
- mermaid 11
- react-syntax-highlighter + @types

---

## Sprint 2 — Topic 01 완성 + Topic 02 구현

| 작업 | 상태 |
|------|------|
| Topic 01 추가 섹션 (시스템 콜 흐름 애니메이션) | ✅ |
| Topic 04 — 인터럽트/예외/IRQ 흐름/Deferred Work/hrtimer 전체 구현 | ✅ |
| Topic 02 — 전체 구현 (프로세스/스레드/CFS/컨텍스트스위치) | ✅ |
| Topic 02 — CFS Red-Black 트리 D3 시각화 | ✅ |
| Topic 02 — 컨텍스트 스위치 단계별 애니메이션 | ✅ |
| Topic 02 — 프로세스 상태 전이 D3 다이어그램 (Mermaid 대체) | ✅ |
| Topic 02 — CPU Affinity, SMP/NUMA, RT 스케줄러 섹션 추가 | ✅ |
| Topic 02 — 2.9 cgroups 개요 + CPU 서브시스템 (v1/v2, task_struct 연결, 컨테이너 관계) | ✅ |
| Topic 03 — memory cgroup (memory.limit, OOM killer) 섹션 | ✅ |
| Topic 05/06 — net_cls / TC+cgroup 언급 | ✅ |
| Topic 03 — 전체 구현 (가상주소, 페이지테이블, mm_struct, Page Fault, Buddy, SLUB, memory cgroup) | ✅ |

---

## Sprint 3 — 네트워크 스택 (예정)

| 작업 | 상태 |
|------|------|
| Topic 05 — 네트워크 스택 전체 구현 (레이어 D3, NAPI, sk_buff, L2~L4, 소켓, net_cls) | ✅ |
| Topic 06 — Netfilter 5훅 D3, iptables/nftables, conntrack, TPROXY, TC Hook | ✅ |
| Topic 07 — XDP vs 일반경로 D3, eBPF VM/verifier/맵, DDoS 예제, 실무 사례 | ✅ |

---

## Sprint 4 — 마무리 (예정)

| 작업 | 상태 |
|------|------|
| Topic 08 — Race Condition, Spinlock, Mutex, RWLock, Atomic, RCU, 멀티코어 네트워크 | ✅ |
| Topic 09 — 커널 모듈, 문자/블록/네트워크 드라이버, NIC+DMA, net_device_ops, 드라이버 트리 D3 | ✅ |
| Topic 10 — /proc/sys D3 트리, dmesg, Oops/Panic, perf/ftrace, 네트워크 병목 분석 | ✅ |
| 모바일 반응형 — 사이드바 드로어, 모바일 상단 바 | ✅ |
| GitHub Pages 배포 검증 | ✅ |

---

## Sprint 5 — 콘텐츠 개선 (중요도 순)

### 🔴 높음

| 작업 | 상태 |
|------|------|
| Topic 05 — TX 경로 추가 (socket → L4 → L3 → L2 → 드라이버, TSO/GSO, RPS/RFS) | ✅ |
| Topic 03 — TLB 설명 추가 (페이지 테이블 워크 직후, TLB miss/flush/shootdown) | ✅ |
| Topic 04 — Threaded IRQ 추가 (request_threaded_irq, 인터럽트 어피니티 튜닝) | ✅ |

### 🟡 중간

| 작업 | 상태 |
|------|------|
| Topic 01 — syscall 흐름 애니메이션 (유저→glibc→syscall 진입→핸들러→반환) | ✅ |
| Topic 02 — nice/priority/weight 관계 + CFS weight 수식, O(1)→CFS 전환 역사, `__schedule()` 콜스택 | ✅ |
| Topic 03 — mmap() 익명/파일 매핑 차이, OOM killer oom_score_adj 동작 | ✅ |
| Topic 06 — iptables 규칙 문법 예시, nf_conntrack 튜닝, ipset 연동 | ✅ |
| Topic 07 — BTF/CO-RE, libbpf/bpftool, kprobe·tracepoint BPF, bcc tools | ✅ |
| Topic 08 — seqlock, 메모리 배리어(smp_mb/rmb/wmb), rwsem vs RWLock, futex | ✅ |

### 🟢 낮음

| 작업 | 상태 |
|------|------|
| Topic 04 — PREEMPT_RT 패치와 인터럽트 관계 | ✅ |
| Topic 09 — platform driver + device tree, major/minor number, ioctl/mmap, probe/remove | ✅ |
| Topic 10 — kdump/crash utility, bcc tools 실전, container 디버깅, /proc/net/ 파일 활용 | ✅ |

---

## Sprint 6 — 심화 콘텐츠 (예정)

### 🔴 높음

| 작업 | 상태 |
|------|------|
| Topic 03 — Huge Pages / THP (2MB·1GB 페이지, TLB pressure, DB 최적화) | ✅ |
| Topic 03 — kswapd + LRU 메모리 회수 (Active/Inactive 리스트, 스왑) | ✅ |
| Topic 03 — vmalloc vs kmalloc 비교 (물리 연속 vs 가상 연속) | ✅ |
| Topic 08 — Wait Queue (wait_event_interruptible / wake_up 패턴) | ✅ |
| Topic 08 — Completion (init_completion / wait_for_completion / complete) | ✅ |
| Topic 08 — 섹션 번호 정리 (8.4-a/b, 8.5-a → 순차 번호) | ✅ |
| Topic 10 — lockdep (잠금 순서 검증, 데드락 감지) | ✅ |
| Topic 10 — KASAN (use-after-free, out-of-bounds 메모리 버그 탐지) | ✅ |

### 🟡 중간

| 작업 | 상태 |
|------|------|
| Topic 05 — Zero-copy sendfile / splice (Nginx 최적화 원리) | ✅ |
| Topic 05 — SO_REUSEPORT + 네트워크 네임스페이스 (컨테이너 격리 기반) | ✅ |
| Topic 07 — AF_XDP (유저공간 패킷 처리, UMEM, xsk_socket) | ✅ |
| Topic 07 — seccomp-BPF (시스템 콜 필터링, Docker/K8s 보안) | ✅ |
| Topic 09 — PCI/PCIe 드라이버 모델 (pci_driver, BAR 매핑) | ✅ |
| Topic 02 — 스케줄러 통계 (/proc/schedstat, /proc/sched_debug, load_balance) | ✅ |

### 🟢 낮음

| 작업 | 상태 |
|------|------|
| 신규 Topic 11 — VFS / 파일시스템 계층 (open()→VFS→ext4→블록 레이어, 페이지 캐시) | ✅ |
| 신규 Topic 12 — LSM / 보안 모듈 (Capabilities, AppArmor, SELinux, seccomp) | ✅ |
| Topic 05 — io_uring 상세 (링 버퍼 구조, SQPOLL, epoll 대비 zero syscall) | ✅ |
| Topic 08 — 섹션 번호 정리 (8.4-a/b, 8.5-a → 순차 번호) | ✅ |

---

## Sprint 8 — 섹션 번호 수정 + UX (2026-03-21)

### 🔴 높음
| 작업 | 상태 |
|------|------|
| Topic 04~11 섹션 번호 구번호 → 신번호로 수정 (11.x→4.x, 4.x→5.x, 5.x→6.x, 6.x→7.x, 7.x→8.x, 8.x→9.x, 9.x→10.x, 10.x→11.x) | ✅ |
| 사이드바 너비 w-64 → w-72 확장 | ✅ |
| 페이지 이동 시 스크롤 최상단 복귀 | ✅ |
| 각 페이지 하단 "위로 가기" 버튼 추가 | ✅ |
| 좌측/우측 패널 숨김·열기 토글 (localStorage 영속) | ✅ |

### 🟡 중간
| 작업 | 상태 |
|------|------|
| Topic 01 — 커널 소스 트리 구조 다이어그램 (arch/, net/, fs/, mm/ 등) | ✅ |
| Topic 04 — 블록 I/O 경로 섹션 (bio → request_queue → I/O 스케줄러, mq-deadline) | ✅ |
| Topic 12 — namespace와 보안 모델 연결 섹션 (user ns / mount ns 권한 격리) | ✅ |

### 🟢 낮음
| 작업 | 상태 |
|------|------|
| 신규 Topic 13 — KVM/가상화 (VMCS, EPT, virtio 드라이버) | ✅ |

---

## Sprint 7 — 인프라·UX 개선 (2026-03-21)

| 작업 | 상태 |
|------|------|
| Git 저장소 초기화 + `.gitignore` 설정 | ✅ |
| 목차 순서 재배치 — VFS를 Topic 04로 이동 (03 메모리 직후) | ✅ |
| `src/lib/colors.ts` — oklch 기반 통합 색상 팔레트 생성 | ✅ |
| 전체 D3 차트 oklch 색상으로 교체 (topic01~10) | ✅ |
| 라이트모드 D3 텍스트 가시성 수정 (topic01 renderSubsystemGraph 등) | ✅ |
| 커스텀 스크롤바 (얇은 둥근 형태, 라이트/다크 모드 대응) | ✅ |
| 사이드바 줌시 nav 독립 스크롤 구조 (header/footer 고정) | ✅ |
| ESLint indent 룰 추가 (space 4) + `--fix` 전체 적용 | ✅ |

---

## Sprint 9 — 스타일 일관화 (2026-03-21 16:02 KST 예정)

### 기준 문서: `docs/STYLE.md`

| 작업 | 상태 |
|------|------|
| `docs/STYLE.md` 작성 — 페이지 스타일 표준 정의 | ✅ |
| Topic 01~08 — Section 함수 도입 (직접 section/h2 → Section 컴포넌트) | ✅ |
| Topic 01~13 — 헤더 표준화 (`<header>` 태그, `Topic XX` 레이블, h1/부제목/설명 형식) | ✅ |
| Topic 13 — 내부 TOC 제거 | ✅ |
| Topic 01~08 — 하단 네비게이션 표준화 (중간 페이지: 이전↔다음 카드형) | ✅ |
| Topic 09~12 — 하단 네비게이션 표준화 (중간 페이지: 이전↔다음 카드형, 완료 카드는 13만 유지) | ✅ |
| 전체 wrapper `space-y-14` 통일 (Topic 12 space-y-12 → 14) | ✅ |

---

## Sprint 10 — 차트·콘텐츠 버그 수정 (2026-03-21)

| 작업 | 상태 |
|------|------|
| Topic 02 §2.10 — SMT/MC 카드 긴 경로 문자열 오버플로우 수정 (`break-all`) | ✅ |
| Topic 03 §3.2 — PageTableWalkViz `Physical` 레이블 색상 개선 | ✅ |
| Topic 03 §3.2 — VA 48비트 분해 시각화 (`VABitBreakdown`) 추가 — 실제 비트값 표시 | ✅ |
| Topic 03 §3.2 — `vaFields` PMD/PTE 값 오류 수정 (0x1EF→0xF5, 0x0AD→0xDB) | ✅ |
| Topic 03 §3.2 — CR3/PGD/PUD/PMD/PTE/Offset 각 용어 설명 카드 추가 | ✅ |
| Topic 03 §3.4 — MMU/CR2/PTE.Present 핵심 용어 카드 추가 | ✅ |
| Topic 03 §3.5 — Buddy Allocator 역할 설명 보강 | ✅ |
| Topic 03 §3.6 — SLUB D3 레이아웃 수정: slab(좌 52%)·kmalloc table(우) 공간 분리 | ✅ |
| Topic 03 §3.9 — pages_min Direct Reclaim 동작 설명 callout 추가 | ✅ |
| Topic 03 §3.1 — 프로세스별 VA 공간 격리 시각화 (MultiProcessVAViz) 추가 | ✅ |
| Topic 03 §3.1 — "같은 VA 다른 PA" 구체적 예시(nginx/python/bash) 및 핵심 설명 카드 추가 | ✅ |
| topic03/04 — 미사용 Prose 컴포넌트 제거 (TS 빌드 오류) | ✅ |

---

## 기술 결정 로그

| 날짜 | 결정 | 이유 |
|------|------|------|
| 2026-03-21 | HashRouter 선택 | GitHub Pages는 서버 사이드 라우팅 불가 |
| 2026-03-21 | Tailwind CSS v4 (@tailwindcss/vite) | Vite 플러그인 방식, PostCSS 설정 불필요 |
| 2026-03-21 | Mermaid.js 추가 | 다이어그램을 코드로 관리, 쉬운 수정 |
| 2026-03-21 | react-syntax-highlighter 추가 | 실제 커널 소스 코드 제시로 학습 효과 향상 |
| 2026-03-21 | Topic 05에만 Three.js | 네트워크 스택이 3D 레이어 표현에 가장 적합 |
| 2026-03-21 | class-based dark mode (@custom-variant) | Tailwind v4에서 HTML 클래스 기반 다크모드 활성화 |
| 2026-03-21 | ThemeContext + localStorage | 페이지 새로고침 후에도 테마 유지, 기본값은 dark |
| 2026-03-21 | SearchModal (Cmd+K) | 토픽과 용어를 한 번에 검색하는 빠른 접근 방법 |
| 2026-03-21 | oklch 색상 모델 도입 (src/lib/colors.ts) | 지각적 균일성, 라이트/다크 페어 일관성 확보 |
| 2026-03-21 | Topic 04 = VFS (기존 11) | 메모리 관리 직후 배치 — 페이지 캐시 연계 학습 흐름 |
