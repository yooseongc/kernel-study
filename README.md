# kernel-study

리눅스 커널의 핵심 동작을 인터랙티브 시각화로 배우는 학습 사이트입니다.
D3, Three.js, Mermaid 기반 다이어그램과 실제 커널 소스 코드를 함께 제공합니다.

**라이브 사이트:** https://yooseongc.github.io/kernel-study/

---

## 기술 스택

| 구분 | 사용 기술 |
|------|----------|
| 프레임워크 | React 19 + TypeScript |
| 번들러 | Vite 8 |
| 스타일링 | Tailwind CSS v4 |
| 라우팅 | React Router 7 (HashRouter) |
| 시각화 | D3 v7, Three.js 0.183, Mermaid 11 |
| 코드 하이라이팅 | react-syntax-highlighter |
| 배포 | GitHub Pages (GitHub Actions) |

---

## 로컬 개발

```bash
pnpm install
pnpm dev       # 개발 서버 (http://localhost:5173)
pnpm build     # 프로덕션 빌드
pnpm preview   # 빌드 결과 미리보기
pnpm lint      # ESLint 검사
```

---

## 프로젝트 구조

```
src/
├── pages/
│   ├── Home/                    # 홈 화면
│   ├── Glossary/                # 용어사전
│   └── topicXX-*/index.tsx      # 13개 토픽 페이지
├── components/
│   ├── layout/                  # AppLayout, Sidebar, TOC, BackToTop
│   ├── ui/                      # Section, Prose, InfoTable, GlossaryTooltip
│   └── viz/                     # D3Container, AnimatedDiagram, MermaidDiagram, CodeBlock
├── data/
│   ├── kernelTopics.ts          # 토픽 메타데이터
│   └── glossary.ts              # 용어사전 데이터 (64개 용어)
├── contexts/ThemeContext.tsx    # 다크/라이트 모드
├── hooks/                       # useD3, useThree, useAnimationStep
└── lib/colors.ts                # oklch 색상 팔레트
docs/
├── PAGES.md                     # 토픽별 콘텐츠 개요
├── PROCESS.md                   # 스프린트 진행 로그
└── STYLE.md                     # 코딩 컨벤션
```

---

## 토픽 목록

| # | 토픽 | 주요 내용 |
|---|------|----------|
| 01 | 커널 개요와 전체 구조 | 유저/커널 공간, 시스템 콜, 모노리식 구조 |
| 02 | 프로세스·스레드·스케줄러 | task_struct, CFS, 컨텍스트 스위치, cgroup |
| 03 | 가상 메모리와 메모리 관리 | 페이지 테이블, VMA, Buddy, SLUB, kswapd |
| 04 | 파일시스템과 VFS | VFS, inode, dentry, page cache, ext4 |
| 05 | 인터럽트·예외·Deferred Work | IRQ, softirq, tasklet, workqueue |
| 06 | 네트워크 스택 전체 흐름 | sk_buff, NAPI, L2/L3/L4 처리 |
| 07 | 패킷 처리와 Netfilter | Netfilter, iptables, conntrack, TPROXY |
| 08 | XDP, eBPF, 고성능 패킷 처리 | XDP, eBPF, kprobe, TC BPF |
| 09 | 동기화와 멀티코어 환경 | Spinlock, Mutex, RCU, atomic, seqlock |
| 10 | 디바이스 드라이버와 커널 모듈 | DMA, PCI, 문자/블록/네트워크 드라이버 |
| 11 | 성능 분석과 디버깅 | perf, ftrace, KASAN, lockdep, /proc |
| 12 | 보안 — LSM·네임스페이스·seccomp | LSM, AppArmor, SELinux, namespace, seccomp |
| 13 | KVM과 가상화 | KVM, VMCS, VMEXIT, EPT, virtio |

---

## 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 빌드 후 `gh-pages` 브랜치에 배포합니다.

`vite.config.ts`의 `base: '/kernel-study/'` 설정으로 GitHub Pages 서브패스에서 동작합니다.

---

## 문서

- [`docs/PAGES.md`](docs/PAGES.md) — 토픽별 콘텐츠 목차와 섹션 개요
- [`docs/PROCESS.md`](docs/PROCESS.md) — 스프린트별 작업 로그
- [`docs/STYLE.md`](docs/STYLE.md) — D3 시각화, Mermaid 사용 규칙, 다크모드 규칙
- [`CLAUDE.md`](CLAUDE.md) — AI 협업 규칙 및 프로젝트 가이드
