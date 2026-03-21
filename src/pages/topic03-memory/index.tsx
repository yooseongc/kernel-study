import React, { useState, useCallback } from 'react'
import { CodeBlock } from '../../components/viz/CodeBlock'
import { D3Container } from '../../components/viz/D3Container'
import { AnimatedDiagram } from '../../components/viz/AnimatedDiagram'
import { useTheme } from '../../contexts/ThemeContext'
import * as d3 from 'd3'
import { themeColors } from '../../lib/colors'

// ─────────────────────────────────────────────────────────────────────────────
// 3.1  가상 주소 공간 (JSX div 기반)
// ─────────────────────────────────────────────────────────────────────────────
interface AddrRow {
  label: string
  sublabel?: string
  addrTop?: string
  addrBottom?: string
  heightPct: number
  bg: string
  textColor: string
  striped?: boolean
}

const addrRows: AddrRow[] = [
    {
        label: '커널 공간 (128TB)',
        sublabel: '커널 코드, vmalloc, direct mapping',
        addrTop: '0xFFFFFFFFFFFFFFFF',
        addrBottom: '0xFFFF800000000000',
        heightPct: 25,
        bg: 'bg-violet-900/60 dark:bg-violet-900/60',
        textColor: 'text-violet-200',
    },
    {
        label: '/// non-canonical hole ///',
        sublabel: '~16 exabytes',
        addrTop: '0xFFFF800000000000',
        addrBottom: '0x00007FFFFFFFFFFF',
        heightPct: 10,
        bg: 'bg-gray-800/60 dark:bg-gray-800/60',
        textColor: 'text-gray-500',
        striped: true,
    },
    {
        label: 'stack',
        sublabel: '↓ 아래 방향 성장',
        addrTop: '0x00007FFFFFFFFFFF',
        heightPct: 8,
        bg: 'bg-amber-900/50 dark:bg-amber-900/50',
        textColor: 'text-amber-200',
    },
    {
        label: 'mmap / shared libs',
        sublabel: '파일 매핑, 동적 라이브러리',
        heightPct: 15,
        bg: 'bg-purple-900/50 dark:bg-purple-900/50',
        textColor: 'text-purple-200',
    },
    {
        label: '(미할당)',
        heightPct: 12,
        bg: 'bg-gray-900/40 dark:bg-gray-900/40',
        textColor: 'text-gray-600',
    },
    {
        label: 'heap',
        sublabel: '↑ 위 방향 성장',
        heightPct: 10,
        bg: 'bg-emerald-900/50 dark:bg-emerald-900/50',
        textColor: 'text-emerald-200',
    },
    {
        label: 'BSS / data',
        sublabel: '전역 변수, 정적 변수',
        heightPct: 10,
        bg: 'bg-blue-800/50 dark:bg-blue-800/50',
        textColor: 'text-blue-200',
    },
    {
        label: 'text (코드)',
        sublabel: '.text 섹션',
        heightPct: 7,
        bg: 'bg-blue-900/60 dark:bg-blue-900/60',
        textColor: 'text-blue-300',
    },
    {
        label: 'NULL guard (4KB)',
        addrBottom: '0x0000000000000000',
        heightPct: 3,
        bg: 'bg-gray-950/80 dark:bg-gray-950/80',
        textColor: 'text-gray-600',
    },
]

// Addresses to show on the right at specific breakpoints
const addrLabels = [
    { top: true, label: '0xFFFFFFFFFFFFFFFF', rowIdx: 0 },
    { top: false, label: '0xFFFF800000000000', rowIdx: 0 },
    { top: false, label: '0x00007FFFFFFFFFFF', rowIdx: 2 },
    { top: false, label: '0x0000000000001000', rowIdx: 7 },
    { top: false, label: '0x0000000000000000', rowIdx: 8 },
]
void addrLabels // suppress unused warning

