# CODEX Review

작성일: 2026-03-21

## 범위

- 프로젝트 구조, 공통 레이아웃, 데이터 모델, 대표 주제 페이지, 시각화 컴포넌트, 문서, 빌드/린트 상태를 기준으로 리뷰했다.
- 코드 수정은 하지 않았고, 현재 저장소 상태를 바탕으로 개선점을 정리했다.

## 한 줄 평가

`kernel-study`는 "리눅스 커널 학습용 인터랙티브 문서 사이트"라는 목표와 방향은 명확하다. 다만 현재는 콘텐츠 확장 속도가 구조 정리에 앞서가면서, 대형 단일 파일, React 19 규칙 위반, 문서/설정 불일치가 동시에 누적된 상태다.

## 프로젝트 파악

### 기술 스택

- Vite + React 19 + TypeScript
- React Router 7 (`HashRouter`)
- D3, Three.js, Mermaid, react-syntax-highlighter
- Tailwind CSS v4 스타일링

### 현재 구조

- 앱 엔트리와 라우팅은 [`src/App.tsx`](../src/App.tsx), [`src/main.tsx`](../src/main.tsx)에 집중되어 있다.
- 공통 레이아웃은 [`src/components/layout`](../src/components/layout)에 모여 있다.
- 주제 데이터는 [`src/data/kernelTopics.ts`](../src/data/kernelTopics.ts)에서 관리한다.
- 주요 콘텐츠는 `src/pages/topicXX-*/index.tsx` 단일 파일들에 직접 작성되어 있다.
- 공통 시각화 래퍼는 [`src/components/viz`](../src/components/viz)에 존재한다.
- 문서화는 [`docs/STYLE.md`](./STYLE.md), [`docs/PROCESS.md`](./PROCESS.md), [`docs/PAGES.md`](./PAGES.md)에 있으나 현재 상태와 어긋나는 부분이 있다.

### 확인한 상태

- `npm run build`: 성공
- `npm run lint`: 실패, 319건 문제 확인
  - 314 errors
  - 5 warnings

## 강점

- 주제와 사용자 경험 방향이 명확하다. 사이드바, 검색, 용어사전, TOC까지 학습형 사이트에 필요한 뼈대는 갖춰져 있다.
- D3, Mermaid, 코드 블록, 애니메이션 등 학습 표현 수단이 다양하다.
- 토픽 분할 자체는 되어 있어서 장기적으로는 모듈화할 기반이 있다.
- 빌드는 통과하므로 "완전히 무너진 상태"는 아니고, 구조 정리로 회복 가능한 단계다.

## 주요 문제와 개선점

### 1. 최우선: 주제 페이지가 지나치게 큰 단일 파일 구조

영향:

- 주제 하나를 수정할 때 시각화, 텍스트, 표, 코드 샘플, 보조 컴포넌트가 한 파일에 섞여 있어 변경 범위가 커진다.
- 동일한 패턴이 토픽마다 반복되어 버그 수정과 스타일 정합성 유지 비용이 높다.
- 리뷰와 테스트가 어렵다.

대표 규모:

- `topic03-memory`: 2016 lines
- `topic02-scheduler`: 1649 lines
- `topic06-network-stack`: 1543 lines
- `topic08-xdp-ebpf`: 1375 lines
- `topic09-synchronization`: 1282 lines

근거:

- [`src/pages/topic03-memory/index.tsx`](../src/pages/topic03-memory/index.tsx)
- [`src/pages/topic02-scheduler/index.tsx`](../src/pages/topic02-scheduler/index.tsx)
- [`src/pages/topic06-network-stack/index.tsx`](../src/pages/topic06-network-stack/index.tsx)

개선 제안:

- 각 topic을 최소한 아래 단위로 분리한다.
- `content.ts` 또는 `content/*.ts`: 코드 샘플, 표 데이터, step 데이터
- `components/*.tsx`: 주제 전용 시각화
- `sections/*.tsx`: 본문 섹션
- `index.tsx`: 페이지 조립만 담당
- `Section`, `Prose`, `InfoTable` 같은 반복 UI는 페이지마다 복붙하지 말고 공통 컴포넌트로 이동한다.

### 2. 최우선: React 19 / eslint 규칙과 실제 코드가 충돌하고 있음

영향:

- 현재 lint 실패의 핵심 원인이다.
- React Compiler/Hook 규칙을 사용하는데 코드 패턴은 그 규칙에 맞지 않는다.
- 단순 경고 수준이 아니라, 상태 관리와 렌더링 구조를 다시 정리해야 하는 항목이 포함되어 있다.

