import { useCallback } from 'react'
import * as d3 from 'd3'
import { KernelRef } from '../../components/ui/KernelRef'
import * as snippets from './codeSnippets'
import {
    VirtualAddressViz,
    MultiProcessVAViz,
    VABitBreakdown,
} from '../../components/concepts/memory/VirtualAddressViz'
import { PageTableWalkViz } from '../../components/concepts/memory/PageTableViz'
import { PageFaultViz } from '../../components/concepts/memory/PageFaultViz'
import { BuddyAllocatorViz } from '../../components/concepts/memory/BuddyAllocatorViz'
import { CoWAnimationViz } from '../../components/concepts/memory/CoWAnimationViz'

import { renderSlubViz } from '../../components/concepts/memory/SlubViz'
import { Alert, AnimatedDiagram, CardGrid, CodeBlock, D3Container, InfoBox, InfoTable, Prose, Section, T, useTheme , TopicPage } from '@study-ui/components'

// VirtualAddressViz, MultiProcessVAViz → extracted to components/concepts/memory/VirtualAddressViz.tsx

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
        description:
            'CR3 레지스터가 PGD 물리 주소를 가리킵니다. bits[47:39]로 PGD 엔트리를 찾아 PUD 물리 주소를 얻습니다.',
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
// PageTableWalkViz, VABitBreakdown → extracted to components/concepts/memory/PageTableViz.tsx

// ─────────────────────────────────────────────────────────────────────────────
// 3.3  mm_struct & VMA code
// ─────────────────────────────────────────────────────────────────────────────

const vmaFlags = [
    { flag: 'VM_READ', desc: '읽기 가능', example: '.text, .rodata' },
    { flag: 'VM_WRITE', desc: '쓰기 가능', example: '.data, heap, stack' },
    { flag: 'VM_EXEC', desc: '실행 가능', example: '.text' },
    { flag: 'VM_SHARED', desc: '공유 매핑 (MAP_SHARED)', example: 'shared memory' },
    { flag: 'VM_GROWSDOWN', desc: '하향 성장', example: 'stack' },
]

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
        description:
            '페이지 테이블 PTE의 Present 비트가 0이면 MMU가 #PF 예외를 발생시키고 CR2 레지스터에 fault 주소를 저장합니다.',
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
        description:
            'fault 난 명령어부터 재실행합니다. 이번에는 TLB hit 또는 page table walk 성공으로 정상 접근됩니다.',
    },
]

const pageFaultTypes = [
    { type: 'Minor', cond: '물리 페이지 없음, 디스크 불필요', cost: '낮음 (µs)' },
    { type: 'Major', cond: '디스크 swap/파일 로드 필요', cost: '높음 (ms)' },
    { type: 'Invalid', cond: '잘못된 주소 / 권한 위반', cost: 'SIGSEGV' },
]
// PageFaultViz → extracted to components/concepts/memory/PageFaultViz.tsx
// BuddyAllocatorViz → extracted to components/concepts/memory/BuddyAllocatorViz.tsx

// renderSlubViz → extracted to components/concepts/memory/SlubViz.tsx

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

