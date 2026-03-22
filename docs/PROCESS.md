# Kernel Study — 진행사항

> 마지막 업데이트: 2026-03-22 (Sprint 48)

---

## 완료 스프린트 요약

| Sprint | 내용 | 완료일 |
|--------|------|--------|
| 48 | 커널 선생님 리뷰 기반 재정렬 — Topic 02 Run Queue 섹션 추가, Topic 09 학습 순서 재정렬 (Wait Queue/Completion 앞으로, RCU Grace Period→RCU 뒤로), Topic 11 lockdep/KASAN 기본+심화 통합, Flame Graph→perf 뒤로, 응용 섹션 후반 배치 | 2026-03-22 |
| 47 | 콘텐츠 개선 Phase 3 — Topic 11 확장 (KASAN 심화/lockdep 심화/bpftool), Topic 10 확장 (IOMMU/전력관리), Topic 09 futex 심화, Topic 03 memory ordering/zswap·zram, Topic 12 cgroup v2/namespace 심화, Topic 01 Kconfig/커널 빌드 과정 | 2026-03-22 |
| 46 | 콘텐츠 개선 Phase 2 — "관련 커널 소스" 요약 박스 (topic02/03/06/09 핵심 섹션에 InfoBox+KernelRef 집합), KernelRef 미사용 8개 토픽에 소스 링크 추가 (topic01/04/05/07/10/11/12/13) | 2026-03-22 |
| 45 | 콘텐츠 개선 Phase 1 — KernelRef URL 버그 수정 (#L→/C/ident/), glossary 15개 용어 추가 (92개→), 전 13개 토픽 `<T>` 링크 감사·보강 (~40개 추가), 중복 `<T>` 제거 (topic04) | 2026-03-22 |
| 44 | Topic 01 §1.5 Mermaid→정적 JSX 카드 레이아웃 전환 (전체 계층 구조 4레이어), Topic 02 §2.9 CgroupTreeViz 노드 간격 확대 (separation 1.4/2, height 300→420, nodeW 104→114, nodeH 34→38) | 2026-03-22 |
| 43 | Topic 01 §1.9, Topic 11 §11.13, Topic 12 §12.8, Topic 13 §13.7 — "관련 커널 파라미터" 섹션 추가 (커널개요/디버깅/보안/KVM sysctl·모듈 파라미터 InfoTable + 확인 명령어 CodeBlock) | 2026-03-22 |
| 42 | Topic 04 §4.8, Topic 08 §8.13, Topic 10 §10.11 — "관련 커널 파라미터" 섹션 추가 (파일시스템/XDP·eBPF/드라이버 sysctl 파라미터 InfoTable + 확인 명령어 CodeBlock) | 2026-03-22 |
| 41 | Topic 06 §6.14, Topic 07 §7.10, Topic 09 §9.15 — "관련 커널 파라미터" 섹션 추가 (네트워크 스택/넷필터/동기화 sysctl 파라미터 InfoTable + 확인 명령어 CodeBlock) | 2026-03-22 |
| 40 | Topic 02 §2.12, Topic 03 §3.13, Topic 05 §5.10 — "관련 커널 파라미터" 섹션 추가 (CFS/메모리/인터럽트 sysctl 파라미터 InfoTable + 확인 명령어 CodeBlock) | 2026-03-22 |
| 39 | Topic 06 §6.1 패킷 수신 과정 시각화 개선: 7단계 상세 설명 추가, NetworkLayerDiagram에 단계별 한글 레이블 삽입, NAPI 핵심 포인트 InfoBox 추가, 다이어그램 높이 확대(340→420px) | 2026-03-22 |
| 38 | Topic 04 §4.7 리눅스 파일 종류와 권한 (7종 파일 타입 InfoTable, mode bits/8진수/특수비트 설명, 실전 명령어, setuid 보안 Alert), Topic 09 GlossaryTooltip 보강 (spinlock/mutex/rcu/atomic 첫 등장에 `<T>` 추가) | 2026-03-22 |
| 37 | Topic 07 §7.4.1 iptables Table×Chain 매트릭스 (raw/mangle/nat/filter × 5 chains, 처리 우선순위), §7.4.2 NAT 설명 (SNAT/DNAT/MASQUERADE, 명령어 예제, conntrack 역변환) 추가 | 2026-03-22 |
| 36 | XDP vs Normal D3 차트 깨짐 수정 (height 260→380, stepY에 최소 간격 보장), topic06 라이트모드 잔여 이슈 수정 (테이블·카드·인라인코드·링버퍼 시각화 등 약 40곳에 `dark:` 프리픽스 추가) | 2026-03-22 |
| 35 | 다크모드 전용 색상 수정: `dark:` 프리픽스 없이 사용된 Tailwind 클래스에 라이트모드 대응 추가 (VirtualAddressViz, NapiCompare, SkbuffLayout, IRQViz, DMAViz, NetworkFlowViz, TxFlowViz, SyscallFlowViz, CoWAnimationViz, NetworkLayerDiagram — 10개 파일) | 2026-03-22 |
| 25 | CodeBlock 복사 버튼, 홈 문구 수정, README 버전 동기화 (Vite 8, Three.js 0.183), TOC "이 페이지" 한국어 통일 | 2026-03-22 |
| 26 | 토픽 메타데이터 확장 (status/difficulty/prerequisites), 홈 카드 난이도 배지 + 선수 지식, 검색 가중치·그룹화·섹션 검색 추가, 용어사전 카테고리 필터 칩 + 내부 검색 | 2026-03-22 |
| 27 | KernelRef 컴포넌트 (elixir.bootlin.com 링크), LearningCard 컴포넌트 (학습 목표 3줄 + 선수지식 링크) 신규 생성, 전체 13개 토픽 적용, topic02/03/06/08/09에 KernelRef 삽입 | 2026-03-22 |
| 28 | 개념 지도 페이지 (`/#/graph`) — D3 force-directed 그래프, 토픽 13개+용어 57개 노드, 공통태그/topicRef 엣지, 줌/팬/드래그, 카테고리 필터, Sidebar "개념 지도" 메뉴 추가 | 2026-03-22 |
| 29 | 리팩터링 — TopicNavigation/InfoBox/Alert 공통 컴포넌트 추출, 13개 토픽 nav 교체, topic02/03/06 codeSnippets.ts 분리 (총 ~880줄 감소), 그래프 노드 레이블 상시 표시 | 2026-03-22 |
| 30 | 리팩터링 — topic02-scheduler/index.tsx (1518줄→830줄) 시각화 컴포넌트 추출: ProcessStateDiagram(123줄), CfsTreeViz(300줄, 상태 내부화), ContextSwitchViz(133줄), CgroupTreeViz(146줄) → `src/components/concepts/scheduler/` | 2026-03-22 |
| 31 | 리팩터링 — topic04-filesystem/index.tsx (1047줄→885줄) OpenFlowViz(95줄), VfsLayerDiagram(68줄) 추출 → `src/components/concepts/filesystem/`; topic03-memory/index.tsx (1330줄→1194줄) renderSlubViz(141줄) 추출 → `src/components/concepts/memory/SlubViz.tsx` | 2026-03-22 |
| 32 | 리팩터링 — topic11(1206→770줄): 중복 인라인 코드→추출 컴포넌트 교체; topic09(1115→1025줄): RcuGracePeriodViz 추출; topic03(1194→1061줄): CoWAnimationViz 교체 | 2026-03-22 |
| 33 | 리팩터링 — topic08(1434→993줄) dead D3 코드 정리, topic05(1265→982줄) IRQViz+DeferredWorkFlow 추출, topic01(1102→432줄) SyscallFlowViz 등 4개 추출 + chartData.ts 분리; 그래프 노드 크기 확대(r: 32/12), 텍스트 확대, force 간격 확대, 높이 800px; lint 에러 전체 해소 | 2026-03-22 |
| 34 | topic04~13 codeSnippets.ts 분리 (9개 파일, 82개 상수, ~1,900줄 추출); 그래프 엣지 색상 밝게 (oklch 55% → 가시성 개선) + opacity 0.7/0.5 + stroke 굵게; force 노드 초기 배치 원형 분포 (급격한 이동 방지); Rolldown UTF-8 boundary 버그 우회 (manualChunks 'code-snippets') | 2026-03-22 |
| 1 | 프로젝트 골격 구축 (Vite+React+TS, 라우팅, 공통 컴포넌트, GitHub Actions 배포) | 2026-03-21 |
| 1.5 | UI 강화 (다크모드, 검색 모달, Glossary 페이지, 36개 용어 초기 데이터) | 2026-03-21 |
| 2 | Topic 01~03 콘텐츠 구현 (syscall 흐름, CFS/컨텍스트스위치 D3, 메모리 관리 전체) | 2026-03-21 |
| 3 | Topic 04~06 콘텐츠 구현 (인터럽트, 네트워크 스택, Netfilter, XDP/eBPF) | 2026-03-21 |
| 4 | Topic 07~10 콘텐츠 구현 (동기화, 드라이버, 디버깅/성능), 모바일 반응형, GitHub Pages 배포 | 2026-03-21 |
| 5 | 콘텐츠 개선: TX 경로, TLB, Threaded IRQ, CFS weight 수식, OOM killer, iptables 예시 등 | 2026-03-21 |
| 6 | 심화 콘텐츠: HugePage, kswapd, vmalloc, Wait Queue, Completion, seqlock, Topic 11~12 신규, Topic 13 KVM | 2026-03-21 |
| 7 | 인프라·UX: Git 초기화, oklch 색상 팔레트, 커스텀 스크롤바, 사이드바 줌 스크롤 | 2026-03-21 |
| 8 | 섹션 번호 재정렬, 사이드바 확장, 페이지 상단 복귀, 패널 토글, 커널 소스 트리 다이어그램 | 2026-03-21 |
| 9 | 스타일 일관화: Section 컴포넌트, 헤더/네비게이션 표준화, STYLE.md 작성 | 2026-03-21 |
| 10 | 차트·콘텐츠 버그 수정: CFS 오버플로우, 페이지테이블 비트값 오류, SLUB 레이아웃, MultiProcessVAViz 등 | 2026-03-21 |
| 11 | 콘텐츠 심화: CoW 애니메이션, SCHED_DEADLINE, RCU grace period 타임라인, PID namespace, bpftrace, flame graph, vhost, TCP CUBIC/BBR, conntrack helpers, IRQ coalescing, syscall 카탈로그, NUMA policy, 캐릭터 디바이스 생명주기 (Sprint 15~23으로 분리 실행) | 2026-03-21 |
| 12 | 인라인 GlossaryTooltip 시스템 (`<T id="">` 컴포넌트), Topic 01~13 전체 적용 | 2026-03-21 |
| 13 | 구조 정리: Section/Prose/InfoTable 컴포넌트 추출, Route lazy loading (번들 1.5MB→250KB), README 재작성 | 2026-03-21 |
| 13+ | React 품질 게이트: searchOpenRef useEffect 이전, ThemeContextDef 분리, ESLint 308 errors 해소 | 2026-03-21 |
| 14 | Topic 04 §4.6 대표 파일시스템 비교 (ext4/XFS/Btrfs/tmpfs/procfs/sysfs/overlayfs/NFS), 사이트 타이틀 수정 | 2026-03-21 |
| 15 | Topic 02 §2.11 SCHED_DEADLINE 섹션 (CBS 알고리즘, Admission Control, 코드 예제) | 2026-03-21 |
| 16 | Topic 04 §4.1 inode/dentry/file 시각화, §4.3 write-back 흐름 다이어그램 | 2026-03-21 |
| 17 | Topic 05 §5.9 IRQ Coalescing 섹션 (ethtool -C, NAPI 폴링 흐름, 트레이드오프 시각화) | 2026-03-21 |
| 18 | Topic 03 §3.11 CoW 3단계 애니메이션, §3.12 NUMA 메모리 정책 (토폴로지 다이어그램) | 2026-03-21 |
| 19 | Topic 07 §7.9 Conntrack Helpers (FTP/SIP ALG 원리, Helper 모듈 비교 표) | 2026-03-21 |
| 20 | Topic 08 §8.12 bpftrace 섹션 (프로브 유형 4종, 원라이너 6개, bcc/bpftool 비교) | 2026-03-21 |
| 21 | Topic 10 §10.10 캐릭터 디바이스 전체 생명주기 (module_init→module_exit 플로우, 최소 드라이버 예제) | 2026-03-21 |
| 22 | Topic 09 §9.14 RCU Grace Period 타임라인 (수평 SVG, rcu_read_lock/unlock 설명) | 2026-03-21 |
| 23 | Topic 01 §1.8 주요 syscall 카탈로그 (10종 비교 표, vDSO 경로, fork/clone/vfork 비교) | 2026-03-21 |
| 24 | glossary.ts 신규 용어 11개 추가: CoW, SCHED_DEADLINE, grace period, bpftrace, flame graph, vhost, write-back, overlayfs, PID namespace, CUBIC/BBR, IRQ coalescing | 2026-03-21 |

---

## 기술 스택

- React 19 + TypeScript + Vite 8
- Tailwind CSS v4 (dark mode class-based)
- react-router-dom 7 (HashRouter + lazy loading)
- D3 v7, Three.js 0.183, Mermaid 11
- react-syntax-highlighter
- GitHub Actions → GitHub Pages 배포

## 토픽 구성 (13개)

| Topic | 제목 | 주요 섹션 수 |
|-------|------|------------|
| 01 | 리눅스 커널 개요와 전체 구조 | 8 |
| 02 | 프로세스, 스레드, 스케줄러 | 11 |
| 03 | 가상 메모리와 메모리 관리 | 12 |
| 04 | VFS와 파일시스템 | 6 |
| 05 | 인터럽트, 예외, Deferred Work | 9 |
| 06 | 네트워크 스택의 전체 흐름 | 13+ |
| 07 | 패킷 처리 경로와 후킹 지점 | 9 |
| 08 | XDP, eBPF, 고성능 패킷 처리 | 12 |
| 09 | 동기화와 멀티코어 환경 | 14 |
| 10 | 디바이스 드라이버와 커널 모듈 | 10 |
| 11 | 성능 분석과 디버깅 | 10+ |
| 12 | 보안 모듈 (LSM, Capabilities, Namespace) | 6+ |
| 13 | KVM과 가상화 | 6 |

## 용어사전

`src/data/glossary.ts` — 57개 용어, 11개 카테고리 (process / memory / fs / interrupt / network / sync / driver / debug / security / virt / general)