대표 사례:

- effect 내부 동기 `setState`
  - [`src/components/layout/AppLayout.tsx`](../src/components/layout/AppLayout.tsx)
  - [`src/components/search/SearchModal.tsx`](../src/components/search/SearchModal.tsx)
- render 중 컴포넌트 정의
  - [`src/pages/topic09-synchronization/index.tsx`](../src/pages/topic09-synchronization/index.tsx)
- 수동 memoization 의존성 불일치
  - [`src/pages/topic09-synchronization/index.tsx`](../src/pages/topic09-synchronization/index.tsx)
  - [`src/pages/topic10-drivers/index.tsx`](../src/pages/topic10-drivers/index.tsx)
  - [`src/pages/topic11-debugging/index.tsx`](../src/pages/topic11-debugging/index.tsx)
- 불필요한 표현식
  - [`src/components/ui/GlossaryTooltip.tsx`](../src/components/ui/GlossaryTooltip.tsx)

개선 제안:

- React 19 규칙을 유지할지, 현재 단계에서는 완화할지 먼저 결정해야 한다.
- 유지한다면:
  - effect 안 상태 초기화 패턴 제거
  - 렌더 함수 내부 컴포넌트 정의 제거
  - `useCallback`/수동 memoization 의존성 재정비
- 완화한다면:
  - 현재 팀이 실제로 지킬 수 있는 수준으로 eslint 설정을 낮춘다.
- 지금 상태에서는 "설정은 엄격한데 코드베이스는 그 기준을 따르지 못하는" 불일치가 가장 큰 문제다.

### 3. 높음: 빌드는 되지만 품질 게이트로서 lint가 사실상 무력화됨

영향:

- 빌드 성공만으로는 품질을 보장하지 못한다.
- 린트 에러가 너무 많아 새 문제와 기존 문제를 구분하기 어렵다.
- CI에 린트가 걸려 있어도 개발자가 신뢰하지 않게 된다.

근거:

- [`eslint.config.js`](../eslint.config.js)
- `npm run lint` 결과 319건

개선 제안:

- 1차 목표를 "lint 0"이 아니라 "치명 문제 우선 제거 + 새 문제 유입 차단"으로 잡는다.
- 기존 오류는 범주별로 나눠 순차 해소한다.
  - 인코딩/문자열
  - React hook/compiler 규칙
  - 포맷/indent
  - 사용하지 않는 변수
- CI에는 점진적 기준을 둔다. 예: 수정 파일만 엄격 적용.

### 4. 높음: 문서와 실제 코드 상태가 어긋남

영향:

- 신규 작업자가 문서를 보고 구조를 따라가기 어렵다.
- "표준 문서"가 있으나 실제 코드가 그 규칙을 지키지 않는 부분이 많다.
근거:

- [`docs/STYLE.md`](./STYLE.md)
- [`docs/PROCESS.md`](./PROCESS.md)
- [`docs/PAGES.md`](./PAGES.md)
- [`README.md`](../README.md)

추가 관찰:

- `README.md`는 여전히 Vite 템플릿 기본 문서다.
- 프로젝트 소개, 실행 방법, 배포 방식, 폴더 구조, 작성 규칙이 README에 반영되지 않았다.

개선 제안:

- `README.md`를 실제 프로젝트 기준으로 다시 작성한다.
- `docs/*`는 실제 유지할 규칙만 남기도록 정리한다.
  - 프로젝트 개요
  - 페이지 작성 규칙
  - 콘텐츠/시각화 작성 규칙
  - 배포/검증 절차
- 문서가 코드의 복사본이 아니라, 유지해야 할 기준만 담도록 줄이는 편이 낫다.

### 5. 중간: 공통 컴포넌트가 있지만 추상화 수준이 일정하지 않음

영향:

- 같은 목적의 기능이 `hook`, `container`, 페이지 내부 유틸로 흩어져 있다.
- D3/Three/Mermaid 사용 방식이 통일되어 있지 않다.

근거:

- [`src/hooks/useD3.ts`](../src/hooks/useD3.ts)
- [`src/hooks/useThree.ts`](../src/hooks/useThree.ts)
- [`src/components/viz/D3Container.tsx`](../src/components/viz/D3Container.tsx)
- [`src/components/viz/WebGLCanvas.tsx`](../src/components/viz/WebGLCanvas.tsx)
- [`src/components/viz/MermaidDiagram.tsx`](../src/components/viz/MermaidDiagram.tsx)

관찰:

- `useD3`와 `D3Container`가 역할이 겹친다.
- `useThree`와 `WebGLCanvas`도 비슷한 중복이 있다.
- 페이지마다 자체 helper를 다시 정의해 공통 계층이 얇다.

개선 제안:

- 시각화 API를 하나의 스타일로 통일한다.
- 예시 방향:
  - React wrapper 컴포넌트 중심
  - 내부에서 resize, cleanup, theme 연동 담당
  - 페이지는 `data + render fn`만 제공
- 현재처럼 hook과 wrapper가 병행되면 팀 내 사용 규칙이 계속 흔들린다.

### 6. 중간: 검색/레이아웃/테마는 유용하지만 상태 관리가 조금 거칠다

근거:

- [`src/components/layout/AppLayout.tsx`](../src/components/layout/AppLayout.tsx)
- [`src/components/search/SearchModal.tsx`](../src/components/search/SearchModal.tsx)
- [`src/contexts/ThemeContext.tsx`](../src/contexts/ThemeContext.tsx)

관찰:

- `ThemeContext`는 provider 파일에서 hook까지 함께 export하고 있어 현재 eslint 규칙과 충돌한다.
- Search modal은 open/query/active index 관리가 effect에 의존한다.
- route 변경 시 사이드바 닫기와 스크롤 이동은 동작은 하더라도 현재 규칙에서는 재설계 대상이다.

개선 제안:

- 테마 초기화는 "초기 state 계산 + 단일 effect"로 단순화한다.
- 검색 모달 상태는 open 시점 이벤트와 입력 이벤트 중심으로 재구성한다.
- provider와 reusable hook 분리를 고려한다.

### 7. 중간: 번들 크기가 크고 Mermaid 의존성이 무겁다

영향:

- 초기 로딩 비용이 크다.
- 학습 사이트 특성상 첫 진입 경험이 중요하므로 성능 체감에 직접 연결된다.

근거:

- `npm run build` 결과
  - `dist/assets/index-CIdYRuke.js` 1.5MB
  - Mermaid 관련 청크 다수 생성
  - 일부 청크 500kB 초과 경고

개선 제안:

- topic 페이지 단위 lazy loading 적용
- Mermaid, Three.js는 실제 사용하는 페이지에서만 동적 import
- glossary/search 데이터도 필요 시점 로드 고려
- "홈 + 기본 레이아웃"과 "무거운 시각화"를 분리한다

### 8. 낮음: 데이터 모델이 최소 수준이라 콘텐츠 운영 확장성이 낮음

근거:

- [`src/types/topic.ts`](../src/types/topic.ts)
- [`src/data/kernelTopics.ts`](../src/data/kernelTopics.ts)

관찰:

- `implemented`는 있으나 실제 페이지 완성도, 섹션 수, 시각화 유형, 난이도, 마지막 업데이트 같은 운영 정보가 없다.
- 라우팅과 탐색이 수동 import + 수동 route 선언 방식이다.

개선 제안:

- topic 메타데이터를 기준으로 라우트/사이드바/홈 카드 생성을 더 자동화한다.
- 최소한 아래 메타데이터를 추가할 가치가 있다.
  - `status`
  - `lastUpdated`
  - `sections`
  - `difficulty`
  - `estimatedReadTime`

## 우선순위별 실행 제안

### 1단계: 복구

- README 현실화
- `docs/*`와 실제 코드 구조의 기준 재정렬

### 2단계: 품질 기준 정렬

- eslint 규칙 유지/완화 여부 결정
- React 19 관련 주요 lint 에러 해소
- 새로 수정하는 파일부터 lint-clean 원칙 적용

### 3단계: 구조 분해

- `topic03`, `topic06`, `topic08`, `topic09`부터 파일 분리
- 공통 `Section`, `Prose`, `InfoTable`, `TopicNav` 추출
- 시각화 계층을 wrapper 중심으로 단일화

### 4단계: 성능 정리

- route lazy loading
- Mermaid/Three.js 동적 로딩
- 큰 데이터와 무거운 차트 분리

## 결론

이 프로젝트는 학습 콘텐츠 제품으로서의 방향성과 소재는 좋다. 문제는 "콘텐츠 생산 속도"가 "구조적 정리와 품질 기준"을 앞질렀다는 점이다. 지금 가장 중요한 일은 새 기능 추가가 아니라, 인코딩 복구와 품질 기준 정렬, 그리고 큰 페이지 분해다.

이 세 가지가 정리되면 이후의 개선은 비교적 단순해진다. 반대로 이 상태에서 토픽을 더 추가하면 문서, 접근성, 리뷰 비용, 유지보수 비용이 함께 더 나빠질 가능성이 높다.