function VirtualAddressViz() {
    // cumulative heights for right-side labels
    const cumulative: number[] = []
    let acc = 0
    for (const row of addrRows) {
        cumulative.push(acc)
        acc += row.heightPct
    }

    return (
        <div className="flex gap-3">
            {/* Left: address space bars */}
            <div className="flex-1 flex flex-col border border-gray-700 rounded-lg overflow-hidden text-xs font-mono">
                {addrRows.map((row, i) => (
                    <div
                        key={i}
                        className={`relative flex flex-col justify-center px-3 py-1 ${row.bg} ${
                            row.striped ? 'bg-stripes' : ''
                        }`}
                        style={{ height: `${row.heightPct * 3.2}px`, minHeight: '24px' }}
                    >
                        {row.striped ? (
                            <div
                                className="absolute inset-0 opacity-20"
                                style={{
                                    backgroundImage:
                    'repeating-linear-gradient(-45deg, #9ca3af 0, #9ca3af 1px, transparent 0, transparent 50%)',
                                    backgroundSize: '8px 8px',
                                }}
                            />
                        ) : null}
                        <span className={`font-semibold relative z-10 ${row.textColor}`}>{row.label}</span>
                        {row.sublabel && (
                            <span className="text-gray-500 text-[10px] relative z-10">{row.sublabel}</span>
                        )}
                    </div>
                ))}
            </div>

            {/* Right: hex address labels */}
            <div
                className="relative w-44 text-[10px] font-mono text-gray-400"
                style={{ height: `${addrRows.reduce((s, r) => s + r.heightPct * 3.2, 0)}px` }}
            >
                {addrRows.map((row, i) => {
                    const topPx = cumulative[i] * 3.2
                    const labels: { offset: number; text: string }[] = []
                    if (row.addrTop) labels.push({ offset: topPx, text: row.addrTop })
                    if (row.addrBottom) labels.push({ offset: topPx + row.heightPct * 3.2, text: row.addrBottom })
                    return labels.map((lbl, j) => (
                        <div
                            key={`${i}-${j}`}
                            className="absolute left-0 flex items-center gap-1"
                            style={{ top: lbl.offset }}
                        >
                            <div className="w-3 h-px bg-gray-600" />
                            <span className="whitespace-nowrap leading-none">{lbl.text}</span>
                        </div>
                    ))
                })}
                {/* 0x00007FFFFFFFFFFF marker */}
                <div
                    className="absolute left-0 flex items-center gap-1"
                    style={{ top: (addrRows[0].heightPct + addrRows[1].heightPct) * 3.2 }}
                >
                    <div className="w-3 h-px bg-gray-600" />
                    <span className="whitespace-nowrap leading-none">0x00007FFFFFFFFFFF</span>
                </div>
                {/* 0x0000000000001000 marker */}
                <div
                    className="absolute left-0 flex items-center gap-1"
                    style={{
                        top:
              addrRows
                  .slice(0, addrRows.length - 1)
                  .reduce((s, r) => s + r.heightPct * 3.2, 0),
                    }}
                >
                    <div className="w-3 h-px bg-gray-600" />
                    <span className="whitespace-nowrap leading-none">0x0000000000001000</span>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.2  페이지 테이블 워크 (AnimatedDiagram)
// ─────────────────────────────────────────────────────────────────────────────
const pageTableSteps = [
    {
        label: '가상 주소 분해',
        description:
      'VA 0x00007fff_deadbeef를 5개 필드로 분리합니다: PGD[8:9], PUD[9:8], PMD[9:8], PTE[9:8], Offset[12:0].',
    },
    {
        label: 'PGD 조회',
        description: 'CR3 레지스터가 PGD 물리 주소를 가리킵니다. bits[47:39]로 PGD 엔트리를 찾아 PUD 물리 주소를 얻습니다.',
    },
    {
        label: 'PUD 조회',
        description: 'PUD 베이스 + bits[38:30] 인덱스로 PUD 엔트리를 읽어 PMD 물리 주소를 얻습니다.',
    },
    {
        label: 'PMD 조회',
        description: 'PMD 베이스 + bits[29:21] 인덱스로 PMD 엔트리를 읽어 PTE 물리 주소를 얻습니다.',
    },
    {
        label: 'PTE → 물리 주소',
        description: 'PTE 베이스 + bits[20:12]로 최종 PTE를 읽습니다. PTE의 PFN << 12 + offset[11:0] = 물리 주소.',
    },
]

// VA = 0x00007FFF_DEADBEEF
// bits[47:39] = 0xFF >> wait, let's compute:
// 0x00007FFF_DEADBEEF in binary:
// 0x00007FFF = 0000 0000 0000 0000 0111 1111 1111 1111
// bits 47:39 of the 48-bit VA: bits[47:39] = 0b000001111 = 0xFF (255? let me just use a plausible display)
const vaFields = [
    { label: 'PGD', bits: '47:39', value: '0x0FF', color: '#8b5cf6', darkColor: '#7c3aed' },
    { label: 'PUD', bits: '38:30', value: '0x1FF', color: '#3b82f6', darkColor: '#2563eb' },
    { label: 'PMD', bits: '29:21', value: '0x1EF', color: '#10b981', darkColor: '#059669' },
    { label: 'PTE', bits: '20:12', value: '0x0AD', color: '#f59e0b', darkColor: '#d97706' },
    { label: 'Offset', bits: '11:0', value: '0xEEF', color: '#ef4444', darkColor: '#dc2626' },
]

const tableAddresses = [
    { level: 'PGD', baseAddr: '0x1000_0000', nextLabel: 'PUD' },
    { level: 'PUD', baseAddr: '0x1001_0000', nextLabel: 'PMD' },
    { level: 'PMD', baseAddr: '0x1002_0000', nextLabel: 'PTE' },
    { level: 'PTE', baseAddr: '0x1003_0000', nextLabel: 'Physical' },
]

function PageTableWalkViz({ step }: { step: number }) {
    return (
        <div className="space-y-5 p-2">
            {/* VA field breakdown */}
            <div>
                <div className="text-xs text-gray-400 mb-2 font-mono">VA: 0x00007FFF_DEADBEEF</div>
                <div className="flex gap-1 flex-wrap">
                    {vaFields.map((f, i) => {
                        const isActive = step === 0 || step - 1 === i
                        return (
                            <div
                                key={f.label}
                                className="flex flex-col items-center rounded p-2 transition-all duration-300"
                                style={{
                                    background: isActive ? f.color + '33' : '#1f2937',
                                    border: `2px solid ${isActive ? f.color : '#374151'}`,
                                    boxShadow: isActive ? `0 0 8px ${f.color}88` : 'none',
                                    minWidth: '70px',
                                }}
                            >
                                <span className="text-[10px] text-gray-400 font-mono">[{f.bits}]</span>
                                <span className="text-sm font-bold font-mono" style={{ color: isActive ? f.color : '#6b7280' }}>
                                    {f.value}
                                </span>
                                <span className="text-[10px] font-semibold" style={{ color: isActive ? f.color : '#6b7280' }}>
                                    {f.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Table walk levels */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex flex-col items-center">
                    <div
                        className="rounded px-3 py-2 text-center transition-all duration-300"
                        style={{
                            background: step === 1 ? '#1e3a8a' : '#111827',
                            border: `1px solid ${step === 1 ? '#3b82f6' : '#374151'}`,
                            boxShadow: step === 1 ? '0 0 8px #3b82f688' : 'none',
                        }}
                    >
                        <div className="text-[10px] text-gray-400">CR3</div>
                        <div className="text-xs font-mono text-blue-300 font-bold">PGD base</div>
                        <div className="text-[10px] text-gray-500">0x1000_0000</div>
                    </div>
                </div>

                {tableAddresses.map((t, i) => (
                    <div key={t.level} className="flex items-center gap-2">
                        <div className="text-gray-600">→</div>
                        <div
                            className="rounded px-3 py-2 text-center transition-all duration-300"
                            style={{
                                background: step === i + 1 ? '#1e3a8a' : '#111827',
                                border: `1px solid ${step === i + 1 ? '#3b82f6' : '#374151'}`,
                                boxShadow: step === i + 1 ? '0 0 8px #3b82f688' : 'none',
                                opacity: step >= i + 1 || step === 0 ? 1 : 0.3,
                            }}
                        >
                            <div className="text-[10px] text-gray-400">{t.level}</div>
                            <div className="text-xs font-mono text-blue-300 font-bold">idx: {vaFields[i].value}</div>
                            <div className="text-[10px] text-gray-500">base: {t.baseAddr}</div>
                        </div>
                    </div>
                ))}

                <div className="flex items-center gap-2">
                    <div className="text-gray-600">→</div>
                    <div
                        className="rounded px-3 py-2 text-center transition-all duration-300"
                        style={{
                            background: step === 4 ? '#14532d' : '#111827',
                            border: `1px solid ${step === 4 ? '#22c55e' : '#374151'}`,
                            boxShadow: step === 4 ? '0 0 8px #22c55e88' : 'none',
                            opacity: step === 4 ? 1 : 0.3,
                        }}
                    >
                        <div className="text-[10px] text-gray-300">Physical</div>
                        <div className="text-xs font-mono text-green-300 font-bold">PFN + offset</div>
                        <div className="text-[10px] text-gray-500">0x2000_DEEF</div>
                    </div>
                </div>
            </div>

            {/* TLB tip */}
            <div className="rounded-lg border border-yellow-800/50 bg-yellow-900/20 px-4 py-2 text-xs text-yellow-200">
                <span className="font-bold">TLB 팁:</span> TLB(Translation Lookaside Buffer)가 이 4번의 메모리 접근을 캐싱합니다.
        TLB miss 시 하드웨어가 page table walk를 수행합니다.
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.3  mm_struct & VMA code
// ─────────────────────────────────────────────────────────────────────────────
const mmStructCode = `// mm_struct (include/linux/mm_types.h)
struct mm_struct {
    struct maple_tree   mm_mt;        /* VMA 트리 (커널 6.1+, 이전은 RB 트리) */
    unsigned long       mmap_base;    /* mmap 시작 주소 */
    unsigned long       task_size;    /* 유저 공간 최대 크기 */
    pgd_t               *pgd;         /* 페이지 글로벌 디렉토리 물리 주소 */

    atomic_t            mm_users;     /* 이 mm을 공유하는 스레드 수 */
    atomic_t            mm_count;     /* mm_struct 자체 참조 수 */

    unsigned long       start_code, end_code;   /* .text 영역 */
    unsigned long       start_data, end_data;   /* .data 영역 */
    unsigned long       start_brk,  brk;        /* heap 시작/현재 끝 */
    unsigned long       start_stack;            /* stack 시작 */
    unsigned long       arg_start,  arg_end;    /* argv 영역 */
    unsigned long       env_start,  env_end;    /* envp 영역 */

    struct list_head    mmlist;       /* 모든 mm_struct 연결 리스트 */
};`

const vmaCode = `// vm_area_struct — 하나의 연속된 가상 주소 영역
struct vm_area_struct {
    unsigned long       vm_start;     /* 이 VMA의 시작 주소 */
    unsigned long       vm_end;       /* 이 VMA의 끝 주소 (exclusive) */
    pgprot_t            vm_page_prot; /* 접근 권한 (R/W/X) */
    unsigned long       vm_flags;     /* VM_READ | VM_WRITE | VM_EXEC | VM_SHARED */

    struct mm_struct    *vm_mm;       /* 소속 mm_struct */
    struct file         *vm_file;     /* 파일 매핑이면 파일 포인터, 아니면 NULL */
    const struct vm_operations_struct *vm_ops; /* fault, open, close 콜백 */
};`

const vmaFlags = [
    { flag: 'VM_READ', desc: '읽기 가능', example: '.text, .rodata' },
    { flag: 'VM_WRITE', desc: '쓰기 가능', example: '.data, heap, stack' },
    { flag: 'VM_EXEC', desc: '실행 가능', example: '.text' },
    { flag: 'VM_SHARED', desc: '공유 매핑 (MAP_SHARED)', example: 'shared memory' },
    { flag: 'VM_GROWSDOWN', desc: '하향 성장', example: 'stack' },
]

const mmapExampleCode = `/* 익명 매핑 — malloc(large)의 내부 동작 */
void *ptr = mmap(NULL, 4096 * 10,
                 PROT_READ | PROT_WRITE,
                 MAP_PRIVATE | MAP_ANONYMOUS,
                 -1, 0);

/* 파일 매핑 — 파일을 메모리처럼 접근 */
int fd = open("data.bin", O_RDONLY);
void *data = mmap(NULL, file_size,
                  PROT_READ,
                  MAP_SHARED,  /* 또는 MAP_PRIVATE */
                  fd, 0);
close(fd);  /* fd 닫아도 매핑 유지 */

/* 해제 */
munmap(ptr, size);

/* 커널 내부: do_mmap() → vm_mmap() → mmap_region()
   → vma 생성 → mm->mmap 리스트에 삽입 */`

// ─────────────────────────────────────────────────────────────────────────────
// 3.4  Page Fault (AnimatedDiagram)
// ─────────────────────────────────────────────────────────────────────────────
const pageFaultSteps = [
    {
        label: '① 가상 주소 접근',
        description: '프로세스가 *ptr = 42 같은 메모리 쓰기를 시도합니다. CPU는 MMU에 가상 주소 변환을 요청합니다.',
    },
    {
        label: '② MMU: Present=0 감지',
        description: '페이지 테이블 PTE의 Present 비트가 0이면 MMU가 #PF 예외를 발생시키고 CR2 레지스터에 fault 주소를 저장합니다.',
    },
    {
        label: '③ do_page_fault() 호출',
        description: '커널 fault 핸들러로 진입합니다. VMA를 조회해 fault 종류(minor/major/invalid)를 판별합니다.',
    },
    {
        label: '④ 물리 페이지 할당',
        description:
      'Minor fault: Buddy Allocator에서 4KB 페이지를 즉시 할당합니다. Major fault: 디스크/swap에서 페이지를 읽어옵니다 (I/O 발생).',
    },
    {
        label: '⑤ PTE 업데이트',
        description: '새 물리 페이지 주소를 PTE에 기록하고 Present=1을 설정합니다. TLB를 무효화(flush)합니다.',
    },
    {
        label: '⑥ 프로세스 재실행',
        description: 'fault 난 명령어부터 재실행합니다. 이번에는 TLB hit 또는 page table walk 성공으로 정상 접근됩니다.',
    },
]

type PFZone = 'process' | 'kernel' | 'memory'

interface PFStep {
  active: PFZone[]
  arrow?: { from: PFZone; to: PFZone }
  note: string
}

const pfStepData: PFStep[] = [
    { active: ['process'], note: '*ptr = 42 → 가상 주소 변환 요청' },
    { active: ['process', 'kernel'], arrow: { from: 'process', to: 'kernel' }, note: '#PF 예외 발생 → CR2 = fault 주소' },
    { active: ['kernel'], note: 'do_page_fault() → VMA 조회 → fault 종류 판별' },
    { active: ['kernel', 'memory'], arrow: { from: 'kernel', to: 'memory' }, note: 'Buddy Alloc(minor) / disk swap in(major)' },
    { active: ['kernel'], note: 'PTE 갱신 (Present=1) + TLB 무효화' },
    { active: ['process', 'kernel', 'memory'], note: '명령어 재실행 → TLB hit → 정상 접근' },
]

function PageFaultViz({ step }: { step: number }) {
    const zones: { id: PFZone; label: string; color: string; activeColor: string }[] = [
        { id: 'process', label: '프로세스', color: '#1f2937', activeColor: '#1e3a8a' },
        { id: 'kernel', label: '커널 / MMU', color: '#1f2937', activeColor: '#78350f' },
        { id: 'memory', label: '메모리 / 디스크', color: '#1f2937', activeColor: '#14532d' },
    ]

    const current = pfStepData[step]

    return (
        <div className="space-y-4 p-2">
            <div className="flex gap-3">
                {zones.map((z, zi) => {
                    const isActive = current.active.includes(z.id)
                    const showArrowRight = current.arrow?.from === z.id && zones[zi + 1] && current.arrow.to === zones[zi + 1]?.id
                    return (
                        <div key={z.id} className="flex items-center gap-3 flex-1">
                            <div
                                className="flex-1 rounded-lg p-4 text-center transition-all duration-300 min-h-[80px] flex flex-col items-center justify-center"
                                style={{
                                    background: isActive ? z.activeColor : z.color,
                                    border: `2px solid ${isActive ? '#6b7280' : '#374151'}`,
                                    boxShadow: isActive ? '0 0 12px rgba(255,255,255,0.1)' : 'none',
                                }}
                            >
                                <div className="text-sm font-bold text-white">{z.label}</div>
                                {isActive && (
                                    <div className="text-[10px] text-gray-300 mt-1">활성</div>
                                )}
                            </div>
                            {showArrowRight && (
                                <div className="text-gray-400 text-xl">→</div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div className="rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-2 text-xs text-gray-200 font-mono text-center">
                {current.note}
            </div>
        </div>
    )
}

const pageFaultTypes = [
    { type: 'Minor', cond: '물리 페이지 없음, 디스크 불필요', cost: '낮음 (µs)' },
    { type: 'Major', cond: '디스크 swap/파일 로드 필요', cost: '높음 (ms)' },
    { type: 'Invalid', cond: '잘못된 주소 / 권한 위반', cost: 'SIGSEGV' },
]

// ─────────────────────────────────────────────────────────────────────────────
// 3.5  Buddy Allocator (인터랙티브)
// ─────────────────────────────────────────────────────────────────────────────
const TOTAL_PAGES = 32
const MAX_ORDER = 5

interface BuddyState {
  pages: (number | null)[]
  freeList: number[][]
  nextId: number
  log: string[]
  allocations: { id: number; pfn: number; order: number }[]
}

function initBuddy(): BuddyState {
    const freeList: number[][] = Array.from({ length: MAX_ORDER + 1 }, () => [])
    freeList[MAX_ORDER] = [0]
    return {
        pages: new Array(TOTAL_PAGES).fill(null),
        freeList,
        nextId: 0,
        log: ['초기 상태: order-5 블록 1개 (32 pages = 128KB)'],
        allocations: [],
    }
}

function buddyAlloc(state: BuddyState, order: number): BuddyState {
    let availOrder = -1
    for (let o = order; o <= MAX_ORDER; o++) {
        if (state.freeList[o].length > 0) { availOrder = o; break }
    }
    if (availOrder === -1) {
        return { ...state, log: [`할당 실패: order-${order} (OOM)`, ...state.log] }
    }

    const newFL = state.freeList.map(l => [...l])
    const pfn = newFL[availOrder].shift()!

    for (let o = availOrder; o > order; o--) {
        const buddyPfn = pfn + (1 << (o - 1))
        newFL[o - 1].push(buddyPfn)
        newFL[o - 1].sort((a, b) => a - b)
    }

    const allocId = state.nextId
    const newPages = [...state.pages]
    for (let i = pfn; i < pfn + (1 << order); i++) newPages[i] = allocId

    const splitMsg = availOrder > order ? ` (order-${availOrder} → order-${order} 분할)` : ''
    return {
        pages: newPages,
        freeList: newFL,
        nextId: state.nextId + 1,
        log: [`alloc(order=${order}, ${1 << order} pages, PFN ${pfn})${splitMsg}`, ...state.log].slice(0, 8),
        allocations: [...state.allocations, { id: allocId, pfn, order }],
    }
}

function buddyFree(state: BuddyState, allocId: number): BuddyState {
    const alloc = state.allocations.find(a => a.id === allocId)
    if (!alloc) return state

    const newPages = [...state.pages]
    for (let i = alloc.pfn; i < alloc.pfn + (1 << alloc.order); i++) newPages[i] = null

    const newFL = state.freeList.map(l => [...l])
    let pfn = alloc.pfn
    let ord = alloc.order

    while (ord < MAX_ORDER) {
        const buddyPfn = pfn ^ (1 << ord)
        const buddyIdx = newFL[ord].indexOf(buddyPfn)
        if (buddyIdx === -1) break
        newFL[ord].splice(buddyIdx, 1)
        pfn = Math.min(pfn, buddyPfn)
        ord++
    }
    newFL[ord].push(pfn)
    newFL[ord].sort((a, b) => a - b)

    return {
        pages: newPages,
        freeList: newFL,
        nextId: state.nextId,
        log: [`free(order=${alloc.order}, PFN ${alloc.pfn}) → order-${ord}로 합병`, ...state.log].slice(0, 8),
        allocations: state.allocations.filter(a => a.id !== allocId),
    }
}

const ALLOC_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899',
]

function renderBuddyViz(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number,
    state: BuddyState,
    isDark: boolean,
) {
    const c = themeColors(isDark)
    const bg = c.bg
    const freeFill = c.bgCard
    const freeStroke = c.border
    const textFill = c.text
    const dimFill = c.textDim
    const headerFill = c.textMuted

    svg.style('background', bg)

    const padL = 8, padT = 24, padB = 60
    const gridH = height - padT - padB
    const cellW = Math.max(8, (width - padL * 2) / TOTAL_PAGES)
    const cellH = Math.min(36, gridH)

    const g = svg.append('g')

    // PFN header
    g.append('text')
        .attr('x', padL)
        .attr('y', 14)
        .attr('fill', headerFill)
        .attr('font-size', '10px')
        .attr('font-family', 'monospace')
        .text('Physical Pages (PFN 0–31)')

    // Page cells
    for (let i = 0; i < TOTAL_PAGES; i++) {
        const cx = padL + i * cellW
        const cy = padT
        const allocId = state.pages[i]
        const fill = allocId !== null ? ALLOC_COLORS[allocId % ALLOC_COLORS.length] : freeFill
        const stroke = allocId !== null ? fill : freeStroke

        g.append('rect')
            .attr('x', cx)
            .attr('y', cy)
            .attr('width', cellW - 1)
            .attr('height', cellH)
            .attr('rx', 2)
            .attr('fill', fill)
            .attr('stroke', stroke)
            .attr('stroke-width', 1)

        // PFN label (only show every 4 to avoid crowding)
        if (i % 4 === 0 || cellW >= 14) {
            g.append('text')
                .attr('x', cx + (cellW - 1) / 2)
                .attr('y', cy + cellH + 10)
                .attr('text-anchor', 'middle')
                .attr('fill', dimFill)
                .attr('font-size', '8px')
                .attr('font-family', 'monospace')
                .text(String(i))
        }
    }

    // Draw allocation borders
    for (const alloc of state.allocations) {
        const cx = padL + alloc.pfn * cellW
        const cy = padT
        const aw = cellW * (1 << alloc.order) - 1
        const color = ALLOC_COLORS[alloc.id % ALLOC_COLORS.length]
        g.append('rect')
            .attr('x', cx)
            .attr('y', cy)
            .attr('width', aw)
            .attr('height', cellH)
            .attr('rx', 2)
            .attr('fill', 'none')
            .attr('stroke', color)
            .attr('stroke-width', 2.5)

        // Alloc label inside block
        if (aw > 20) {
            g.append('text')
                .attr('x', cx + aw / 2)
                .attr('y', cy + cellH / 2 + 1)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', '#fff')
                .attr('font-size', '9px')
                .attr('font-family', 'monospace')
                .attr('font-weight', 'bold')
                .text(`#${alloc.id}`)
        }
    }

    // Free list table at bottom
    const flY = padT + cellH + 22
    const colW = (width - padL * 2) / (MAX_ORDER + 1)

    for (let o = 0; o <= MAX_ORDER; o++) {
        const cx = padL + o * colW
        const blocks = state.freeList[o]

        g.append('text')
            .attr('x', cx + colW / 2)
            .attr('y', flY)
            .attr('text-anchor', 'middle')
            .attr('fill', headerFill)
            .attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .attr('font-weight', 'bold')
            .text(`ord-${o}`)

        g.append('text')
            .attr('x', cx + colW / 2)
            .attr('y', flY + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', dimFill)
            .attr('font-size', '8px')
            .attr('font-family', 'monospace')
            .text(`${1 << o}p`)

        const blockText = blocks.length > 0 ? blocks.join(',') : '—'
        g.append('text')
            .attr('x', cx + colW / 2)
            .attr('y', flY + 28)
            .attr('text-anchor', 'middle')
            .attr('fill', blocks.length > 0 ? textFill : dimFill)
            .attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .text(blockText.length > 10 ? blockText.slice(0, 9) + '…' : blockText)
    }
}

function BuddyAllocatorViz() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const [buddyState, setBuddyState] = useState<BuddyState>(initBuddy)

    const renderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
            renderBuddyViz(svg, width, height, buddyState, isDark)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [buddyState, theme],
    )

    const handleAlloc = (order: number) => setBuddyState(s => buddyAlloc(s, order))
    const handleFree = () => {
        if (buddyState.allocations.length === 0) return
        const last = buddyState.allocations[buddyState.allocations.length - 1]
        setBuddyState(s => buddyFree(s, last.id))
    }

    return (
        <div className="space-y-3">
            {/* Controls */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-gray-400 font-mono">할당:</span>
                {([0, 1, 2, 3, 4] as const).map(order => (
                    <button
                        key={order}
                        onClick={() => handleAlloc(order)}
                        className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs font-mono transition"
                    >
                        {1 << order}p ({(4 * (1 << order))}KB)
                    </button>
                ))}
                <button
                    onClick={handleFree}
                    disabled={buddyState.allocations.length === 0}
                    className="px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-xs font-mono transition disabled:opacity-40"
                >
          마지막 해제
                </button>
                <button
                    onClick={() => setBuddyState(initBuddy())}
                    className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-mono transition"
                >
          초기화
                </button>
            </div>

            <D3Container
                renderFn={renderFn}
                deps={[buddyState, theme]}
                height={200}
            />

            {/* Log */}
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                <div className="text-xs text-gray-500 font-mono mb-2">동작 로그</div>
                {buddyState.log.map((entry, i) => (
                    <div key={i} className="text-xs font-mono text-gray-300">
                        <span className="text-gray-600 mr-2">{buddyState.log.length - i}.</span>
                        {entry}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.6  SLUB Allocator D3 시각화
// ─────────────────────────────────────────────────────────────────────────────
function renderSlubViz(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    _height: number,
) {
    const isDark = document.documentElement.classList.contains('dark')
    const c = themeColors(isDark)
    const textFill = c.text
    const dimFill = c.textMuted
    const bg = c.bg
    const borderColor = c.border
    const freeFill = c.bgCard
    const allocFill = c.blueFill
    const allocStroke = c.blueStroke
    const cacheColor = isDark ? 'oklch(55% 0.20 295)' : 'oklch(42% 0.22 295)'

    svg.style('background', bg)

    const padL = 16, padT = 10

    const g = svg.append('g')

    // kmem_cache header box
    const cacheW = Math.min(260, width * 0.4)
    const cacheH = 44
    g.append('rect')
        .attr('x', padL).attr('y', padT)
        .attr('width', cacheW).attr('height', cacheH)
        .attr('rx', 6)
        .attr('fill', c.purpleFill)
        .attr('stroke', cacheColor).attr('stroke-width', 1.5)

    g.append('text')
        .attr('x', padL + cacheW / 2).attr('y', padT + 16)
        .attr('text-anchor', 'middle')
        .attr('fill', cacheColor).attr('font-size', '11px')
        .attr('font-family', 'monospace').attr('font-weight', 'bold')
        .text('kmem_cache')

    g.append('text')
        .attr('x', padL + cacheW / 2).attr('y', padT + 32)
        .attr('text-anchor', 'middle')
        .attr('fill', dimFill).attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text('task_struct  size=9536B  align=64')

    // 3 slab pages
    const slabs = [
        { label: 'active', objs: [true, true, true, true, true, true] },
        { label: 'partial', objs: [true, false, true, false, true, false] },
        { label: 'full (free)', objs: [false, false, false, false, false, false] },
    ]
    const slabAreaW = width - padL * 2
    const slabW = slabAreaW / 3 - 8
    const slabStartY = padT + cacheH + 16
    const objCols = 3, objRows = 2
    const objW = (slabW - 16) / objCols
    const objH = 22

    slabs.forEach((slab, si) => {
        const sx = padL + si * (slabW + 8)
        const sy = slabStartY

        // Slab container
        g.append('rect')
            .attr('x', sx).attr('y', sy)
            .attr('width', slabW)
            .attr('height', objRows * (objH + 4) + 32)
            .attr('rx', 6)
            .attr('fill', c.bg)
            .attr('stroke', borderColor).attr('stroke-width', 1)

        g.append('text')
            .attr('x', sx + slabW / 2).attr('y', sy + 14)
            .attr('text-anchor', 'middle')
            .attr('fill', slab.label === 'active' ? c.greenStroke : slab.label === 'partial' ? c.amberStroke : dimFill)
            .attr('font-size', '9px').attr('font-family', 'monospace').attr('font-weight', 'bold')
            .text(slab.label)

        // Objects
        const freeChain: { x: number; y: number }[] = []
        slab.objs.forEach((allocated, oi) => {
            const col = oi % objCols
            const row = Math.floor(oi / objCols)
            const ox = sx + 8 + col * (objW + 4)
            const oy = sy + 20 + row * (objH + 4)

            g.append('rect')
                .attr('x', ox).attr('y', oy)
                .attr('width', objW).attr('height', objH)
                .attr('rx', 3)
                .attr('fill', allocated ? allocFill : freeFill)
                .attr('stroke', allocated ? allocStroke : borderColor)
                .attr('stroke-width', 1)

            if (!allocated) {
                freeChain.push({ x: ox + objW / 2, y: oy + objH / 2 })
            }
        })

        // Free list chain arrows
        for (let i = 0; i < freeChain.length - 1; i++) {
            const p1 = freeChain[i], p2 = freeChain[i + 1]
            g.append('line')
                .attr('x1', p1.x).attr('y1', p1.y)
                .attr('x2', p2.x).attr('y2', p2.y)
                .attr('stroke', dimFill).attr('stroke-width', 1).attr('stroke-dasharray', '2,2')
        }
    })

    // kmalloc size class table on the right — clamp to prevent overflow
    const tableX = Math.min(padL + width * 0.55, width - 160)
    const tableY = padT
    const sizes = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192]
    const rowH = 16

    g.append('text')
        .attr('x', tableX).attr('y', tableY + 12)
        .attr('fill', textFill).attr('font-size', '10px')
        .attr('font-family', 'monospace').attr('font-weight', 'bold')
        .text('kmalloc size classes')

    sizes.forEach((sz, i) => {
        const ry = tableY + 24 + i * rowH
        g.append('text')
            .attr('x', tableX + 10).attr('y', ry + 10)
            .attr('fill', dimFill).attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .text(`kmalloc-${sz}   (${sz}B)`)
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.7  memory cgroup
// ─────────────────────────────────────────────────────────────────────────────
const memcgFiles = [
    { file: 'memory.max', desc: '프로세스 그룹의 메모리 상한. 초과 시 OOM killer' },
    { file: 'memory.high', desc: 'soft 제한. 초과 시 throttle (swap 유도)' },
    { file: 'memory.current', desc: '현재 사용량' },
    { file: 'memory.stat', desc: '상세 통계 (cache, rss, swap 등)' },
    { file: 'memory.oom_control', desc: 'OOM killer 동작 설정' },
]

const memcgCode = `# memory cgroup v2 설정
echo "536870912" > /sys/fs/cgroup/myapp/memory.max   # 512MB 상한
echo "402653184" > /sys/fs/cgroup/myapp/memory.high  # 384MB soft 제한

# OOM 발생 시 kill하지 말고 pause만 (컨테이너 런타임이 처리)
echo 1 > /sys/fs/cgroup/myapp/memory.oom_control

# 통계 확인
cat /sys/fs/cgroup/myapp/memory.stat`

const oomBashCode = `# 프로세스별 OOM 점수 확인
cat /proc/$(pgrep nginx)/oom_score
cat /proc/$(pgrep nginx)/oom_score_adj

# 중요한 프로세스 보호 (절대 종료 안 함)
echo -1000 > /proc/$(pgrep sshd)/oom_score_adj

# 덜 중요한 프로세스를 우선 종료
echo 500 > /proc/$(pgrep worker)/oom_score_adj

# OOM 이벤트 확인
dmesg | grep -i "oom\\|killed process"
# 예: Out of memory: Killed process 1234 (myapp) total-vm:2GB

# cgroup v2로 OOM 범위 제한
echo 512M > /sys/fs/cgroup/myapp/memory.max
# → myapp 그룹만 OOM, 시스템 전체 보호`

const oomKillCode = `/* OOM 희생자 선택 */
static struct task_struct *oom_badness(struct task_struct *p,
                                        unsigned long totalpages)
{
    long points;

    /* 메모리 사용량 기반 점수 (0~1000) */
    points = get_mm_rss(p->mm) + get_mm_counter(p->mm, MM_SWAPENTS);
    points *= 1000 / totalpages;

    /* oom_score_adj 보정 적용 */
    points += p->signal->oom_score_adj;

    return points;  /* 높을수록 먼저 종료 */
}`

// ─────────────────────────────────────────────────────────────────────────────
// 3.8  vmalloc vs kmalloc
// ─────────────────────────────────────────────────────────────────────────────
const kmallocCode = `/* kmalloc — 물리적 연속 보장, SLUB에서 할당 */
void *buf = kmalloc(size, GFP_KERNEL);
/*   GFP_KERNEL: 슬립 허용 (프로세스 컨텍스트)
     GFP_ATOMIC: 슬립 불가 (인터럽트 컨텍스트)
     GFP_DMA:    DMA 가능 영역에서 할당 (<16MB on x86) */

/* 초기화된 버전 */
void *buf = kzalloc(size, GFP_KERNEL);  /* 0으로 초기화 */

/* 해제 */
kfree(buf);

/* vmalloc — 가상 연속, 물리 비연속 허용 */
void *buf = vmalloc(size);              /* 슬립 허용 */
void *buf = vzalloc(size);             /* 0으로 초기화 */
vfree(buf);

/* 실제 물리 주소 확인 (불연속성 증명) */
for (i = 0; i < size; i += PAGE_SIZE) {
    unsigned long vaddr = (unsigned long)buf + i;
    unsigned long paddr = virt_to_phys((void *)vaddr);
    /* vmalloc: 각 페이지마다 paddr이 불규칙 */
    /* kmalloc: paddr이 연속적으로 증가 */
}

/* 중간 크기: kvmalloc — kmalloc 먼저 시도, 실패 시 vmalloc */
void *buf = kvmalloc(size, GFP_KERNEL);
kvfree(buf);`

// ─────────────────────────────────────────────────────────────────────────────
// 3.9  kswapd와 메모리 회수
// ─────────────────────────────────────────────────────────────────────────────
const kswapdBashCode = `# 워터마크 확인
cat /proc/zoneinfo | grep -E "min|low|high|free"

# LRU 리스트 현황
cat /proc/meminfo | grep -E "Active|Inactive|Cached|SwapCached"

# kswapd 활동 확인
vmstat 1 5
# si(swap in), so(swap out) 컬럼이 0이면 정상
# pgscand: 직접 회수 횟수

# 페이지 회수 통계
cat /proc/vmstat | grep -E "pgscan|pgsteal|pgswap"

# 특정 프로세스 페이지 회수 제한
echo mlock > /proc/sys/vm/swappiness  # 0~100, 낮을수록 스왑 자제
echo 10 > /proc/sys/vm/swappiness     # 데이터베이스 권장값`

const kswapdCCode = `/* kswapd 메인 루프 */
static int kswapd(void *p)
{
    pg_data_t *pgdat = (pg_data_t *)p;

    for ( ; ; ) {
        /* 워터마크 이하가 되면 깨어남 */
        wait_event_freezable(pgdat->kswapd_wait,
                             kswapd_work_pending(pgdat));

        /* 페이지 회수 시작 */
        balance_pgdat(pgdat, ...);
        /*   └─ shrink_node()
               └─ shrink_list() : Active → Inactive 강등
               └─ reclaim_clean_pages() : 파일 캐시 먼저
               └─ swap_out() : 익명 페이지 → 스왑 */
    }
}`

// ─────────────────────────────────────────────────────────────────────────────
// 3.10  Huge Pages / THP
// ─────────────────────────────────────────────────────────────────────────────
const hugepagesBashCode = `# === 명시적 Huge Pages ===
# 2MB Huge Page 1024개 예약 (= 2GB)
echo 1024 > /proc/sys/vm/nr_hugepages

# 현재 상태 확인
cat /proc/meminfo | grep -i huge
# HugePages_Total: 1024
# HugePages_Free:  1020
# Hugepagesize:    2048 kB

# 1GB Huge Page (부팅 파라미터)
# hugepagesz=1G hugepages=16

# === THP 설정 ===
# THP 상태 확인/변경
cat /sys/kernel/mm/transparent_hugepage/enabled
# [always] madvise never

echo madvise > /sys/kernel/mm/transparent_hugepage/enabled
# always: 항상 THP 시도
# madvise: MADV_HUGEPAGE 요청 시에만
# never: THP 비활성화 (Redis, Cassandra 권장)

# THP 통계
cat /proc/vmstat | grep thp
# thp_fault_alloc: THP로 할당된 횟수
# thp_collapse_alloc: khugepaged 병합 횟수

# === 애플리케이션에서 명시적 사용 ===
# madvise로 특정 영역만 THP 요청
madvise(ptr, size, MADV_HUGEPAGE);   # THP 요청
madvise(ptr, size, MADV_NOHUGEPAGE); # THP 억제 (Redis 등)`

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Layout helpers
// ─────────────────────────────────────────────────────────────────────────────
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

// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Topic03() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'

    const slubRenderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
            renderSlubViz(svg, width, height)
        },
        [theme],
    )

    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Topic 03
                </p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    가상 메모리와 메모리 관리
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    Virtual Memory &amp; Memory Management
                </p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    가상주소와 물리주소, 페이지 테이블, mm_struct/VMA, Page Fault, Buddy/SLUB, TLB, Huge Pages
                </p>
            </header>

            {/* 3.1 Virtual Address Space */}
            <Section id="s331" title="3.1  가상 주소 공간">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          x86-64 리눅스는 48비트 가상 주소(256TB)를 사용합니다. 하위 128TB는 유저 공간, 상위 128TB는 커널 공간이며,
          중간의 비-정규(non-canonical) 구간에 접근하면 즉시 예외가 발생합니다.
                </p>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">높은 주소 ↑</span>
                    </div>
                    <VirtualAddressViz />
                    <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">낮은 주소 ↓</span>
                    </div>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-xs">
                    {[
                        { color: 'bg-violet-700', label: '커널 공간' },
                        { color: 'bg-amber-700', label: 'stack' },
                        { color: 'bg-purple-700', label: 'mmap / libs' },
                        { color: 'bg-emerald-700', label: 'heap' },
                        { color: 'bg-blue-700', label: 'BSS / data / text' },
                    ].map(l => (
                        <div key={l.label} className="flex items-center gap-1.5">
                            <div className={`w-3 h-3 rounded ${l.color}`} />
                            <span className="text-gray-600 dark:text-gray-400">{l.label}</span>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 3.2 Page Table Walk */}
            <Section id="s332" title="3.2  페이지와 페이지 테이블">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          가상 주소는 4단계 페이지 테이블을 통해 물리 주소로 변환됩니다. 각 레벨이 9비트를 인덱스로 사용하고,
          마지막 12비트가 page offset입니다.
                </p>
                <AnimatedDiagram
                    steps={pageTableSteps}
                    renderStep={step => <PageTableWalkViz step={step} />}
                    autoPlayInterval={2500}
                />

                {/* VA bit-field 시각화 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 space-y-3">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">VA 비트 분해 — 48비트 가상 주소 구조</div>
                    <div className="flex flex-wrap gap-1 font-mono text-xs">
                        {[
                            { label: 'PGD', bits: '[47:39]', width: '9bit', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-800 dark:text-purple-200', border: 'border-purple-300 dark:border-purple-700' },
                            { label: 'PUD', bits: '[38:30]', width: '9bit', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-800 dark:text-blue-200', border: 'border-blue-300 dark:border-blue-700' },
                            { label: 'PMD', bits: '[29:21]', width: '9bit', bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-800 dark:text-emerald-200', border: 'border-emerald-300 dark:border-emerald-700' },
                            { label: 'PTE', bits: '[20:12]', width: '9bit', bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-300 dark:border-amber-700' },
                            { label: 'Offset', bits: '[11:0]', width: '12bit', bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-800 dark:text-red-200', border: 'border-red-300 dark:border-red-700' },
                        ].map(f => (
                            <div key={f.label} className={`flex-1 min-w-[60px] rounded border ${f.bg} ${f.border} px-2 py-1.5 text-center`}>
                                <div className={`font-bold ${f.text}`}>{f.label}</div>
                                <div className="text-gray-500 dark:text-gray-400 text-[10px]">{f.bits}</div>
                                <div className="text-gray-400 dark:text-gray-500 text-[10px]">{f.width}</div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        각 레벨은 9비트(= 512가지 엔트리)로 테이블을 인덱싱합니다. Page Offset 12비트는 4KB 페이지 내 위치(0~4095)를 가리킵니다.
                        48비트 = 9+9+9+9+12 = 4레벨 × 9비트 + 12비트 offset.
                    </p>
                </div>

                {/* CR3/PGD/PUD/PMD/PTE/Offset 용어 설명 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                        { term: 'CR3', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', desc: 'Control Register 3. 현재 프로세스의 PGD 물리 주소를 저장하는 CPU 레지스터. 컨텍스트 스위치 시 변경됨.' },
                        { term: 'PGD', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800', desc: 'Page Global Directory. 4단계 중 최상위. VA bits[47:39]로 인덱싱. 엔트리가 PUD의 물리 주소를 가리킴.' },
                        { term: 'PUD', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800', desc: 'Page Upper Directory. 2번째 레벨. VA bits[38:30]로 인덱싱. 엔트리가 PMD 물리 주소를 가리킴.' },
                        { term: 'PMD', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', desc: 'Page Middle Directory. 3번째 레벨. VA bits[29:21]로 인덱싱. 엔트리가 PTE 테이블 물리 주소를 가리킴.' },
                        { term: 'PTE', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', desc: 'Page Table Entry. 최하위 레벨. VA bits[20:12]로 인덱싱. PFN(물리 페이지 번호) + 접근 권한 비트(Present, RW, User, NX) 저장.' },
                        { term: 'Offset', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', desc: 'Page Offset. VA bits[11:0], 12비트. 4KB 페이지 내에서의 바이트 위치. PTE에서 얻은 PFN << 12 + Offset = 최종 물리 주소.' },
                    ].map(item => (
                        <div key={item.term} className={`rounded-lg border p-3 ${item.bg}`}>
                            <div className={`font-mono font-bold text-sm mb-1 ${item.color}`}>{item.term}</div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                {/* TLB */}
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">
          TLB (Translation Lookaside Buffer) — 주소 변환 캐시
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          4단계 페이지 테이블 워크는 메모리를 최대 4번 참조해야 합니다(PGD→PUD→PMD→PTE). 매 메모리 접근마다 이 과정을
          반복하면 성능이 심각하게 저하됩니다. CPU는 최근 변환 결과를 TLB라는 하드웨어 캐시에 저장해 이 문제를 해결합니다.
                </p>

                {/* TLB Hit vs Miss 비교 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* TLB Hit */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-3">TLB Hit — 빠른 경로</div>
                        <div className="flex flex-col items-center gap-1 text-xs font-mono">
                            <div className="w-full rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-3 py-2 text-center text-gray-800 dark:text-gray-200">
                VA (가상 주소)
                            </div>
                            <div className="text-gray-400">↓</div>
                            <div className="w-full rounded-lg bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-600 px-3 py-2 text-center text-emerald-700 dark:text-emerald-300 font-bold">
                TLB 조회 (Hit!)
                            </div>
                            <div className="text-gray-400">↓</div>
                            <div className="w-full rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 px-3 py-2 text-center text-gray-800 dark:text-gray-200">
                PA (물리 주소) 즉시 반환
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
              보통 1 사이클 (&lt; 1ns)
                        </div>
                    </div>

                    {/* TLB Miss */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-3">TLB Miss — 느린 경로</div>
                        <div className="flex flex-col items-center gap-1 text-xs font-mono">
                            <div className="w-full rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-center text-gray-800 dark:text-gray-200">
                VA (가상 주소)
                            </div>
                            <div className="text-gray-400">↓</div>
                            <div className="w-full rounded-lg bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 px-3 py-2 text-center text-red-700 dark:text-red-300 font-bold">
                TLB Miss
                            </div>
                            <div className="text-gray-400">↓</div>
                            <div className="w-full rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-2 text-center text-gray-800 dark:text-gray-200">
                Page Table Walk (4단계)
                            </div>
                            <div className="text-gray-400">↓</div>
                            <div className="w-full rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 px-3 py-2 text-center text-gray-800 dark:text-gray-200">
                PA 획득 + TLB 업데이트
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
              수십~수백 사이클
                        </div>
                    </div>
                </div>

                {/* TLB Flush 설명 */}
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">
          TLB Flush — 컨텍스트 스위치 시 무효화
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          컨텍스트 스위치 시 다른 프로세스의 가상 주소 매핑이 TLB에 남으면 안 됩니다. 커널은 TLB를 무효화합니다.
                </p>
                <CodeBlock
                    language="c"
                    filename="arch/x86/include/asm/tlbflush.h"
                    code={`/* arch/x86/include/asm/tlbflush.h */

/* 현재 CPU의 전체 TLB 무효화 */
static inline void __flush_tlb_all(void)
{
    /* CR3 레지스터에 현재 값을 다시 씀 → TLB flush */
    native_write_cr3(__native_read_cr3());
}

/* 특정 가상 주소 하나만 무효화 */
static inline void flush_tlb_one_user(unsigned long addr)
{
    asm volatile("invlpg (%0)" ::"r" (addr) : "memory");
}

/* SMP 환경: 다른 CPU의 TLB도 무효화 (TLB Shootdown) */
void flush_tlb_mm_range(struct mm_struct *mm,
                        unsigned long start, unsigned long end,
                        unsigned int stride_shift, bool freed_tables)
{
    /* IPI (Inter-Processor Interrupt)로 다른 CPU에 flush 요청 */
    on_each_cpu_mask(mm_cpumask(mm), flush_tlb_func, &info, true);
}`}
                />

                {/* TLB Shootdown 설명 */}
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">
          TLB Shootdown과 관련 기법
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          멀티코어 환경에서 한 CPU가 페이지 매핑을 변경하면 다른 CPU들의 TLB도 무효화해야 합니다. 이를{' '}
                    <strong className="font-semibold text-gray-700 dark:text-gray-300">TLB Shootdown</strong>이라고 하며,
          IPI(프로세서간 인터럽트)로 구현됩니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm font-bold text-violet-600 dark:text-violet-400 mb-2">ASID</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            <strong className="text-gray-700 dark:text-gray-300">Address Space ID</strong>. 일부 아키텍처(ARM64, RISC-V)는
              TLB에 ASID 태그를 붙여 컨텍스트 스위치 시 전체 flush 없이 여러 프로세스의 엔트리가 공존 가능합니다.
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">PCID</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            <strong className="text-gray-700 dark:text-gray-300">Process Context Identifier</strong>. x86-64의 ASID 유사
              기능으로, Meltdown 패치(KPTI) 이후 성능 저하를 완화하는 데 활용됩니다.
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2">madvise + MADV_DONTNEED</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              프로세스가 직접 TLB/페이지 해제 힌트를 커널에 줄 수 있습니다. 대용량 버퍼를 해제할 때 명시적으로 호출해
              메모리 반환을 앞당깁니다.
                        </div>
                    </div>
                </div>
            </Section>

            {/* 3.3 mm_struct & VMA */}
            <Section id="s333" title="3.3  mm_struct와 VMA">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          각 프로세스는 고유한 <code className="font-mono text-blue-400">mm_struct</code>를 가지며, 이 구조체가 가상 주소
          공간 전체를 관리합니다. 가상 주소 공간 내의 각 연속된 영역은{' '}
                    <code className="font-mono text-blue-400">vm_area_struct(VMA)</code>로 표현됩니다.
                </p>
                <CodeBlock code={mmStructCode} language="c" filename="include/linux/mm_types.h" />
                <CodeBlock code={vmaCode} language="c" filename="include/linux/mm_types.h" />

                {/* VMA flags table */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden text-sm">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 font-mono text-xs">플래그</th>
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">의미</th>
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">예시 영역</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vmaFlags.map((row, i) => (
                                <tr key={row.flag} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                                    <td className="px-4 py-2 font-mono text-xs text-blue-600 dark:text-blue-400">{row.flag}</td>
                                    <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{row.desc}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono">{row.example}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* mmap 익명/파일 매핑 */}
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">mmap() — 두 가지 매핑 방식</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <code className="font-mono text-blue-400">mmap()</code>은 가상 주소 공간에 새로운 VMA를 만드는 핵심 syscall입니다.
          매핑 방식에 따라 <strong>익명 매핑</strong>과 <strong>파일 매핑</strong> 두 가지로 나뉩니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`rounded-xl border p-4 text-sm space-y-2 ${
                        isDark ? 'border-emerald-800/50 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'
                    }`}>
                        <div className={`font-bold text-base ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
              익명 매핑 (Anonymous Mapping)
                        </div>
                        <code className={`block font-mono text-xs break-all ${isDark ? 'text-emerald-200' : 'text-emerald-900'}`}>
              mmap(NULL, size, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0)
                        </code>
                        <ul className={`list-disc list-inside space-y-1 text-xs ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}>
                            <li>파일과 무관한 메모리 (heap, stack 확장, malloc 대형 할당)</li>
                            <li>처음엔 물리 페이지 없음 → 첫 접근 시 Page Fault → zero page 할당</li>
                            <li><code className="font-mono">vm_flags</code>: VM_READ | VM_WRITE | VM_ANONYMOUS</li>
                            <li>fork 시 Copy-on-Write(CoW)로 공유</li>
                        </ul>
                    </div>
                    <div className={`rounded-xl border p-4 text-sm space-y-2 ${
                        isDark ? 'border-purple-800/50 bg-purple-900/20' : 'border-purple-200 bg-purple-50'
                    }`}>
                        <div className={`font-bold text-base ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>
              파일 매핑 (File Mapping)
                        </div>
                        <code className={`block font-mono text-xs break-all ${isDark ? 'text-purple-200' : 'text-purple-900'}`}>
              mmap(NULL, size, PROT_READ, MAP_SHARED, fd, offset)
                        </code>
                        <ul className={`list-disc list-inside space-y-1 text-xs ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>
                            <li>파일 내용을 가상 주소에 직접 매핑 (page cache 공유)</li>
                            <li>read/write 없이 포인터로 파일 접근</li>
                            <li><code className="font-mono">MAP_SHARED</code>: 쓰기가 파일에 반영</li>
                            <li><code className="font-mono">MAP_PRIVATE</code>: 쓰기 시 CoW (파일 원본 보존)</li>
                            <li>실행 파일(.text), shared library(.so) 로딩에 사용</li>
                        </ul>
                    </div>
                </div>
                <CodeBlock code={mmapExampleCode} language="c" filename="mm/mmap.c 활용 예시" />
            </Section>

            {/* 3.4 Page Fault */}
            <Section id="s334" title="3.4  Page Fault">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          가상 주소에 접근했을 때 물리 페이지가 없으면 MMU가 Page Fault 예외를 발생시킵니다.
          커널은 fault 핸들러에서 적절한 물리 페이지를 확보하고 PTE를 업데이트한 뒤 명령어를 재실행합니다.
                </p>

                {/* 핵심 용어 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { term: 'MMU', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', desc: 'Memory Management Unit. CPU 안에 있는 하드웨어. 가상 주소를 물리 주소로 변환(page table walk)하고, 접근 권한을 검사한다. 변환 실패 시 #PF(Page Fault) 예외를 CPU에 전달.' },
                        { term: 'CR2', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800', desc: 'Control Register 2. Page Fault가 발생했을 때 CPU가 자동으로 fault 가상 주소를 저장하는 레지스터. 커널 핸들러 do_page_fault()가 CR2를 읽어 어느 주소에서 fault가 났는지 파악한다.' },
                        { term: 'PTE.Present', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', desc: 'Page Table Entry의 bit 0. 1이면 물리 페이지가 메모리에 존재. 0이면 MMU가 #PF를 발생. 커널이 페이지를 할당한 뒤 이 비트를 1로 세팅하고 TLB를 flush한다.' },
                    ].map(item => (
                        <div key={item.term} className={`rounded-lg border p-3 ${item.bg}`}>
                            <div className={`font-mono font-bold text-sm mb-1 ${item.color}`}>{item.term}</div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                <AnimatedDiagram
                    steps={pageFaultSteps}
                    renderStep={step => <PageFaultViz step={step} />}
                    autoPlayInterval={2500}
                />

                {/* Page fault types table */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden text-sm">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">종류</th>
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">조건</th>
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">비용</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageFaultTypes.map((row, i) => (
                                <tr key={row.type} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                                    <td className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300">{row.type}</td>
                                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">{row.cond}</td>
                                    <td className="px-4 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">{row.cost}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            {/* 3.5 Buddy Allocator */}
            <Section id="s335" title="3.5  Buddy Allocator (인터랙티브)">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <strong className="text-gray-800 dark:text-gray-200">Buddy Allocator</strong>는 아직 사용되지 않은 <strong className="text-gray-800 dark:text-gray-200">free 물리 페이지</strong>를 관리하는
          커널의 핵심 메모리 관리자입니다. Page Fault, kmalloc, mmap 등 모든 물리 페이지 할당 요청이 여기서 처리됩니다.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          커널은 물리 메모리를 2의 거듭제곱(2^order) 크기 블록으로 관리합니다. order 0 = 4KB(1 page), order 1 = 8KB,
          ..., order 10 = 4MB. 아래 시뮬레이터는 32페이지(128KB) 존에서 buddy 할당/해제를 보여줍니다.
                </p>

                <div className={`rounded-lg border px-4 py-3 text-sm ${
                    isDark ? 'border-blue-800/50 bg-blue-900/20 text-blue-200' : 'border-blue-200 bg-blue-50 text-blue-800'
                }`}>
                    <span className="font-bold">Buddy 팁:</span> Buddy란 동일 크기의 인접 블록 쌍입니다. 블록 A(PFN p, order k)의
          buddy PFN = p XOR (1 &lt;&lt; k). 둘 다 free일 때만 상위 order로 합병할 수 있습니다.
                </div>

                <BuddyAllocatorViz />
            </Section>

            {/* 3.6 SLUB Allocator */}
            <Section id="s336" title="3.6  SLUB Allocator">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          Buddy Allocator는 페이지 단위(최소 4KB)이지만, 커널은 수십~수백 바이트의 작은 객체를 자주 할당합니다.
          SLUB은 특정 크기의 객체 전용 캐시(<code className="font-mono text-blue-400">kmem_cache</code>)를 미리 만들어
          빠르게 재사용합니다.
                </p>
                <D3Container
                    renderFn={slubRenderFn}
                    deps={[theme]}
                    height={280}
                />
                <div className="flex flex-wrap gap-4 text-xs">
                    {[
                        { color: isDark ? 'bg-blue-900 border-blue-600' : 'bg-blue-100 border-blue-400', label: 'allocated 객체' },
                        { color: isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-200 border-gray-400', label: 'free 객체' },
                    ].map(l => (
                        <div key={l.label} className="flex items-center gap-1.5">
                            <div className={`w-4 h-4 rounded border ${l.color}`} />
                            <span className="text-gray-600 dark:text-gray-400">{l.label}</span>
                        </div>
                    ))}
                </div>
            </Section>

            {/* 3.7 memory cgroup */}
            <Section id="s337" title="3.7  memory cgroup">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          cgroup v2의 memory 컨트롤러를 사용하면 프로세스 그룹별로 메모리 사용량을 제한할 수 있습니다.
          컨테이너 런타임(Docker, containerd)이 이 인터페이스를 통해 컨테이너 메모리를 격리합니다.
                </p>

                {/* control files table */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden text-sm">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 font-mono text-xs">파일</th>
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">설명</th>
                            </tr>
                        </thead>
                        <tbody>
                            {memcgFiles.map((row, i) => (
                                <tr key={row.file} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                                    <td className="px-4 py-2 font-mono text-xs text-blue-600 dark:text-blue-400">{row.file}</td>
                                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">{row.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={`rounded-lg border px-4 py-3 text-sm ${
                    isDark ? 'border-red-800/50 bg-red-900/20 text-red-200' : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                    <span className="font-bold">OOM killer:</span> oom_score_adj (-1000~1000)와 oom_score 기반으로 희생 프로세스를
          선택합니다. 가장 높은 oom_score를 가진 프로세스가 먼저 kill됩니다.
                </div>

                <CodeBlock code={memcgCode} language="bash" filename="memory cgroup v2 설정" />

                {/* OOM Killer */}
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">OOM Killer — 메모리 부족 시 프로세스 종료</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          물리 메모리가 완전히 소진되면 커널 OOM Killer가 <code className="font-mono text-blue-400">oom_score</code> 기준으로
          희생 프로세스를 선택해 강제 종료합니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`rounded-xl border p-4 text-sm space-y-1 ${
                        isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                    }`}>
                        <div className={`font-bold text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>기본 점수</div>
                        <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              물리 메모리 사용량 비율 (0~1000점)
                        </div>
                    </div>
                    <div className={`rounded-xl border p-4 text-sm space-y-1 ${
                        isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                    }`}>
                        <div className={`font-bold text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>adj 보정</div>
                        <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            <code className="font-mono text-blue-400">/proc/&lt;pid&gt;/oom_score_adj</code> (-1000 ~ +1000),
              -1000이면 절대 종료 안 함
                        </div>
                    </div>
                    <div className={`rounded-xl border p-4 text-sm space-y-1 ${
                        isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                    }`}>
                        <div className={`font-bold text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>최종 score</div>
                        <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            <code className="font-mono text-blue-400">cat /proc/&lt;pid&gt;/oom_score</code> 로 확인
                        </div>
                    </div>
                </div>
                <CodeBlock code={oomBashCode} language="bash" filename="# OOM Killer 실전 관리" />
                <CodeBlock code={oomKillCode} language="c" filename="mm/oom_kill.c" />
            </Section>

            {/* 3.8 vmalloc vs kmalloc */}
            <Section id="s338" title="3.8  vmalloc vs kmalloc — 커널 메모리 할당 API">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          커널 코드에서 메모리를 동적 할당할 때 두 가지 주요 API가 있습니다. 물리적 연속성 요구 여부가 선택 기준입니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">kmalloc</div>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">물리적 연속</div>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                            <li>Buddy Allocator에서 직접 할당</li>
                            <li>물리 메모리가 연속적으로 보장</li>
                            <li>DMA에 안전 (하드웨어가 물리 주소로 접근)</li>
                            <li>최대 크기: 보통 4MB 이하</li>
                            <li>빠름 (물리→가상 주소가 고정 오프셋)</li>
                            <li className="text-gray-500 dark:text-gray-500">사용: 드라이버 버퍼, DMA 버퍼, 작은 구조체</li>
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">vmalloc</div>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">가상 연속</div>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                            <li>여러 불연속 물리 페이지를 가상 주소로 연속처럼 매핑</li>
                            <li>물리 연속성 없음 → DMA 불가</li>
                            <li>큰 크기 할당 가능 (수백MB)</li>
                            <li>느림 (페이지 테이블 조작 필요, TLB flush)</li>
                            <li className="text-gray-500 dark:text-gray-500">사용: 큰 모듈 메모리, 가상화 게스트 메모리, 큰 버퍼</li>
                        </ul>
                    </div>
                </div>
                <CodeBlock code={kmallocCode} language="c" filename="include/linux/slab.h + include/linux/vmalloc.h" />
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">플래그</th>
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">슬립</th>
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">사용 위치</th>
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">설명</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { flag: 'GFP_KERNEL', sleep: '가능', ctx: '프로세스 컨텍스트', desc: '일반적 할당' },
                                { flag: 'GFP_ATOMIC', sleep: '불가', ctx: '인터럽트/스핀락 보유 중', desc: '실패 가능성 높음' },
                                { flag: 'GFP_DMA',    sleep: '가능', ctx: 'DMA 필요',            desc: 'x86: 16MB 이하 영역' },
                                { flag: 'GFP_NOWAIT', sleep: '불가', ctx: '빠른 경로',            desc: 'ATOMIC보다 덜 엄격' },
                            ].map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 font-mono text-blue-600 dark:text-blue-400">{row.flag}</td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">{row.sleep}</td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{row.ctx}</td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{row.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            {/* 3.9 kswapd와 메모리 회수 */}
            <Section id="s339" title="3.9  kswapd와 메모리 회수 — LRU 알고리즘">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          물리 메모리가 부족해지면 커널은 사용 빈도가 낮은 페이지를 회수(reclaim)합니다. 이 작업은{' '}
                    <code className="font-mono text-blue-400">kswapd</code> 커널 스레드가 담당합니다.
                </p>
                {/* Watermark Visualization */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">메모리 존 워터마크</div>
                    <div className="flex gap-6 items-start">
                        <div className="flex flex-col border border-gray-700 rounded-lg overflow-hidden w-32">
                            <div className="bg-green-500/30 border-b border-green-500 p-2 text-xs text-center text-green-300">
                                <span className="font-mono font-bold">high</span>
                                <div className="text-[10px] text-green-400/70 mt-0.5">kswapd 슬립</div>
                            </div>
                            <div className="bg-yellow-500/30 border-b border-yellow-500 p-2 text-xs text-center text-yellow-300">
                                <span className="font-mono font-bold">low</span>
                                <div className="text-[10px] text-yellow-400/70 mt-0.5">kswapd 활성화</div>
                            </div>
                            <div className="bg-red-500/30 p-2 text-xs text-center text-red-300">
                                <span className="font-mono font-bold">min</span>
                                <div className="text-[10px] text-red-400/70 mt-0.5">direct reclaim</div>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-green-500/50 border border-green-500" />
                                <span><span className="text-green-400 font-mono">pages_high</span> 이상: 여유 상태, kswapd 대기</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-yellow-500/50 border border-yellow-500" />
                                <span><span className="text-yellow-400 font-mono">pages_low</span> 이하: kswapd 깨어나 회수 시작</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-red-500/50 border border-red-500" />
                                <span><span className="text-red-400 font-mono">pages_min</span> 이하: 프로세스가 직접 회수 (지연 발생)</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* pages_min 동작 설명 */}
                <div className={`rounded-lg border px-4 py-3 text-sm ${
                    isDark ? 'border-red-800/50 bg-red-900/20 text-red-200' : 'border-red-200 bg-red-50 text-red-800'
                }`}>
                    <div className="font-bold mb-1">⚠ pages_min 이하 — Direct Reclaim</div>
                    <p className="text-xs leading-relaxed">
                        free page가 <span className="font-mono font-bold">pages_min</span> 이하로 떨어지면 kswapd가 따라잡지 못한 위기 상태입니다.
                        이때는 메모리를 <em>요청한 그 프로세스가 직접</em> 회수(direct reclaim)를 수행해야 할당이 이루어집니다.
                        프로세스가 자신의 페이지 폴트 처리 중에 수십 ms씩 지연될 수 있어 응답 레이턴시가 급격히 나빠집니다.
                        실무에서는 <span className="font-mono">vm.min_free_kbytes</span> 튜닝과 <span className="font-mono">vm.swappiness</span> 조정으로 이 상황을 예방합니다.
                    </p>
                </div>

                {/* LRU List Table */}
                <div className="overflow-x-auto">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Linux LRU 리스트 구조 (5개)</div>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">리스트</th>
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">설명</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { list: 'Active Anonymous',   desc: '최근 접근된 익명 페이지 (heap, stack)' },
                                { list: 'Inactive Anonymous', desc: '오래된 익명 페이지 → 스왑 대상' },
                                { list: 'Active File',        desc: '최근 접근된 파일 캐시' },
                                { list: 'Inactive File',      desc: '오래된 파일 캐시 → 1순위 회수' },
                                { list: 'Unevictable',        desc: '잠금된 페이지 (mlock, 공유 메모리)' },
                            ].map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 font-mono text-purple-600 dark:text-purple-400 whitespace-nowrap">{row.list}</td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{row.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <CodeBlock code={kswapdBashCode} language="bash" filename="# 메모리 회수 상태 확인" />
                <CodeBlock code={kswapdCCode} language="c" filename="mm/vmscan.c 핵심 흐름" />
            </Section>

            {/* 3.10 Huge Pages / THP */}
            <Section id="s3310" title="3.10  Huge Pages / THP — 대형 페이지">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          표준 페이지 크기는 4KB입니다. 수십GB 메모리를 사용하는 데이터베이스나 JVM은 수백만 개의 TLB 엔트리가 필요해
          TLB miss가 심각한 성능 저하를 유발합니다. <strong className="text-gray-900 dark:text-white">Huge Pages</strong>(2MB/1GB)로
          TLB 부담을 90% 줄일 수 있습니다.
                </p>
                {/* 3-column page size comparison */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        {
                            title: '4KB 일반 페이지',
                            color: 'text-gray-600 dark:text-gray-400',
                            border: 'border-gray-300 dark:border-gray-600',
                            points: [
                                '세밀한 메모리 제어',
                                'TLB 엔트리 많이 필요',
                                '1GB → TLB 엔트리 262,144개',
                            ],
                        },
                        {
                            title: '2MB Huge Page',
                            color: 'text-blue-600 dark:text-blue-400',
                            border: 'border-blue-400 dark:border-blue-600',
                            points: [
                                '512배 큰 페이지',
                                '1GB → TLB 엔트리 512개',
                                'x86-64 기본 지원',
                            ],
                        },
                        {
                            title: '1GB Huge Page',
                            color: 'text-purple-600 dark:text-purple-400',
                            border: 'border-purple-400 dark:border-purple-600',
                            points: [
                                '데이터베이스 전용',
                                '부팅 시 예약 필요',
                                'NUMA 서버 최대 성능',
                            ],
                        },
                    ].map((card) => (
                        <div key={card.title} className={`bg-white dark:bg-gray-900 rounded-xl border p-4 space-y-2 ${card.border}`}>
                            <div className={`text-sm font-bold ${card.color}`}>{card.title}</div>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                                {card.points.map((p) => <li key={p}>{p}</li>)}
                            </ul>
                        </div>
                    ))}
                </div>
                {/* THP vs explicit comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400">명시적 Huge Pages (HugeTLBfs)</div>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                            <li>부팅 시 또는 sysctl로 미리 예약</li>
                            <li>애플리케이션이 <code className="font-mono text-blue-400">mmap(MAP_HUGETLB)</code> 명시적 사용</li>
                            <li>예측 가능, 단편화 없음</li>
                            <li className="text-gray-500 dark:text-gray-500">Oracle DB, DPDK에서 선호</li>
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">THP (Transparent Huge Pages)</div>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                            <li>커널이 자동으로 4KB → 2MB 병합</li>
                            <li>애플리케이션 수정 불필요</li>
                            <li><code className="font-mono text-blue-400">khugepaged</code> 데몬이 백그라운드 병합</li>
                            <li className="text-gray-500 dark:text-gray-500">가끔 병합/분리 오버헤드 발생 (지연 스파이크)</li>
                        </ul>
                    </div>
                </div>
                <CodeBlock code={hugepagesBashCode} language="bash" filename="# Huge Pages 설정" />
                {/* Practical recommendations */}
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">실전 권장 설정</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        {
                            title: '데이터베이스 (Oracle, PostgreSQL)',
                            color: 'text-orange-600 dark:text-orange-400',
                            desc: '명시적 HugeTLBfs + THP never. 예측 가능한 지연이 중요.',
                        },
                        {
                            title: 'JVM (Java)',
                            color: 'text-blue-600 dark:text-blue-400',
                            desc: 'THP madvise + -XX:+UseTransparentHugePages. 힙 영역만 THP 적용.',
                        },
                        {
                            title: 'Redis / Cassandra',
                            color: 'text-red-600 dark:text-red-400',
                            desc: 'THP never. fork() 시 CoW로 인한 THP 분리가 심각한 지연 유발.',
                        },
                    ].map((card) => (
                        <div key={card.title} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-1">
                            <div className={`text-sm font-bold ${card.color}`}>{card.title}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{card.desc}</div>
                        </div>
                    ))}
                </div>
            </Section>

            <nav className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 flex items-center justify-between">
                <div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">이전 토픽</div>
                    <a href="#/topic/02-scheduler" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        ← 02 · 프로세스, 스레드, 스케줄러
                    </a>
                </div>
                <div className="text-right">
                    <div className="text-xs text-gray-500 dark:text-gray-500 mb-1">다음 토픽</div>
                    <a href="#/topic/04-filesystem" className="font-semibold text-gray-900 dark:text-gray-200 text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        04 · VFS와 파일시스템 →
                    </a>
                </div>
            </nav>
        </div>
    )
}