// ─────────────────────────────────────────────────────────────────────────────
// 3.8  vmalloc vs kmalloc
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 3.9  kswapd와 메모리 회수
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 3.10  Huge Pages / THP
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 3.11  CoW — Copy-on-Write
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 3.12  NUMA 메모리 정책
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────────────────────
export default function Topic03() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const slubRenderFn = useCallback(
        (svg: d3.Selection<SVGSVGElement, unknown, null, undefined>, width: number, height: number) => {
            renderSlubViz(svg, width, height)
        },
        [isDark], // eslint-disable-line react-hooks/exhaustive-deps
    )

    return (
        <TopicPage topicId="03-memory" learningItems={[
                    '가상 주소를 물리 주소로 번역하는 페이지 테이블 4단계 구조를 이해합니다',
                    'Page Fault 발생 시 커널이 어떻게 처리하는지, CoW 최적화를 배웁니다',
                    'Buddy Allocator와 SLUB Allocator가 메모리를 어떻게 할당하는지 파악합니다',
                ]}>
            {/* Header */}

            {/* 3.1 Virtual Address Space */}
            <Section id="s331" title="3.1  가상 주소 공간">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    리눅스의 가장 중요한 보안·격리 원칙 중 하나:{' '}
                    <strong className="text-gray-800 dark:text-gray-200">
                        모든 프로세스는 자신만의 독립된 가상 주소 공간을 가집니다.
                    </strong>{' '}
                    x86-64에서 각 프로세스는 0부터 0x00007FFFFFFFFFFF까지 128TB의 유저 공간을 독점적으로 사용합니다.
                    프로세스 A의 주소 0x00400000과 프로세스 B의 주소 0x00400000은{' '}
                    <em>이름만 같을 뿐, 전혀 다른 물리 페이지</em>를 가리킵니다.
                </p>

                {/* 프로세스별 가상 주소 공간 격리 */}
                <MultiProcessVAViz />

                {/* 핵심 포인트 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 p-3">
                        <div className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">같은 VA, 다른 PA</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            nginx와 python이 모두 <code className="font-mono">0x00400000</code>을 사용하지만, 각자의
                            페이지 테이블이 서로 다른 물리 페이지로 안내합니다. 한 프로세스가 다른 프로세스의 메모리에
                            접근하는 것은 불가능합니다.
                        </p>
                    </div>
                    <div className="rounded-lg border border-violet-200 dark:border-violet-900 bg-violet-50 dark:bg-violet-950/30 p-3">
                        <div className="text-xs font-bold text-violet-700 dark:text-violet-300 mb-1">
                            커널 공간은 공유
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            0xFFFF800000000000 이상 커널 공간은 모든 프로세스가 동일한 물리 주소에 매핑됩니다. 시스템
                            콜을 통해 커널에 진입하면 커널은 어느 프로세스에서든 같은 코드·데이터를 씁니다.
                        </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">어떻게 가능한가?</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            각 프로세스는 고유한{' '}
                            <strong className="text-gray-800 dark:text-gray-200">페이지 테이블</strong>을 갖습니다.
                            컨텍스트 스위치 시 CPU의 <code className="font-mono text-blue-500">CR3</code> 레지스터가
                            해당 프로세스의 PGD 주소로 교체됩니다. (§3.2 참고)
                        </p>
                    </div>
                </div>

                {/* 구체적 예시 */}
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        isDark
                            ? 'border-gray-700 bg-gray-800/50 text-gray-300'
                            : 'border-gray-200 bg-gray-50 text-gray-700'
                    }`}
                >
                    <div className="font-bold mb-1 text-gray-800 dark:text-gray-200">구체적 예시</div>
                    <div className="font-mono text-xs space-y-1 text-gray-600 dark:text-gray-400">
                        <div>
                            <span className="text-blue-500">nginx</span> PID 1234: VA{' '}
                            <span className="text-amber-500">0x00400000</span> → PA{' '}
                            <span className="text-blue-600 dark:text-blue-400">0x1A3F_0000</span> (nginx 바이너리 코드)
                        </div>
                        <div>
                            <span className="text-emerald-500">python</span> PID 5678: VA{' '}
                            <span className="text-amber-500">0x00400000</span> → PA{' '}
                            <span className="text-emerald-400">0x2B70_0000</span> (python 인터프리터 코드)
                        </div>
                        <div>
                            <span className="text-amber-500">bash</span> PID 9012: VA{' '}
                            <span className="text-amber-500">0x00400000</span> → PA{' '}
                            <span className="text-amber-400">0x3C81_0000</span> (bash 바이너리 코드)
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        가상 주소는 동일하지만, 각자의 페이지 테이블이 전혀 다른 물리 페이지를 가리킵니다.
                    </p>
                </div>

                {/* 단일 프로세스 상세 레이아웃 */}
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                    단일 프로세스의 가상 주소 레이아웃 (x86-64)
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    48비트 주소 공간(256TB) 중 상위 128TB는 커널 전용, 하위 128TB는 유저 공간입니다. 중간의
                    non-canonical 구간에 접근하면 즉시 #GP 예외가 발생합니다.
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
                        { color: 'bg-violet-700', label: '커널 공간 (공유)' },
                        { color: 'bg-amber-700', label: 'stack' },
                        { color: 'bg-purple-700', label: 'mmap / libs' },
                        { color: 'bg-emerald-700', label: 'heap' },
                        { color: 'bg-blue-700', label: 'BSS / data / text' },
                    ].map((l) => (
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
                    renderStep={(step) => <PageTableWalkViz step={step} />}
                    autoPlayInterval={2500}
                />

                {/* VA bit-field 실제 분해 시각화 */}
                <VABitBreakdown />

                {/* CR3/PGD/PUD/PMD/PTE/Offset 용어 설명 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[
                        {
                            term: 'CR3',
                            color: 'text-blue-600 dark:text-blue-400',
                            bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
                            desc: 'Control Register 3. 현재 프로세스의 PGD 물리 주소를 저장하는 CPU 레지스터. 컨텍스트 스위치 시 변경됨.',
                        },
                        {
                            term: 'PGD',
                            color: 'text-purple-600 dark:text-purple-400',
                            bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
                            desc: 'Page Global Directory. 4단계 중 최상위. VA bits[47:39]로 인덱싱. 엔트리가 PUD의 물리 주소를 가리킴.',
                        },
                        {
                            term: 'PUD',
                            color: 'text-indigo-600 dark:text-indigo-400',
                            bg: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
                            desc: 'Page Upper Directory. 2번째 레벨. VA bits[38:30]로 인덱싱. 엔트리가 PMD 물리 주소를 가리킴.',
                        },
                        {
                            term: 'PMD',
                            color: 'text-emerald-600 dark:text-emerald-400',
                            bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
                            desc: 'Page Middle Directory. 3번째 레벨. VA bits[29:21]로 인덱싱. 엔트리가 PTE 테이블 물리 주소를 가리킴.',
                        },
                        {
                            term: 'PTE',
                            color: 'text-amber-600 dark:text-amber-400',
                            bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
                            desc: 'Page Table Entry. 최하위 레벨. VA bits[20:12]로 인덱싱. PFN(물리 페이지 번호) + 접근 권한 비트(Present, RW, User, NX) 저장.',
                        },
                        {
                            term: 'Offset',
                            color: 'text-red-600 dark:text-red-400',
                            bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
                            desc: 'Page Offset. VA bits[11:0], 12비트. 4KB 페이지 내에서의 바이트 위치. PTE에서 얻은 PFN << 12 + Offset = 최종 물리 주소.',
                        },
                    ].map((item) => (
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
                    4단계 페이지 테이블 워크는 메모리를 최대 4번 참조해야 합니다(PGD→PUD→PMD→PTE). 매 메모리 접근마다 이
                    과정을 반복하면 성능이 심각하게 저하됩니다. CPU는 최근 변환 결과를 <T id="tlb">TLB</T>라는 하드웨어
                    캐시에 저장해 이 문제를 해결합니다.
                </p>

                {/* TLB Hit vs Miss 비교 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* TLB Hit */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                            TLB Hit — 빠른 경로
                        </div>
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
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mb-3">
                            TLB Miss — 느린 경로
                        </div>
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
                    컨텍스트 스위치 시 다른 프로세스의 가상 주소 매핑이 TLB에 남으면 안 됩니다. 커널은 TLB를
                    무효화합니다.
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
                    <strong className="font-semibold text-gray-700 dark:text-gray-300">TLB Shootdown</strong>이라고
                    하며, IPI(프로세서간 인터럽트)로 구현됩니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm font-bold text-violet-600 dark:text-violet-400 mb-2">ASID</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            <strong className="text-gray-700 dark:text-gray-300">Address Space ID</strong>. 일부
                            아키텍처(ARM64, RISC-V)는 TLB에 ASID 태그를 붙여 컨텍스트 스위치 시 전체 flush 없이 여러
                            프로세스의 엔트리가 공존 가능합니다.
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">PCID</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            <strong className="text-gray-700 dark:text-gray-300">Process Context Identifier</strong>.
                            x86-64의 ASID 유사 기능으로, Meltdown 패치(KPTI) 이후 성능 저하를 완화하는 데 활용됩니다.
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                            madvise + MADV_DONTNEED
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            프로세스가 직접 TLB/페이지 해제 힌트를 커널에 줄 수 있습니다. 대용량 버퍼를 해제할 때
                            명시적으로 호출해 메모리 반환을 앞당깁니다.
                        </div>
                    </div>
                </div>
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="arch/x86/mm/pgtable.c" label="pgtable.c" />
                        <KernelRef path="arch/x86/include/asm/pgtable_types.h" label="pgtable_types.h" />
                        <KernelRef path="mm/memory.c" sym="handle_mm_fault" />
                    </div>
                </InfoBox>
            </Section>

            {/* 3.3 mm_struct & VMA */}
            <Section id="s333" title="3.3  mm_struct와 VMA">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    각 프로세스는 고유한 <code className="font-mono text-blue-600 dark:text-blue-400">mm_struct</code>를 가지며, 이
                    구조체가 가상 주소 공간 전체를 관리합니다. 가상 주소 공간 내의 각 연속된 영역은{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">vm_area_struct(VMA)</code>로 표현됩니다.
                </p>
                <CodeBlock code={snippets.mmStructCode} language="c" filename="include/linux/mm_types.h" />
                <CodeBlock code={snippets.vmaCode} language="c" filename="include/linux/mm_types.h" />
                <div className="mt-2 flex flex-wrap gap-2">
                    <KernelRef path="include/linux/mm_types.h" sym="mm_struct" label="mm_struct" />
                    <KernelRef path="include/linux/mm_types.h" sym="vm_area_struct" label="vm_area_struct" />
                </div>

                {/* VMA flags table */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden text-sm">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">
                                    플래그
                                </th>
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">의미</th>
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">
                                    예시 영역
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {vmaFlags.map((row, i) => (
                                <tr
                                    key={row.flag}
                                    className={
                                        i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                                    }
                                >
                                    <td className="px-4 py-2 font-mono text-xs text-blue-600 dark:text-blue-600 dark:text-blue-400">
                                        {row.flag}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-700 dark:text-gray-300">{row.desc}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {row.example}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* mmap 익명/파일 매핑 */}
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">
                    mmap() — 두 가지 매핑 방식
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <code className="font-mono text-blue-600 dark:text-blue-400">mmap()</code>은 가상 주소 공간에 새로운{' '}
                    <T id="vma">VMA</T>를 만드는 핵심 syscall입니다. 매핑 방식에 따라 <strong>익명 매핑</strong>과{' '}
                    <strong>파일 매핑</strong> 두 가지로 나뉩니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                        className={`rounded-xl border p-4 text-sm space-y-2 ${
                            isDark ? 'border-emerald-800/50 bg-emerald-900/20' : 'border-emerald-200 bg-emerald-50'
                        }`}
                    >
                        <div className={`font-bold text-base ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                            익명 매핑 (Anonymous Mapping)
                        </div>
                        <code
                            className={`block font-mono text-xs break-all ${isDark ? 'text-emerald-200' : 'text-emerald-900'}`}
                        >
                            mmap(NULL, size, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0)
                        </code>
                        <ul
                            className={`list-disc list-inside space-y-1 text-xs ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}
                        >
                            <li>파일과 무관한 메모리 (heap, stack 확장, malloc 대형 할당)</li>
                            <li>처음엔 물리 페이지 없음 → 첫 접근 시 Page Fault → zero page 할당</li>
                            <li>
                                <code className="font-mono">vm_flags</code>: VM_READ | VM_WRITE | VM_ANONYMOUS
                            </li>
                            <li>fork 시 Copy-on-Write(<T id="cow">CoW</T>)로 공유</li>
                        </ul>
                    </div>
                    <div
                        className={`rounded-xl border p-4 text-sm space-y-2 ${
                            isDark ? 'border-purple-800/50 bg-purple-900/20' : 'border-purple-200 bg-purple-50'
                        }`}
                    >
                        <div className={`font-bold text-base ${isDark ? 'text-purple-300' : 'text-purple-800'}`}>
                            파일 매핑 (File Mapping)
                        </div>
                        <code
                            className={`block font-mono text-xs break-all ${isDark ? 'text-purple-200' : 'text-purple-900'}`}
                        >
                            mmap(NULL, size, PROT_READ, MAP_SHARED, fd, offset)
                        </code>
                        <ul
                            className={`list-disc list-inside space-y-1 text-xs ${isDark ? 'text-purple-200' : 'text-purple-800'}`}
                        >
                            <li>파일 내용을 가상 주소에 직접 매핑 (<T id="page_cache">page cache</T> 공유)</li>
                            <li>read/write 없이 포인터로 파일 접근</li>
                            <li>
                                <code className="font-mono">MAP_SHARED</code>: 쓰기가 파일에 반영
                            </li>
                            <li>
                                <code className="font-mono">MAP_PRIVATE</code>: 쓰기 시 CoW (파일 원본 보존)
                            </li>
                            <li>실행 파일(.text), shared library(.so) 로딩에 사용</li>
                        </ul>
                    </div>
                </div>
                <CodeBlock code={snippets.mmapExampleCode} language="c" filename="mm/mmap.c 활용 예시" />
            </Section>

            {/* 3.4 Page Fault */}
            <Section id="s334" title="3.4  Page Fault">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    가상 주소에 접근했을 때 물리 페이지가 없으면 MMU가 <T id="page_fault">Page Fault</T> 예외를
                    발생시킵니다. 커널은 fault 핸들러에서 적절한 물리 페이지를 확보하고 PTE를 업데이트한 뒤 명령어를
                    재실행합니다.
                </p>

                {/* 핵심 용어 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        {
                            term: 'MMU',
                            color: 'text-blue-600 dark:text-blue-400',
                            bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
                            desc: 'Memory Management Unit. CPU 안에 있는 하드웨어. 가상 주소를 물리 주소로 변환(page table walk)하고, 접근 권한을 검사한다. 변환 실패 시 #PF(Page Fault) 예외를 CPU에 전달.',
                        },
                        {
                            term: 'CR2',
                            color: 'text-orange-600 dark:text-orange-400',
                            bg: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
                            desc: 'Control Register 2. Page Fault가 발생했을 때 CPU가 자동으로 fault 가상 주소를 저장하는 레지스터. 커널 핸들러 do_page_fault()가 CR2를 읽어 어느 주소에서 fault가 났는지 파악한다.',
                        },
                        {
                            term: 'PTE.Present',
                            color: 'text-emerald-600 dark:text-emerald-400',
                            bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
                            desc: 'Page Table Entry의 bit 0. 1이면 물리 페이지가 메모리에 존재. 0이면 MMU가 #PF를 발생. 커널이 페이지를 할당한 뒤 이 비트를 1로 세팅하고 TLB를 flush한다.',
                        },
                    ].map((item) => (
                        <div key={item.term} className={`rounded-lg border p-3 ${item.bg}`}>
                            <div className={`font-mono font-bold text-sm mb-1 ${item.color}`}>{item.term}</div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                <AnimatedDiagram
                    steps={pageFaultSteps}
                    renderStep={(step) => <PageFaultViz step={step} />}
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
                                <tr
                                    key={row.type}
                                    className={
                                        i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                                    }
                                >
                                    <td className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                        {row.type}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">{row.cond}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                                        {row.cost}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>

            {/* 3.5 Buddy Allocator */}
            <Section id="s335" title="3.5  Buddy Allocator (인터랙티브)">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <strong className="text-gray-800 dark:text-gray-200">
                        <T id="buddy_allocator">Buddy Allocator</T>
                    </strong>
                    는 아직 사용되지 않은 <strong className="text-gray-800 dark:text-gray-200">free 물리 페이지</strong>
                    를 관리하는 커널의 핵심 메모리 관리자입니다. <T id="page_fault">Page Fault</T>, kmalloc,{' '}
                    <T id="mmap">mmap</T> 등 모든 물리 페이지 할당 요청이 여기서 처리됩니다.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    커널은 물리 메모리를 2의 거듭제곱(2^order) 크기 블록으로 관리합니다. order 0 = 4KB(1 page), order 1
                    = 8KB, ..., order 10 = 4MB. 아래 시뮬레이터는 32페이지(128KB) 존에서 buddy 할당/해제를 보여줍니다.
                </p>

                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        isDark
                            ? 'border-blue-800/50 bg-blue-900/20 text-blue-200'
                            : 'border-blue-200 bg-blue-50 text-blue-800'
                    }`}
                >
                    <span className="font-bold">Buddy 팁:</span> Buddy란 동일 크기의 인접 블록 쌍입니다. 블록 A(PFN p,
                    order k)의 buddy PFN = p XOR (1 &lt;&lt; k). 둘 다 free일 때만 상위 order로 합병할 수 있습니다.
                </div>

                <BuddyAllocatorViz />
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="mm/page_alloc.c" sym="__alloc_pages" />
                        <KernelRef path="mm/page_alloc.c" sym="__free_pages" />
                        <KernelRef path="include/linux/gfp.h" label="gfp.h" />
                    </div>
                </InfoBox>
            </Section>

            {/* 3.6 SLUB Allocator */}
            <Section id="s336" title="3.6  SLUB Allocator">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T id="buddy_allocator">Buddy Allocator</T>는 페이지 단위(최소 4KB)이지만, 커널은 수십~수백 바이트의
                    작은 객체를 자주 할당합니다.
                    <T id="slub">SLUB</T>은 특정 크기의 객체 전용 캐시(
                    <code className="font-mono text-blue-600 dark:text-blue-400">kmem_cache</code>)를 미리 만들어 빠르게 재사용합니다.
                </p>
                <D3Container renderFn={slubRenderFn} deps={[theme]} height={280} />
                <div className="flex flex-wrap gap-4 text-xs">
                    {[
                        {
                            color: isDark ? 'bg-blue-900 border-blue-600' : 'bg-blue-100 border-blue-400',
                            label: 'allocated 객체',
                        },
                        {
                            color: isDark ? 'bg-gray-800 border-gray-600' : 'bg-gray-200 border-gray-400',
                            label: 'free 객체',
                        },
                    ].map((l) => (
                        <div key={l.label} className="flex items-center gap-1.5">
                            <div className={`w-4 h-4 rounded border ${l.color}`} />
                            <span className="text-gray-600 dark:text-gray-400">{l.label}</span>
                        </div>
                    ))}
                </div>
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="mm/slub.c" sym="kmem_cache_alloc" />
                        <KernelRef path="mm/slub.c" sym="kmem_cache_create" />
                        <KernelRef path="include/linux/slab.h" label="slab.h" />
                    </div>
                </InfoBox>
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
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">
                                    파일
                                </th>
                                <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 text-xs">설명</th>
                            </tr>
                        </thead>
                        <tbody>
                            {memcgFiles.map((row, i) => (
                                <tr
                                    key={row.file}
                                    className={
                                        i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                                    }
                                >
                                    <td className="px-4 py-2 font-mono text-xs text-blue-600 dark:text-blue-600 dark:text-blue-400">
                                        {row.file}
                                    </td>
                                    <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">{row.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        isDark
                            ? 'border-red-800/50 bg-red-900/20 text-red-200'
                            : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                >
                    <span className="font-bold">OOM killer:</span> oom_score_adj (-1000~1000)와 oom_score 기반으로 희생
                    프로세스를 선택합니다. 가장 높은 oom_score를 가진 프로세스가 먼저 kill됩니다.
                </div>

                <CodeBlock code={snippets.memcgCode} language="bash" filename="memory cgroup v2 설정" />

                {/* OOM Killer */}
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mt-6">
                    OOM Killer — 메모리 부족 시 프로세스 종료
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    물리 메모리가 완전히 소진되면 커널 <T id="oom_killer">OOM Killer</T>가{' '}
                    <code className="font-mono text-blue-600 dark:text-blue-400">oom_score</code> 기준으로 희생 프로세스를 선택해 강제
                    종료합니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div
                        className={`rounded-xl border p-4 text-sm space-y-1 ${
                            isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                        }`}
                    >
                        <div
                            className={`font-bold text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                            기본 점수
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            물리 메모리 사용량 비율 (0~1000점)
                        </div>
                    </div>
                    <div
                        className={`rounded-xl border p-4 text-sm space-y-1 ${
                            isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                        }`}
                    >
                        <div
                            className={`font-bold text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                            adj 보정
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            <code className="font-mono text-blue-600 dark:text-blue-400">/proc/&lt;pid&gt;/oom_score_adj</code> (-1000 ~
                            +1000), -1000이면 절대 종료 안 함
                        </div>
                    </div>
                    <div
                        className={`rounded-xl border p-4 text-sm space-y-1 ${
                            isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                        }`}
                    >
                        <div
                            className={`font-bold text-xs uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                        >
                            최종 score
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            <code className="font-mono text-blue-600 dark:text-blue-400">cat /proc/&lt;pid&gt;/oom_score</code> 로 확인
                        </div>
                    </div>
                </div>
                <CodeBlock code={snippets.oomBashCode} language="bash" filename="# OOM Killer 실전 관리" />
                <CodeBlock code={snippets.oomKillCode} language="c" filename="mm/oom_kill.c" />
            </Section>

            {/* 3.8 vmalloc vs kmalloc */}
            <Section id="s338" title="3.8  vmalloc vs kmalloc — 커널 메모리 할당 API">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    커널 코드에서 메모리를 동적 할당할 때 두 가지 주요 API가 있습니다. <T id="gfp_flags">GFP 플래그</T>와
                    물리적 연속성 요구 여부가 선택 기준입니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">kmalloc</div>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            물리적 연속
                        </div>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                            <li>Buddy Allocator에서 직접 할당</li>
                            <li>물리 메모리가 연속적으로 보장</li>
                            <li>DMA에 안전 (하드웨어가 물리 주소로 접근)</li>
                            <li>최대 크기: 보통 4MB 이하</li>
                            <li>빠름 (물리→가상 주소가 고정 오프셋)</li>
                            <li className="text-gray-500 dark:text-gray-500">
                                사용: 드라이버 버퍼, DMA 버퍼, 작은 구조체
                            </li>
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">
                            <T id="vmalloc">vmalloc</T>
                        </div>
                        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            가상 연속
                        </div>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                            <li>여러 불연속 물리 페이지를 가상 주소로 연속처럼 매핑</li>
                            <li>물리 연속성 없음 → DMA 불가</li>
                            <li>큰 크기 할당 가능 (수백MB)</li>
                            <li>
                                느림 (페이지 테이블 조작 필요, <T id="tlb">TLB</T> flush)
                            </li>
                            <li className="text-gray-500 dark:text-gray-500">
                                사용: 큰 모듈 메모리, 가상화 게스트 메모리, 큰 버퍼
                            </li>
                        </ul>
                    </div>
                </div>
                <CodeBlock
                    code={snippets.kmallocCode}
                    language="c"
                    filename="include/linux/slab.h + include/linux/vmalloc.h"
                />
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                    플래그
                                </th>
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                    슬립
                                </th>
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                    사용 위치
                                </th>
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                    설명
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { flag: 'GFP_KERNEL', sleep: '가능', ctx: '프로세스 컨텍스트', desc: '일반적 할당' },
                                {
                                    flag: 'GFP_ATOMIC',
                                    sleep: '불가',
                                    ctx: '인터럽트/스핀락 보유 중',
                                    desc: '실패 가능성 높음',
                                },
                                { flag: 'GFP_DMA', sleep: '가능', ctx: 'DMA 필요', desc: 'x86: 16MB 이하 영역' },
                                { flag: 'GFP_NOWAIT', sleep: '불가', ctx: '빠른 경로', desc: 'ATOMIC보다 덜 엄격' },
                            ].map((row, i) => (
                                <tr
                                    key={i}
                                    className={
                                        i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                                    }
                                >
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 font-mono text-blue-600 dark:text-blue-600 dark:text-blue-400">
                                        {row.flag}
                                    </td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                        {row.sleep}
                                    </td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                        {row.ctx}
                                    </td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                        {row.desc}
                                    </td>
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
                    <code className="font-mono text-blue-600 dark:text-blue-400">kswapd</code> 커널 스레드가 담당합니다.
                </p>
                {/* Watermark Visualization */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        메모리 존 워터마크
                    </div>
                    <div className="flex gap-6 items-start">
                        <div className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden w-32">
                            <div className="bg-green-100 dark:bg-green-500/30 border-b border-green-400 dark:border-green-500 p-2 text-xs text-center text-green-800 dark:text-green-300">
                                <span className="font-mono font-bold">high</span>
                                <div className="text-[10px] text-green-600 dark:text-green-400/70 mt-0.5">kswapd 슬립</div>
                            </div>
                            <div className="bg-yellow-100 dark:bg-yellow-500/30 border-b border-yellow-400 dark:border-yellow-500 p-2 text-xs text-center text-yellow-800 dark:text-yellow-300">
                                <span className="font-mono font-bold">low</span>
                                <div className="text-[10px] text-yellow-600 dark:text-yellow-400/70 mt-0.5">kswapd 활성화</div>
                            </div>
                            <div className="bg-red-100 dark:bg-red-500/30 p-2 text-xs text-center text-red-800 dark:text-red-300">
                                <span className="font-mono font-bold">min</span>
                                <div className="text-[10px] text-red-600 dark:text-red-400/70 mt-0.5">direct reclaim</div>
                            </div>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-500/50 border border-green-500" />
                                <span>
                                    <span className="text-green-700 dark:text-green-400 font-mono">pages_high</span> 이상: 여유 상태, kswapd
                                    대기
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-yellow-200 dark:bg-yellow-500/50 border border-yellow-500" />
                                <span>
                                    <span className="text-yellow-700 dark:text-yellow-400 font-mono">pages_low</span> 이하: kswapd 깨어나
                                    회수 시작
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-red-200 dark:bg-red-500/50 border border-red-500" />
                                <span>
                                    <span className="text-red-700 dark:text-red-400 font-mono">pages_min</span> 이하: 프로세스가 직접 회수
                                    (지연 발생)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* pages_min 동작 설명 */}
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        isDark
                            ? 'border-red-800/50 bg-red-900/20 text-red-200'
                            : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                >
                    <div className="font-bold mb-1">⚠ pages_min 이하 — Direct Reclaim</div>
                    <p className="text-xs leading-relaxed">
                        free page가 <span className="font-mono font-bold">pages_min</span> 이하로 떨어지면{' '}
                        <T id="kswapd">kswapd</T>가 따라잡지 못한 위기 상태입니다. 이때는 메모리를{' '}
                        <em>요청한 그 프로세스가 직접</em> 회수(direct reclaim)를 수행해야 할당이 이루어집니다.
                        프로세스가 자신의 페이지 폴트 처리 중에 수십 ms씩 지연될 수 있어 응답 레이턴시가 급격히
                        나빠집니다. 실무에서는 <span className="font-mono">vm.min_free_kbytes</span> 튜닝과{' '}
                        <span className="font-mono">vm.swappiness</span> 조정으로 이 상황을 예방합니다.
                    </p>
                </div>

                {/* LRU List Table */}
                <div className="overflow-x-auto">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Linux LRU 리스트 구조 (5개)
                    </div>
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-800">
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                    리스트
                                </th>
                                <th className="text-left p-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                                    설명
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { list: 'Active Anonymous', desc: '최근 접근된 익명 페이지 (heap, stack)' },
                                { list: 'Inactive Anonymous', desc: '오래된 익명 페이지 → 스왑 대상' },
                                { list: 'Active File', desc: '최근 접근된 파일 캐시' },
                                { list: 'Inactive File', desc: '오래된 파일 캐시 → 1순위 회수' },
                                { list: 'Unevictable', desc: '잠금된 페이지 (mlock, 공유 메모리)' },
                            ].map((row, i) => (
                                <tr
                                    key={i}
                                    className={
                                        i % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'
                                    }
                                >
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 font-mono text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                        {row.list}
                                    </td>
                                    <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                        {row.desc}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <CodeBlock code={snippets.kswapdBashCode} language="bash" filename="# 메모리 회수 상태 확인" />
                <CodeBlock code={snippets.kswapdCCode} language="c" filename="mm/vmscan.c 핵심 흐름" />
            </Section>

            {/* 3.10 Huge Pages / THP */}
            <Section id="s3310" title="3.10  Huge Pages / THP — 대형 페이지">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    표준 페이지 크기는 4KB입니다. 수십GB 메모리를 사용하는 데이터베이스나 JVM은 수백만 개의{' '}
                    <T id="tlb">TLB</T> 엔트리가 필요해 TLB miss가 심각한 성능 저하를 유발합니다.{' '}
                    <strong className="text-gray-900 dark:text-white">
                        <T id="hugepage">Huge Pages</T>
                    </strong>
                    (2MB/1GB)로 TLB 부담을 90% 줄일 수 있습니다.
                </p>
                {/* 3-column page size comparison */}
                <CardGrid cols={3}>
                    <InfoBox color="gray" title="4KB 일반 페이지">
                        <ul className="list-disc list-inside space-y-1">
                            <li>세밀한 메모리 제어</li>
                            <li>TLB 엔트리 많이 필요</li>
                            <li>1GB → TLB 엔트리 262,144개</li>
                        </ul>
                    </InfoBox>
                    <InfoBox color="blue" title="2MB Huge Page">
                        <ul className="list-disc list-inside space-y-1">
                            <li>512배 큰 페이지</li>
                            <li>1GB → TLB 엔트리 512개</li>
                            <li>x86-64 기본 지원</li>
                        </ul>
                    </InfoBox>
                    <InfoBox color="purple" title="1GB Huge Page">
                        <ul className="list-disc list-inside space-y-1">
                            <li>데이터베이스 전용</li>
                            <li>부팅 시 예약 필요</li>
                            <li>NUMA 서버 최대 성능</li>
                        </ul>
                    </InfoBox>
                </CardGrid>
                {/* THP vs explicit comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-amber-600 dark:text-amber-400">
                            명시적 Huge Pages (HugeTLBfs)
                        </div>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                            <li>부팅 시 또는 sysctl로 미리 예약</li>
                            <li>
                                애플리케이션이 <code className="font-mono text-blue-600 dark:text-blue-400">mmap(MAP_HUGETLB)</code> 명시적
                                사용
                            </li>
                            <li>예측 가능, 단편화 없음</li>
                            <li className="text-gray-500 dark:text-gray-500">Oracle DB, DPDK에서 선호</li>
                        </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            THP (Transparent Huge Pages)
                        </div>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                            <li>커널이 자동으로 4KB → 2MB 병합</li>
                            <li>애플리케이션 수정 불필요</li>
                            <li>
                                <code className="font-mono text-blue-600 dark:text-blue-400">khugepaged</code> 데몬이 백그라운드 병합
                            </li>
                            <li className="text-gray-500 dark:text-gray-500">
                                가끔 병합/분리 오버헤드 발생 (지연 스파이크)
                            </li>
                        </ul>
                    </div>
                </div>
                <CodeBlock code={snippets.hugepagesBashCode} language="bash" filename="# Huge Pages 설정" />
                {/* Practical recommendations */}
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">실전 권장 설정</div>
                <CardGrid cols={3}>
                    <InfoBox color="orange" title="데이터베이스 (Oracle, PostgreSQL)">
                        명시적 HugeTLBfs + THP never. 예측 가능한 지연이 중요.
                    </InfoBox>
                    <InfoBox color="blue" title="JVM (Java)">
                        THP madvise + -XX:+UseTransparentHugePages. 힙 영역만 THP 적용.
                    </InfoBox>
                    <InfoBox color="red" title="Redis / Cassandra">
                        THP never. fork() 시 CoW로 인한 THP 분리가 심각한 지연 유발.
                    </InfoBox>
                </CardGrid>
            </Section>

            {/* ── 3.11  CoW — Copy-on-Write ── */}
            <Section id="s3311" title="3.11  CoW — Copy-on-Write: fork() 후 쓰기 최적화">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <code className="font-mono text-blue-500 dark:text-blue-600 dark:text-blue-400">fork()</code> 호출 시 자식 프로세스의
                    가상 주소 공간은 부모와 동일하지만, 물리 페이지는 즉시 복사하지 않고{' '}
                    <strong>읽기 전용(RO)으로 공유</strong>됩니다. 최초 쓰기 시 <T id="page_fault">Page Fault</T>가
                    발생하고, 커널이 페이지를 복사한 뒤 각자 독립 페이지를 보유합니다.
                </p>

                {/* Step-by-step animation */}
                <CoWAnimationViz />

                {/* Key points */}
                <CardGrid cols={2}>
                    <InfoBox color="amber" title="vfork()">
                        <ul className="list-disc list-inside space-y-1">
                            <li>CoW도 없이 부모 메모리를 완전 공유</li>
                            <li>exec() 또는 _exit() 전까지만 허용</li>
                            <li>부모는 자식이 끝날 때까지 정지</li>
                        </ul>
                    </InfoBox>
                    <InfoBox color="blue" title="mmap(MAP_PRIVATE)">
                        <ul className="list-disc list-inside space-y-1">
                            <li>파일 페이지를 쓸 때 CoW 복사</li>
                            <li>파일 원본은 변경되지 않음</li>
                            <li>프로세스 독자 수정본만 메모리에 유지</li>
                        </ul>
                    </InfoBox>
                    <InfoBox color="purple" title="커널 함수 호출 경로">
                        <ul className="list-disc list-inside space-y-1">
                            <li>do_wp_page() — 쓰기 보호 폴트 진입점</li>
                            <li>alloc_page() — 새 물리 페이지 할당</li>
                            <li>copy_user_highpage() — 페이지 내용 복사</li>
                        </ul>
                    </InfoBox>
                    <InfoBox color="emerald" title="성능 이점">
                        <ul className="list-disc list-inside space-y-1">
                            <li>fork+exec 패턴: 복사 비용 거의 없음</li>
                            <li>exec()가 새 이미지로 덮으면 복사 불필요</li>
                            <li>Redis: THP + CoW 조합 시 latency spike 주의</li>
                        </ul>
                    </InfoBox>
                </CardGrid>

                <CodeBlock code={snippets.cowBashCode} language="bash" filename="# CoW 동작 확인" />
            </Section>

            {/* ── 3.12  NUMA 메모리 정책 ── */}
            <Section id="s3312" title="3.12  NUMA 메모리 정책 — mbind()와 numactl">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    <T id="numa">NUMA</T>(Non-Uniform Memory Access) 시스템에서 CPU는 자신과 연결된 <strong>로컬 메모리</strong>에 빠르게
                    접근하고, 원격 노드 메모리는 더 느립니다. 메모리 정책(memory policy)으로 어느 NUMA 노드에 할당할지
                    제어할 수 있습니다.
                </p>

                {/* Topology diagram */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-4">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        NUMA 토폴로지 예시
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-4 justify-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className="rounded-xl border-2 border-blue-400 dark:border-blue-600 bg-blue-50 dark:bg-blue-950 px-6 py-3 text-center">
                                <div className="text-xs font-bold text-blue-700 dark:text-blue-300">CPU 0–15</div>
                                <div className="text-xs text-blue-600 dark:text-blue-600 dark:text-blue-400">Socket 0</div>
                            </div>
                            <div className="text-xs text-gray-400">↕ 로컬 ~80 ns</div>
                            <div className="rounded-xl border-2 border-blue-400 dark:border-blue-600 bg-blue-100 dark:bg-blue-900 px-6 py-3 text-center">
                                <div className="text-xs font-bold text-blue-800 dark:text-blue-200">Memory Node 0</div>
                                <div className="text-xs text-blue-600 dark:text-blue-600 dark:text-blue-400">64 GB</div>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 px-4">
                            <div className="text-xs text-orange-500 dark:text-orange-400 font-semibold">
                                원격 ~120 ns
                            </div>
                            <div className="w-full border-t-2 border-dashed border-orange-400 dark:border-orange-600 min-w-[80px]" />
                            <div className="text-xs text-orange-500 dark:text-orange-400">Interconnect</div>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-6 py-3 text-center">
                                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                    CPU 16–31
                                </div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400">Socket 1</div>
                            </div>
                            <div className="text-xs text-gray-400">↕ 로컬 ~80 ns</div>
                            <div className="rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-emerald-100 dark:bg-emerald-900 px-6 py-3 text-center">
                                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                                    Memory Node 1
                                </div>
                                <div className="text-xs text-emerald-600 dark:text-emerald-400">64 GB</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4 policy cards */}
                <CardGrid cols={2}>
                    <InfoBox color="gray" title="MPOL_DEFAULT">
                        현재 스레드가 실행 중인 CPU의 로컬 노드에 우선 할당. 기본 동작.
                    </InfoBox>
                    <InfoBox color="red" title="MPOL_BIND">
                        지정된 노드에서만 할당. 해당 노드에 여유 메모리가 없으면 OOM 발생.
                    </InfoBox>
                    <InfoBox color="amber" title="MPOL_PREFERRED">
                        선호 노드에 우선 할당. 여유 없으면 다른 노드로 폴백. 유연한 로컬 선호.
                    </InfoBox>
                    <InfoBox color="purple" title="MPOL_INTERLEAVE">
                        여러 노드에 라운드로빈으로 분산 할당. 대역폭 최대화, 레이턴시는 평균화.
                    </InfoBox>
                </CardGrid>

                <CodeBlock code={snippets.numaCtrlCode} language="c" filename="mbind() / set_mempolicy()" />
                <CodeBlock code={snippets.numaBashCode} language="bash" filename="# numactl — NUMA 정책 제어" />
            </Section>

            {/* 3.13 Memory Ordering */}
            <Section id="s3313" title="3.13  Memory Ordering — 메모리 배리어와 순서 보장">
                <Prose>
                    멀티코어 CPU에서는 성능 최적화를 위해 메모리 읽기/쓰기 순서가 프로그래머가 작성한 순서와 다를 수 있습니다.
                    CPU의 store buffer, invalidation queue, 그리고 컴파일러 최적화가 순서를 바꿀 수 있으며,
                    이를 제어하기 위해 커널은 <strong className="text-gray-800 dark:text-gray-200">메모리 배리어</strong>{' '}
                    <KernelRef path="include/asm-generic/barrier.h" label="barrier.h" />를 제공합니다.
                </Prose>
                <InfoTable
                    headers={['배리어', '함수', '보장 내용']}
                    rows={[
                        { cells: ['Full Barrier', 'mb() / smp_mb()', '배리어 이전의 모든 읽기/쓰기가 이후보다 먼저 완료'] },
                        { cells: ['Read Barrier', 'rmb() / smp_rmb()', '배리어 이전의 읽기가 이후 읽기보다 먼저 완료'] },
                        { cells: ['Write Barrier', 'wmb() / smp_wmb()', '배리어 이전의 쓰기가 이후 쓰기보다 먼저 완료'] },
                        { cells: ['Acquire', 'smp_load_acquire()', '이후의 모든 읽기/쓰기가 이 읽기 이후에 실행'] },
                        { cells: ['Release', 'smp_store_release()', '이전의 모든 읽기/쓰기가 이 쓰기 이전에 완료'] },
                        { cells: ['Compiler Barrier', 'barrier()', 'CPU가 아닌 컴파일러의 재배치만 방지'] },
                    ]}
                />
                <CodeBlock code={`/* 전형적인 생산자-소비자 패턴 */

/* 생산자 (CPU 0) */
data = prepare_data();
smp_store_release(&flag, 1);  /* data 쓰기가 flag 쓰기보다 먼저 */

/* 소비자 (CPU 1) */
if (smp_load_acquire(&flag))  /* flag 읽기 이후에 data 읽기 */
    use(data);                /* data가 반드시 준비된 상태 */

/* acquire/release 없이는? */
data = prepare_data();
flag = 1;                /* ← CPU가 flag를 data보다 먼저 쓸 수 있음! */

/* smp_wmb()를 쓰는 전통적 방법 */
data = prepare_data();
smp_wmb();               /* write barrier */
flag = 1;

/* 소비자 쪽 */
if (flag) {
    smp_rmb();            /* read barrier */
    use(data);
}`} language="c" filename="메모리 배리어 사용 예시" />
                <Alert variant="tip" title="acquire/release가 권장됩니다">
                    최신 커널 코드에서는 mb/rmb/wmb 대신 smp_load_acquire / smp_store_release 쌍을 권장합니다.
                    의도가 명확하고, 아키텍처별 최적 배리어를 자동 선택합니다.
                </Alert>
            </Section>

            {/* 3.14 zswap/zram */}
            <Section id="s3314" title="3.14  zswap / zram — 메모리 압축과 스왑 최적화">
                <Prose>
                    메모리가 부족할 때 커널은 페이지를 스왑 디바이스로 내보냅니다. 하지만 디스크 I/O는 느리므로,
                    커널은 스왑 전에 페이지를 <strong className="text-gray-800 dark:text-gray-200">압축</strong>하여 메모리에
                    더 오래 유지하는 메커니즘을 제공합니다.
                </Prose>
                <InfoTable
                    headers={['메커니즘', '위치', '동작 방식', '사용 사례']}
                    rows={[
                        { cells: ['zswap', '스왑 경로 앞단 캐시', '스왑 아웃될 페이지를 압축하여 RAM 풀에 캐싱. 풀이 가득 차면 실제 스왑으로 방출', '디스크 스왑이 있는 일반 서버'] },
                        { cells: ['zram', '블록 디바이스 (/dev/zram0)', '압축된 RAM 디스크를 스왑 디바이스로 마운트. 디스크 I/O 없음', '임베디드, 디스크 없는 환경, Android'] },
                    ]}
                />
                <CodeBlock code={`# zswap 활성화 및 상태 확인
echo 1 > /sys/module/zswap/parameters/enabled
echo lz4 > /sys/module/zswap/parameters/compressor
echo zsmalloc > /sys/module/zswap/parameters/zpool
echo 20 > /sys/module/zswap/parameters/max_pool_percent

# zswap 통계
grep -r . /sys/kernel/debug/zswap/ 2>/dev/null
# pool_total_size: 134217728   (압축 풀 크기)
# stored_pages:    32768       (저장된 페이지 수)
# written_back_pages: 1024     (디스크로 방출된 페이지)
# reject_compress_poor: 256    (압축 효율 낮아 거부)

# zram 설정 (4GB 압축 블록 디바이스)
modprobe zram
echo lz4 > /sys/block/zram0/comp_algorithm
echo 4G > /sys/block/zram0/disksize
mkswap /dev/zram0
swapon -p 100 /dev/zram0   # 우선순위 높게 설정

# zram 통계
cat /sys/block/zram0/mm_stat
# orig_data_size  compr_data_size  mem_used  ...
# 2147483648      536870912        548405248
# (압축률: 4:1)`} language="bash" filename="# zswap / zram 설정" />
                <InfoBox color="gray" title="관련 커널 소스">
                    <div className="flex flex-wrap gap-2">
                        <KernelRef path="mm/zswap.c" sym="zswap_frontswap_store" />
                        <KernelRef path="drivers/block/zram/zram_drv.c" label="zram" />
                        <KernelRef path="mm/zpool.c" label="zpool.c" />
                    </div>
                </InfoBox>
            </Section>

            {/* ── 3.15 관련 커널 파라미터 ─────────────────────────────────── */}
            <Section id="s3315" title="3.15  관련 커널 파라미터">
                <Prose>
                    가상 메모리와 메모리 관리에 영향을 미치는 주요 커널 파라미터입니다.
                    <code>sysctl</code> 또는 <code>/proc/sys/vm</code>을 통해 런타임에 조정할 수 있습니다.
                </Prose>

                <InfoTable
                    headers={['파라미터', '기본값', '설명']}
                    rows={[
                        { cells: ['vm.swappiness', '60', '스왑 사용 적극성 (0=최소, 100=적극). 0이면 메모리 부족 시에만 스왑'] },
                        { cells: ['vm.overcommit_memory', '0', '0=휴리스틱, 1=항상 허용, 2=스왑+비율까지만'] },
                        { cells: ['vm.overcommit_ratio', '50', 'overcommit_memory=2일 때 물리 메모리의 허용 비율(%)'] },
                        { cells: ['vm.dirty_ratio', '20', 'dirty 페이지가 전체 메모리의 이 비율 초과 시 동기 write-back 강제'] },
                        { cells: ['vm.dirty_background_ratio', '10', '이 비율 초과 시 백그라운드 write-back 시작'] },
                        { cells: ['vm.min_free_kbytes', '(동적)', '커널이 유지하는 최소 여유 메모리. kswapd 동작 임계값에 영향'] },
                        { cells: ['vm.oom_kill_allocating_task', '0', '1이면 OOM 시 메모리 요청한 프로세스를 즉시 kill'] },
                        { cells: ['vm.nr_hugepages', '0', '사전 할당 HugePages 수 (2MB 단위)'] },
                        { cells: ['vm.transparent_hugepage', 'always', 'THP 설정 (always/madvise/never)'] },
                    ]}
                />

                <CodeBlock code={snippets.memParamsCode} language="bash" filename="메모리 파라미터 확인/변경" />
            </Section>
        </TopicPage>
    )
}
