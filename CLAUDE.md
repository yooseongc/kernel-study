
# kernel-study 프로젝트

- 리눅스 커널의 세부 동작에 대해 이해하기 위한 가시화 학습 도구를 작성합니다.
- 이 프로젝트의 목적은 만든 본인 및 사이트 이용자가 커널의 각 동작에 대한 심도있는 이해를 돕기 위해 웹으로 가시화 하는 것을 목표로 합니다.
- react.js + typescript + pnpm 등을 이용한 static page를 github-page로 서빙하는 것을 목표로 합니다.
- d3, webgl 등 다채로운 도구를 활용합니다.

## Rule

- 필요하다면 CLAUDE는 skill을 만들고 이를 활용할 수 있습니다.
- 주제는 CLAUDE와 개발자가 함께 토론하여 결정합니다.
- 웹에 보여줄 목차와 내용 개요를 docs/PAGES.md 에 정리하고, 변경 시 항상 업데이트 합니다.
- 진행사항은 docs/PROCESS.md에 정리하고, 변경 시 항상 업데이트 합니다.
- **작업 완료 후 반드시 docs/PROCESS.md를 업데이트합니다.** 스프린트 또는 단위 작업이 끝날 때마다 완료 항목을 기록하고, 날짜를 최신화합니다.

## 리눅스 커널 학습 목차

시스템/네트워크 관점 중심 세미나 구성안

### 1. 리눅스 커널 개요와 전체 구조

- 커널이 하는 일
- 유저 공간과 커널 공간
- 시스템 콜의 역할
- 모놀리식 커널과 커널 모듈 구조
- 커널 소스 트리의 큰 그림

### 2. 프로세스, 스레드, 스케줄러

- `task_struct`의 개념
- 프로세스와 스레드의 차이
- 컨텍스트 스위칭
- CPU 스케줄링 기본 원리
- CFS와 실행 흐름의 이해

### 3. 가상 메모리와 메모리 관리

- 가상주소와 물리주소
- 페이지와 페이지 테이블
- `mm_struct`와 VMA
- Page Fault
- Buddy Allocator
- Slab / SLUB Allocator

### 4. 인터럽트, 예외, Deferred Work

- 인터럽트와 예외의 차이
- IRQ 처리 흐름
- Top Half / Bottom Half
- Softirq, Tasklet, Workqueue
- 타이머와 비동기 처리 구조

### 5. 네트워크 스택의 전체 흐름

- 패킷이 커널에 들어오는 과정
- NIC 드라이버와 NAPI
- `sk_buff` 구조
- L2 / L3 / L4 처리 흐름
- 소켓 계층까지의 전달 과정

### 6. 패킷 처리 경로와 후킹 지점

- Netfilter의 구조
- iptables / nftables의 위치
- PREROUTING, INPUT, FORWARD, OUTPUT, POSTROUTING
- TPROXY와 정책 기반 라우팅
- 트래픽 제어와 TC Hook

### 7. XDP, eBPF, 고성능 패킷 처리

- XDP의 개념과 장점
- eBPF 실행 모델
- 드라이버 레벨 처리와 일반 네트워크 스택의 차이
- TC BPF와 XDP의 차이
- 고성능 프록시/보안 장비에서의 활용

### 8. 동기화와 멀티코어 환경

- Race Condition의 개념
- Spinlock, Mutex, RWLock
- Atomic Operation
- RCU의 개요
- 멀티코어 환경에서 네트워크 성능과 동기화 이슈

### 9. 디바이스 드라이버와 커널 모듈

- 커널 모듈의 개념
- 문자/블록/네트워크 디바이스 드라이버
- NIC 드라이버와 DMA, IRQ
- 모듈 로드/언로드
- 드라이버와 커널 내부 서브시스템의 연결

### 10. 성능 분석과 디버깅

- `dmesg`, `/proc`, `/sys` 활용
- Oops / Panic 읽는 법
- `perf`, `ftrace`, `sar` 기초
- 네트워크 병목 분석 관점
- 실무형 커널 문제 추적 방법

---

## 추천 흐름 요약

1. 리눅스 커널 개요와 전체 구조
2. 프로세스, 스레드, 스케줄러
3. 가상 메모리와 메모리 관리
4. 인터럽트, 예외, Deferred Work
5. 네트워크 스택의 전체 흐름
6. 패킷 처리 경로와 후킹 지점
7. XDP, eBPF, 고성능 패킷 처리
8. 동기화와 멀티코어 환경
9. 디바이스 드라이버와 커널 모듈
10. 성능 분석과 디버깅
