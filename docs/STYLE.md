# kernel-study — 페이지 스타일 가이드

> 모든 Topic 페이지는 아래 규칙을 일관되게 따릅니다.
> 새 페이지 작성 및 기존 페이지 수정 시 이 문서를 기준으로 합니다.

---

## 1. 파일 구조 규칙

- 각 Topic 페이지는 `src/pages/topic{NN}-{slug}/index.tsx` 위치에 위치합니다.
- 파일 최상단에는 **코드 상수(문자열)**를 먼저 선언하고, 그 다음에 **헬퍼 컴포넌트**, 마지막에 **default export 페이지 컴포넌트**를 배치합니다.

```
파일 순서:
  1. import 문
  2. 코드 상수 (const xxxCode = `...`)
  3. 파일 내부 헬퍼 컴포넌트 (Section, Prose, InfoTable 등)
  4. export default function TopicXX() { ... }
```

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

## 4. 섹션 헬퍼 컴포넌트

모든 페이지에서 아래 `Section` 함수를 **파일 내부에 선언**하여 사용합니다.

```tsx
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section id={id} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                {title}
            </h2>
            {children}
        </section>
    )
}
```

**규칙:**
- 섹션 제목은 `Section` 컴포넌트의 `title` prop으로 전달
- 섹션 번호는 title 문자열 안에 포함: `"1.1  커널이 하는 일"` (공백 2칸 사용)
- 섹션 번호의 별도 색상 span 태그는 사용하지 않음 (번호 포함 텍스트 전체가 h2)
- `id` 속성: `s{NN}{M}` 형식 (예: Topic 1의 1번째 섹션 = `s111`, Topic 12의 3번째 = `s123`)
- 직접 `<section>` 태그와 `<h2>` 태그를 분리해서 쓰는 방식 금지

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

| 용도 | 클래스 |
|------|--------|
| 토픽 번호 레이블 | `text-blue-500 dark:text-blue-400` |
| 섹션 h2 제목 | `text-gray-900 dark:text-white` |
| 설명 텍스트 | `text-gray-600 dark:text-gray-400` |
| 부제목 / 메타 | `text-gray-500 dark:text-gray-400` |
| 인라인 코드 | `text-blue-600 dark:text-blue-300` |
| 카드 보더 (중립) | `border-gray-200 dark:border-gray-700` |
| 강조 텍스트 | `text-gray-800 dark:text-gray-200` (bold) |

- D3 다이어그램의 노드/링크 색상은 `src/lib/colors.ts`의 oklch 팔레트를 따릅니다.
- 카드 컴포넌트의 accent 색상은 인라인 `style={{ borderColor: color + '55' }}` 방식을 허용합니다.

---

## 7. 하단 네비게이션

### 중간 페이지 (이전 ↔ 다음이 모두 있는 경우)

```tsx
<nav className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between">
    <div>
        <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">이전 토픽</div>
        <div className="font-semibold text-gray-900 dark:text-gray-200 text-sm">{NN} · {이전 제목}</div>
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{이전 부제}</div>
    </div>
    <div className="flex flex-col items-end gap-1">
        <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">다음 토픽</div>
        <div className="font-semibold text-gray-900 dark:text-gray-200 text-sm">{NN} · {다음 제목}</div>
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{다음 부제}</div>
    </div>
</nav>
```

단, 이전 또는 다음이 없는 경우 해당 측 텍스트를 생략합니다.

### 마지막 페이지 (현재 Topic 10~13)

```tsx
<div className="rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-8 text-center space-y-4">
    <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {학습 완료 제목}
    </div>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm max-w-2xl mx-auto">
        {요약 설명}
    </p>
    <a
        href="#/"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
    >
        <span>←</span> 홈으로 돌아가기
    </a>
</div>
```

- `footer`, `section` 태그로 네비를 감싸지 않습니다.
- 텍스트 링크 단독 사용(`hover:underline` 방식) 금지.

---

## 8. 적용 현황

| Topic | 헤더 | Section 함수 | 하단 네비 | 적합 여부 |
|-------|------|-------------|---------|---------|
| 01 | ⬜ 수정 필요 | ⬜ 미적용 | ⬜ 수정 필요 | ❌ |
| 02 | ⬜ 수정 필요 | ⬜ 미적용 | ⬜ 수정 필요 | ❌ |
| 03 | ⬜ 수정 필요 | ⬜ 미적용 | ⬜ 수정 필요 | ❌ |
| 04 | ⬜ 수정 필요 | ⬜ 미적용 | ⬜ 수정 필요 | ❌ |
| 05 | ⬜ 수정 필요 | ⬜ 미적용 | ⬜ 수정 필요 | ❌ |
| 06 | ⬜ 수정 필요 | ⬜ 미적용 | ⬜ 수정 필요 | ❌ |
| 07 | ⬜ 수정 필요 | ⬜ 미적용 | ⬜ 수정 필요 | ❌ |
| 08 | ⬜ 수정 필요 | ⬜ 미적용 | ⬜ 수정 필요 | ❌ |
| 09 | ⬜ 수정 필요 | ✅ 적용 | ⬜ 수정 필요 | ⚠️ |
| 10 | ⬜ 수정 필요 | ✅ 적용 | ✅ 완료 카드 | ⚠️ |
| 11 | ⬜ 수정 필요 | ✅ 적용 | ✅ 완료 카드 | ⚠️ |
| 12 | ⬜ 수정 필요 | ✅ 적용 | ✅ 완료 카드 | ⚠️ |
| 13 | ⬜ 수정 필요 | ✅ 적용 | ✅ 완료 카드 | ⚠️ |

> 수정 계획: Sprint 9 일괄 적용 예정 (2026-03-21 16:02 KST)
