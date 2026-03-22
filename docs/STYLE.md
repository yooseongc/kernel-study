# kernel-study — 페이지 스타일 가이드

> 모든 Topic 페이지는 아래 규칙을 일관되게 따릅니다.
> 새 페이지 작성 및 기존 페이지 수정 시 이 문서를 기준으로 합니다.

---

## 1. 파일 구조 규칙

각 Topic 페이지는 아래 구조를 따릅니다:

```
src/pages/topic{NN}-{slug}/
├── index.tsx          ← 페이지 컴포넌트 (조합 레이어, 목표 800줄 이하)
├── codeSnippets.ts    ← 코드 문자열/차트 상수 (export const xxxCode = `...`)
└── chartData.ts       ← (선택) Mermaid 차트/테이블 데이터 상수
```

**index.tsx 파일 순서:**
```
1. import 문 (공통 컴포넌트 + codeSnippets + concepts)
2. 인라인 데이터 (배열/객체 — steps, rows 등)
3. export default function TopicXX() { ... }
```

**추출 규칙:**
- 코드 문자열 (`const xxxCode = \`...\``) → `codeSnippets.ts`
- Mermaid 차트/테이블 데이터 → `chartData.ts`
- 50줄 이상 D3/React 시각화 → `src/components/concepts/{category}/`

---

## 2. 페이지 최상단 래퍼

```tsx
<div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
  ...
</div>
```

- `max-w-4xl` : 최대 너비 고정
- `px-6 py-10` : 좌우 1.5rem, 상하 2.5rem 패딩
- `space-y-14` : 섹션 간 세로 간격 3.5rem (56px) — 모든 페이지 동일

---

## 3. 페이지 헤더 (최상단)

**반드시 `<header>` 태그를 사용합니다.**

```tsx
<header className="space-y-3">
    <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
        Topic {NN}
    </p>
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        {한국어 제목}
    </h1>
    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
        {영문 부제목 (subtitle)}
    </p>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
        {1~3줄 설명}
    </p>
</header>
```

**규칙:**
- 토픽 번호: `Topic XX` 형식, 파란색 mono, uppercase tracking (인라인 큰 숫자 배지 금지)
- h1은 페이지당 하나만 존재
- 부제목(영문)은 `font-mono` + `text-gray-500 dark:text-gray-400` + `text-sm`
- 페이지 내부 TOC(목차)는 삽입하지 않음 (사이드바 네비게이션이 목차 역할)

---

## 4. 공통 UI 컴포넌트 (`src/components/ui/`)

**모든 컴포넌트는 라이트/다크 모드를 모두 지원합니다. 인라인 색상 하드코딩 금지.**

### 필수 사용 컴포넌트

| 컴포넌트 | import 경로 | 용도 |
|----------|-------------|------|
| `Section` | `../../components/ui/Section` | 모든 섹션 래퍼 (id + title) |
| `Prose` | `../../components/ui/Prose` | 본문 단락 텍스트 |
| `InfoTable` | `../../components/ui/InfoTable` | 비교/참조 테이블 |
| `InfoBox` | `../../components/ui/InfoBox` | 색상 배경 설명 박스 (10+ 색상 지원) |
| `StatCard` | `../../components/ui/StatCard` | 수치 카드 (title + value + desc) |
| `Alert` | `../../components/ui/Alert` | 팁(💡)/경고(⚠️)/정보(ℹ️)/위험(🚨) |
| `TopicNavigation` | `../../components/ui/TopicNavigation` | 이전/다음 토픽 (자동 계산) |
| `LearningCard` | `../../components/ui/LearningCard` | 토픽 상단 학습 목표 카드 |
| `KernelRef` | `../../components/ui/KernelRef` | 커널 소스 외부 링크 배지 |

### 사용 규칙

**색상 배경 박스 → `InfoBox` 사용:**
```tsx
// ❌ 금지: 인라인 다크모드 전용 색상
<div className="bg-blue-900/20 border-blue-800 text-blue-200">...</div>

// ✅ 올바른 사용:
<InfoBox color="blue" title="제목">설명 텍스트</InfoBox>
```

**수치/성능 카드 → `StatCard` 사용:**
```tsx
<StatCard title="syscall 비용" value="~100 ns" color="amber" desc="설명..." />
```

**팁/경고 박스 → `Alert` 사용:**
```tsx
<Alert variant="tip" title="핵심:">중요한 내용</Alert>
```

