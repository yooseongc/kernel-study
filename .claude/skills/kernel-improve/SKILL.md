---
name: kernel-improve
description: 커널 선생님으로서 kernel-study 토픽 페이지들을 검토하고 콘텐츠 개선을 계획·실행합니다. "개선해줘", "리뷰해줘", "선생님으로서" 같은 요청에 사용합니다.
---

# kernel-improve 스킬

kernel-study 프로젝트의 콘텐츠를 Linux 커널 전문가 관점에서 검토하고 개선하는 워크플로우입니다.

## 모드

`$ARGUMENTS`가 없거나 `all`이면 전체 워크플로우(검토→계획→실행)를 순서대로 진행합니다.
- `review` : 검토만 수행하고 개선 포인트 리포트 출력
- `plan`   : 검토 결과를 PROCESS.md Sprint에 등록만 함 (구현 없음)
- `run`    : PROCESS.md에서 ⬜ 항목을 찾아 바로 구현 시작

---

## Step 1 — 커널 선생님 검토 (review / all)

다음 파일들을 읽어 각 토픽의 **현재 섹션 목록**을 파악합니다:

```
src/pages/topic01-overview/index.tsx
src/pages/topic02-scheduler/index.tsx
src/pages/topic03-memory/index.tsx
src/pages/topic04-filesystem/index.tsx
src/pages/topic05-interrupts/index.tsx
src/pages/topic06-network-stack/index.tsx
src/pages/topic07-netfilter/index.tsx
src/pages/topic08-xdp-ebpf/index.tsx
src/pages/topic09-synchronization/index.tsx
src/pages/topic10-drivers/index.tsx
src/pages/topic11-debugging/index.tsx
src/pages/topic12-security/index.tsx
```

섹션 제목만 빠르게 추출하려면:
```bash
grep -h "SectionTitle\|<h2\|<h3" src/pages/topic*/index.tsx | grep -v "//\|const\|import\|className"
```

### 검토 기준 (커널 선생님 관점)

각 토픽에 대해 다음을 평가합니다:

1. **개념 완성도**: 해당 토픽을 처음 배우는 사람이 핵심 개념을 이해할 수 있는가?
2. **실습 가능성**: 실제 명령어/코드가 있어서 따라해볼 수 있는가?
3. **최신성**: 현대 커널(5.x~6.x) 기준으로 설명되어 있는가?
4. **연결성**: 다른 토픽과 개념이 적절히 연결되어 있는가?
5. **시각화 품질**: D3/AnimatedDiagram이 개념 이해에 실질적으로 도움이 되는가?

### 리포트 형식

검토 결과를 다음 형식으로 출력합니다:

```
## 커널 선생님 리뷰 — [날짜]

### 토픽별 평가
| 토픽 | 강점 | 개선 포인트 |
|------|------|------------|
| ...  | ...  | ...        |

### 추가/개선 제안 (우선순위 순)

#### 🔴 높음 — 핵심 개념 누락
- Topic N — [설명]

#### 🟡 중간 — 현대 커널에서 중요
- Topic N — [설명]

#### 🟢 낮음 — 깊이 추가 또는 신규 토픽
- [설명]
```

---

## Step 2 — PROCESS.md 등록 (plan / all)

검토 결과를 `docs/PROCESS.md`에 새 Sprint로 추가합니다.

```markdown
## Sprint N — 콘텐츠 개선 (예정)

### 🔴 높음
| 작업 | 상태 |
|------|------|
| Topic N — [내용] | ⬜ |

### 🟡 중간
| 작업 | 상태 |
|------|------|
| Topic N — [내용] | ⬜ |

### 🟢 낮음
| 작업 | 상태 |
|------|------|
| [내용] | ⬜ |
```

Sprint 번호는 기존 PROCESS.md에서 마지막 Sprint 번호 + 1로 설정합니다.

---

## Step 3 — 병렬 구현 (run / all)

### 구현 원칙

1. **파일 충돌 방지**: 같은 파일을 수정하는 작업은 동일 에이전트에 묶습니다
2. **병렬 최대화**: 서로 다른 파일을 건드리는 작업은 반드시 병렬로 실행합니다
3. **완료 후 체크**: 각 에이전트 완료 시 `pnpm tsc --noEmit` 확인
4. **PROCESS.md 업데이트**: 완료 항목을 ⬜ → ✅로 변경

### 에이전트 지시 템플릿

각 에이전트에게 다음을 명확히 전달합니다:
- 수정할 파일 경로
- 삽입 위치 (마지막 섹션 다음, 다음 토픽 링크 앞 등)
- 추가할 섹션 번호와 제목
- 콘텐츠 상세 명세 (설명, 코드블록, 카드 구성)
- 스타일 규칙 (기존 파일 패턴 따르기, 다크모드 필수)

### D3 시각화 규칙 (필수 준수)

- `g` 태그에 transform 금지 → padding을 좌표에 직접 흡수
- `zoomable={true}` 복잡한 다이어그램에 사용
- viewBox 오버라이드 금지
- Mermaid는 `sequenceDiagram`, `flowchart` (단방향)만 허용
- 상태 전이 다이어그램, 그래프 → D3 고정 레이아웃

### 완료 시퀀스

모든 에이전트 완료 후:
1. `pnpm tsc --noEmit` 전체 타입 체크
2. PROCESS.md Sprint 항목 ✅ 업데이트
3. memory 파일 업데이트 (필요 시)

---

## 참고: 현재까지 다룬 주제

완료된 Sprint를 확인하려면 `docs/PROCESS.md`를 읽으세요.

현재 구현된 토픽 목록은 `src/data/kernelTopics.ts`에서 확인합니다.

## 참고: 아직 다루지 않은 주요 커널 영역

검토 시 참고할 미탐색 영역:
- **블록 I/O 스택**: bio, request_queue, I/O 스케줄러 (mq-deadline, kyber)
- **네임스페이스 심화**: user ns, mount ns, pid ns 구현 상세
- **cgroup v2 심화**: unified hierarchy, BPF 연동
- **KVM/가상화**: VMCS, EPT, virtio 드라이버
- **NUMA 심화**: numa_node, memory policy, mbind()
- **전력 관리**: cpufreq governor, runtime PM, suspend/resume
- **실시간 스케줄링**: SCHED_DEADLINE, SCHED_FIFO 상세
- **네트워크 오프로드**: TSO/LRO 커널 구현, flow steering 상세