**하단 네비게이션 → `TopicNavigation` 사용:**
```tsx
<TopicNavigation topicId="02-scheduler" />  // 이전/다음 자동 계산
```

### Section 규칙
- 섹션 번호는 title 안에 포함: `"1.1  커널이 하는 일"` (공백 2칸)
- `id`: `s{NN}{M}` 형식 (예: `s111`, `s123`)
- `<section>` + `<h2>` 직접 사용 금지 → 반드시 `Section` 컴포넌트 사용

---

## 5. 텍스트 헬퍼 컴포넌트

```tsx
function Prose({ children }: { children: React.ReactNode }) {
    return <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{children}</p>
}
```

- 섹션 내 일반 설명 단락에 `<Prose>` 를 사용합니다.
- 인라인 코드는 아래 형식의 `<code>` 태그를 사용합니다.

```tsx
<code className="bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded text-xs font-mono">
    코드
</code>
```

---

## 6. 색상 규칙

### 반드시 `dark:` 프리픽스 사용

**모든 색상 클래스는 라이트 + 다크 모드 쌍으로 작성합니다.**

```tsx
// ❌ 금지: 다크모드 전용 색상 (dark: 프리픽스 없음)
className="bg-blue-900/20 text-blue-300 border-blue-800"

// ✅ 올바른 사용:
className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
```

### 기본 색상 팔레트

| 용도 | 라이트 | 다크 |
|------|--------|------|
| 토픽 번호 레이블 | `text-blue-500` | `dark:text-blue-400` |
| 섹션 h2 제목 | `text-gray-900` | `dark:text-white` |
| 설명 텍스트 | `text-gray-600` | `dark:text-gray-400` |
| 부제목 / 메타 | `text-gray-500` | `dark:text-gray-400` |
| 인라인 코드 | `text-blue-600` | `dark:text-blue-300` |
| 카드 보더 (중립) | `border-gray-200` | `dark:border-gray-700` |
| 카드 배경 (중립) | `bg-gray-50` | `dark:bg-gray-900` |
| 강조 텍스트 | `text-gray-800` | `dark:text-gray-200` |

### 색상 박스/카드는 컴포넌트 우선

인라인 색상 조합 대신 `InfoBox`, `StatCard`, `Alert` 컴포넌트를 사용하면 라이트/다크 모드가 자동으로 보장됩니다.

### D3 차트 색상

- `src/lib/colors.ts`의 oklch 팔레트를 사용합니다.
- SVG 내부에 `svg.style('background', ...)` 설정 금지 → 부모 div에서 배경 처리
- SVG font-family: 본문 `'Pretendard Variable', Pretendard, sans-serif`, 코드 `'JetBrains Mono', monospace`

---

## 7. 하단 네비게이션

**`TopicNavigation` 컴포넌트를 사용합니다.**

```tsx
<TopicNavigation topicId="02-scheduler" />
```

- `kernelTopics` 배열에서 이전/다음 토픽을 자동 계산합니다.
- 인라인 `<nav>` 태그 하드코딩 금지.

---

## 8. 개념 시각화 컴포넌트 (`src/components/concepts/`)

50줄 이상의 D3/React 시각화 컴포넌트는 토픽 파일에서 추출하여 개념별 디렉터리에 배치합니다:

```
src/components/concepts/
├── scheduler/    (ProcessStateDiagram, CfsTreeViz, ContextSwitchViz, ...)
├── memory/       (BuddyAllocatorViz, PageTableViz, CoWAnimationViz, ...)
├── network/      (NetworkLayerDiagram, SkbuffLayout, ...)
├── interrupt/    (IRQViz, DeferredWorkFlow)
├── ebpf/         (XdpVsNormalDiagram, EbpfPipelineDiagram)
├── sync/         (RaceConditionViz, LockComparisonChart, RcuGracePeriodViz)
├── driver/       (DriverTreeChart, DMAViz)
├── debug/        (FlameGraphViz, ProcTreeChart, NetworkBottleneckChart)
├── filesystem/   (OpenFlowViz, VfsLayerDiagram)
└── overview/     (RingDiagram, SyscallFlowViz, ...)
```

**규칙:**
- Section 래퍼(`<Section id=... title=...>`)는 index.tsx에 유지
- concept 컴포넌트는 순수 시각화만 export
- codeSnippets를 import하지 않음 (코드는 index.tsx에서 관리)
