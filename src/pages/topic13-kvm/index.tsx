import { CodeBlock } from '../../components/viz/CodeBlock'
import { T } from '../../components/ui/GlossaryTooltip'
import { Section } from '../../components/ui/Section'
import { Prose } from '../../components/ui/Prose'
import { InfoTable } from '../../components/ui/InfoTable'
import { LearningCard } from '../../components/ui/LearningCard'
import { TopicNavigation } from '../../components/ui/TopicNavigation'
import * as snippets from './codeSnippets'

// ─────────────────────────────────────────────────────────────────────────────
// Code strings
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Topic13Kvm() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">
            {/* Header */}
            <header className="space-y-3">
                <p className="text-xs font-mono text-blue-500 dark:text-blue-400 uppercase tracking-widest">Topic 13</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">KVM / 가상화</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">KVM, Virtualization & virtio</p>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    KVM 구조, VMCS/VMCB, VMENTRY/VMEXIT, EPT, virtio, 클라우드 인프라
                </p>
            </header>

            <LearningCard
                topicId="13-kvm"
                items={[
                    'KVM이 하드웨어 가상화 확장(VMX/SVM)을 이용해 VM을 실행하는 원리를 이해합니다',
                    'VMCS(VM Control Structure)와 EPT/NPT를 통한 중첩 페이지 테이블 번역을 배웁니다',
                    'virtio 프레임워크로 게스트와 호스트가 I/O를 효율적으로 공유하는 방법을 파악합니다',
                ]}
            />

            {/* 13.1 KVM 개요 */}
            <Section id="s1311" title="13.1  KVM — 커널 하이퍼바이저 구조">
                <Prose>
                    <T id="kvm">KVM</T>은 Linux 커널 모듈(kvm.ko, kvm_intel.ko / kvm_amd.ko)로 구현된 Type-1
                    하이퍼바이저입니다. 유저 공간의 QEMU가{' '}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-blue-600 dark:text-blue-300 text-xs">
                        /dev/kvm
                    </code>{' '}
                    ioctl API를 통해 VM·vCPU를 생성·제어합니다.
                </Prose>

                {/* 하이퍼바이저 타입 비교 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        {
                            type: 'Type-1 (Bare-metal)',
                            examples: 'VMware ESXi, Hyper-V, Xen',
                            color: '#3b82f6',
                            desc: '하이퍼바이저가 하드웨어에 직접 설치. OS 없이 VM을 실행합니다.',
                        },
                        {
                            type: 'KVM (Hybrid)',
                            examples: 'Linux + KVM + QEMU',
                            color: '#10b981',
                            desc: 'Linux 커널 자체가 하이퍼바이저. 호스트 OS 기능을 재활용해 효율적입니다.',
                        },
                        {
                            type: 'Type-2 (Hosted)',
                            examples: 'VirtualBox, VMware Workstation',
                            color: '#f59e0b',
                            desc: '일반 OS 위에서 동작하는 하이퍼바이저. 개발·테스트에 편리합니다.',
                        },
                    ].map((card) => (
                        <div
                            key={card.type}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-4 space-y-2"
                            style={{ borderColor: card.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                {card.type}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{card.examples}</div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{card.desc}</p>
                        </div>
                    ))}
                </div>

                {/* KVM 구조 다이어그램 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                        KVM 계층 구조
                    </div>
                    <div className="space-y-2">
                        {[
                            { label: '게스트 VM (Guest OS + 유저 앱)', color: '#3b82f6', layer: '게스트 공간' },
                            {
                                label: 'QEMU — 디바이스 에뮬레이션 (디스크, NIC, VGA …)',
                                color: '#8b5cf6',
                                layer: '호스트 유저',
                            },
                            {
                                label: 'KVM 모듈 (kvm.ko / kvm_intel.ko) — VMENTRY/VMEXIT 관리',
                                color: '#10b981',
                                layer: '커널',
                            },
                            { label: 'Intel VT-x / AMD-V 하드웨어 지원', color: '#f59e0b', layer: '하드웨어' },
                        ].map((row, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="text-xs font-mono text-gray-400 dark:text-gray-600 w-20 text-right shrink-0">
                                    {row.layer}
                                </div>
                                <div
                                    className="flex-1 rounded-lg px-3 py-2 text-xs font-mono"
                                    style={{
                                        backgroundColor: row.color + '18',
                                        border: `1px solid ${row.color}44`,
                                        color: row.color,
                                    }}
                                >
                                    {row.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <CodeBlock code={snippets.kvmOverviewCode} language="c" filename="/* KVM API — /dev/kvm ioctl 흐름 */" />
            </Section>

            {/* 13.2 VMCS / VMCB */}
            <Section id="s1312" title="13.2  VMCS / VMCB — VMENTRY · VMEXIT 제어">
                <Prose>
                    Intel VT-x는{' '}
                    <strong className="text-gray-800 dark:text-gray-200">
                        <T id="vmcs">VMCS</T>
                    </strong>
                    (Virtual Machine Control Structure), AMD-V는{' '}
                    <strong className="text-gray-800 dark:text-gray-200">VMCB</strong>(VM Control Block)를 사용합니다.
                    이 자료 구조가 게스트·호스트 CPU 상태와 VM 실행 정책을 모두 관리합니다.
                </Prose>

                {/* VMENTRY / VMEXIT 흐름 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        VMENTRY / VMEXIT 사이클
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                        {[
                            { step: 'VMRESUME', desc: 'KVM이 게스트 실행 재개', color: '#10b981' },
                            { step: '게스트 실행', desc: '일반 명령 → 하드웨어 직접 실행', color: '#3b82f6' },
                            { step: 'VMEXIT', desc: '특권 명령 / I/O / 인터럽트 발생', color: '#ef4444' },
                            { step: 'KVM 핸들러', desc: 'exit_reason 분석 → 에뮬레이션/처리', color: '#f59e0b' },
                        ].map((s, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-full rounded-lg px-3 py-2.5 text-center text-xs font-mono font-bold"
                                    style={{
                                        backgroundColor: s.color + '20',
                                        color: s.color,
                                        border: `1px solid ${s.color}44`,
                                    }}
                                >
                                    {s.step}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">{s.desc}</p>
                                {i < 3 && <div className="text-gray-400 text-xs hidden sm:block">→</div>}
                            </div>
                        ))}
                    </div>
                </div>

                <CodeBlock code={snippets.vmcsCode} language="c" filename="/* VMCS 구조 — Intel VT-x */" />

                {/* VMEXIT 원인 테이블 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            주요 VMEXIT 원인
                        </span>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {[
                            {
                                reason: 'EXTERNAL_INTERRUPT',
                                desc: '호스트 하드웨어 인터럽트 (타이머, NIC IRQ)',
                                overhead: '낮음',
                            },
                            { reason: 'EPT_VIOLATION', desc: '게스트 물리 주소가 EPT에 미매핑', overhead: '중간' },
                            { reason: 'CPUID', desc: '게스트가 CPUID 명령 실행', overhead: '낮음' },
                            { reason: 'HLT', desc: 'vCPU 유휴 상태 진입', overhead: '낮음' },
                            { reason: 'IO_INSTRUCTION', desc: '에뮬레이션된 I/O 포트 접근', overhead: '높음' },
                            { reason: 'MSR_WRITE', desc: '특정 MSR 레지스터 쓰기', overhead: '중간' },
                            { reason: 'VMCALL', desc: '게스트→호스트 hypercall (KVM PV)', overhead: '낮음' },
                        ].map((row) => (
                            <div key={row.reason} className="px-4 py-2.5 flex items-center gap-3">
                                <code className="text-xs font-mono text-blue-600 dark:text-blue-400 w-48 shrink-0">
                                    {row.reason}
                                </code>
                                <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">{row.desc}</span>
                                <span
                                    className={`text-xs font-mono shrink-0 ${
                                        row.overhead === '높음'
                                            ? 'text-red-500'
                                            : row.overhead === '중간'
                                                ? 'text-yellow-500'
                                                : 'text-green-500'
                                    }`}
                                >
                                    {row.overhead}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* 13.3 EPT */}
            <Section id="s1313" title="13.3  EPT — 중첩 페이지 테이블">
                <Prose>
                    <T id="ept">EPT</T>(Extended Page Tables)는{' '}
                    <strong className="text-gray-800 dark:text-gray-200">게스트 물리 주소 → 호스트 물리 주소</strong>{' '}
                    변환을 하드웨어가 처리합니다. 소프트웨어 기반 Shadow Page Table 대비 <T id="vmexit">VMEXIT</T>{' '}
                    횟수를 크게 줄입니다.
                </Prose>

                {/* 주소 변환 2단계 다이어그램 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        2단계 주소 변환 (Two-Dimensional Paging)
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        {[
                            { label: '게스트 VA', color: '#8b5cf6' },
                            { label: '→ 게스트 PT →', color: '#6b7280', arrow: true },
                            { label: '게스트 PA', color: '#3b82f6' },
                            { label: '→ EPT →', color: '#6b7280', arrow: true },
                            { label: '호스트 PA', color: '#10b981' },
                            { label: '(물리 DRAM)', color: '#6b7280', small: true },
                        ].map((item, i) => (
                            <span
                                key={i}
                                style={{ color: item.color }}
                                className={item.small ? 'text-gray-400 dark:text-gray-600' : ''}
                            >
                                {item.label}
                            </span>
                        ))}
                    </div>

                    {/* EPT vs Shadow PT 비교 */}
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        {[
                            {
                                title: 'Shadow Page Table',
                                color: '#ef4444',
                                points: [
                                    'KVM 소프트웨어가 직접 관리',
                                    'CR3 쓰기 시마다 VMEXIT',
                                    '게스트 PT 변경 시 VMEXIT',
                                    '높은 오버헤드',
                                    'EPT 미지원 구형 CPU에서 사용',
                                ],
                            },
                            {
                                title: 'EPT (Extended Page Tables)',
                                color: '#10b981',
                                points: [
                                    'CPU 하드웨어가 직접 처리',
                                    'CR3 쓰기 시 VMEXIT 없음',
                                    '게스트 PT 변경 시 VMEXIT 없음',
                                    '낮은 오버헤드',
                                    'Intel Nehalem+ / AMD-V NPT',
                                ],
                            },
                        ].map((card) => (
                            <div
                                key={card.title}
                                className="rounded-xl border p-3 space-y-2"
                                style={{ borderColor: card.color + '44', backgroundColor: card.color + '08' }}
                            >
                                <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                    {card.title}
                                </div>
                                <ul className="space-y-1">
                                    {card.points.map((p, i) => (
                                        <li
                                            key={i}
                                            className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5"
                                        >
                                            <span style={{ color: card.color }} className="shrink-0">
                                                ▸
                                            </span>
                                            <span>{p}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                <CodeBlock code={snippets.eptCode} language="c" filename="/* EPT — 중첩 페이지 테이블 구조 */" />
            </Section>

            {/* 13.4 virtio */}
            <Section id="s1314" title="13.4  virtio — 반가상화 I/O">
                <Prose>
                    순수 에뮬레이션(예: e1000 NIC 에뮬레이션)은 게스트 드라이버가 하드웨어 레지스터를 읽고 쓸 때마다
                    <T id="vmexit">VMEXIT</T>가 발생합니다.{' '}
                    <strong className="text-gray-800 dark:text-gray-200">
                        <T id="virtio">virtio</T>
                    </strong>
                    는 게스트-호스트 간 공유 메모리 링 버퍼(
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">virtqueue</code>)로 I/O를 전달해
                    VMEXIT를 최소화합니다.
                </Prose>

                {/* virtio 디바이스 종류 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                        {
                            name: 'virtio-net',
                            desc: '가상 NIC — 네트워크 I/O',
                            color: '#3b82f6',
                            pci: 'virtio-net-pci',
                        },
                        {
                            name: 'virtio-blk',
                            desc: '가상 블록 디바이스 — 디스크',
                            color: '#10b981',
                            pci: 'virtio-blk-pci',
                        },
                        {
                            name: 'virtio-scsi',
                            desc: 'SCSI 호스트 어댑터 에뮬레이션',
                            color: '#8b5cf6',
                            pci: 'virtio-scsi-pci',
                        },
                        {
                            name: 'virtio-balloon',
                            desc: '동적 메모리 조절 (balloon driver)',
                            color: '#f59e0b',
                            pci: 'virtio-balloon-pci',
                        },
                        {
                            name: 'virtio-fs',
                            desc: 'DAX 기반 호스트 파일시스템 공유',
                            color: '#ef4444',
                            pci: 'vhost-user-fs',
                        },
                        {
                            name: 'virtio-rng',
                            desc: '하드웨어 엔트로피 소스 공유',
                            color: '#06b6d4',
                            pci: 'virtio-rng-pci',
                        },
                    ].map((d) => (
                        <div
                            key={d.name}
                            className="rounded-xl border bg-white dark:bg-gray-900 p-3 space-y-1.5"
                            style={{ borderColor: d.color + '55' }}
                        >
                            <div className="text-xs font-mono font-bold" style={{ color: d.color }}>
                                {d.name}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{d.desc}</p>
                            <div className="text-xs font-mono text-gray-400 dark:text-gray-600">{d.pci}</div>
                        </div>
                    ))}
                </div>

                {/* vhost-net */}
                <div className="rounded-xl border border-green-200 dark:border-green-800/50 bg-green-50/50 dark:bg-green-950/20 p-4 space-y-2">
                    <div className="text-sm font-semibold text-green-700 dark:text-green-300 font-mono">
                        vhost-net — QEMU 바이패스로 성능 향상
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        일반 virtio-net은 QEMU 프로세스가 virtqueue를 폴링합니다.
                        <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded mx-1">vhost-net</code>은 커널
                        스레드가 직접 virtqueue를 처리해 QEMU 컨텍스트 스위칭을 제거합니다. KVM 네트워크 성능의 핵심
                        최적화 기법입니다.
                    </p>
                </div>

                <CodeBlock code={snippets.virtioCode} language="c" filename="/* virtio — virtqueue 구조 & 패킷 전송 흐름 */" />
            </Section>

            {/* 13.5 KVM 관리 실전 */}
            <Section id="s1315" title="13.5  KVM 관리 실전">
                <Prose>
                    QEMU, libvirt(virsh), 그리고{' '}
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">perf kvm</code>으로
                    <T id="kvm">KVM</T> 환경을 생성·관리·분석하는 실전 명령어입니다.
                </Prose>
                <CodeBlock code={snippets.kvmMgmtCode} language="bash" filename="# KVM 실전 관리 및 성능 분석" />

                {/* 클라우드 연관성 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        클라우드 인프라와 KVM
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                            {
                                title: 'AWS EC2 (Nitro 이전)',
                                color: '#f59e0b',
                                items: [
                                    'KVM + QEMU 기반',
                                    'Xen에서 KVM으로 전환 (2017~)',
                                    'virtio-net, virtio-blk 사용',
                                ],
                            },
                            {
                                title: 'AWS EC2 (Nitro)',
                                color: '#10b981',
                                items: [
                                    'KVM + Nitro 전용 하이퍼바이저',
                                    'PCIe SR-IOV로 NIC/EBS 직접 접근',
                                    'QEMU 완전 제거 → 오버헤드 최소화',
                                ],
                            },
                            {
                                title: 'Google Cloud (GCE)',
                                color: '#3b82f6',
                                items: [
                                    'KVM 기반 커스텀 하이퍼바이저',
                                    'Live Migration 지원 (서비스 중단 없는 이동)',
                                    'gVNIC(virtio 발전형) 사용',
                                ],
                            },
                            {
                                title: 'OpenStack / Proxmox',
                                color: '#8b5cf6',
                                items: [
                                    'KVM + QEMU + libvirt 오픈소스 스택',
                                    '온프레미스 프라이빗 클라우드',
                                    'vCPU 오버커밋, 라이브 마이그레이션 지원',
                                ],
                            },
                        ].map((card) => (
                            <div
                                key={card.title}
                                className="rounded-xl border bg-white dark:bg-gray-900 p-3 space-y-2"
                                style={{ borderColor: card.color + '55' }}
                            >
                                <div className="text-xs font-mono font-bold" style={{ color: card.color }}>
                                    {card.title}
                                </div>
                                <ul className="space-y-1">
                                    {card.items.map((item, i) => (
                                        <li
                                            key={i}
                                            className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5"
                                        >
                                            <span style={{ color: card.color }} className="shrink-0">
                                                ▸
                                            </span>
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </Section>

            {/* 13.6 vhost */}
            <Section id="s1316" title="13.6  vhost — 커널 내 virtio 백엔드">
                <Prose>
                    기본 <T id="virtio">virtio</T>는 I/O 요청을 QEMU 유저 공간 백엔드가 처리합니다.
                    <strong className="text-gray-800 dark:text-gray-200"> vhost</strong>는 커널 내부에서 virtio 큐를
                    직접 처리해
                    <strong className="text-gray-800 dark:text-gray-200"> 컨텍스트 스위치 없이</strong> 패킷/I/O를
                    처리합니다. vhost-net(네트워크)과 vhost-blk(블록 I/O)이 대표적입니다.
                </Prose>

                {/* 처리 경로 비교 다이어그램 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 기본 virtio */}
                    <div className="rounded-xl border border-orange-200 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20 p-4 space-y-3">
                        <div className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                            기본 virtio (QEMU 유저공간 백엔드)
                        </div>
                        <div className="space-y-1.5">
                            {[
                                { label: '게스트 VM', color: '#f97316' },
                                { label: '↓ virtio 큐', color: '#9ca3af' },
                                { label: 'QEMU (유저공간)', color: '#f97316' },
                                { label: '↓ 소켓 / 파일', color: '#9ca3af' },
                                { label: '호스트 커널', color: '#f97316' },
                            ].map((row, i) => (
                                <div
                                    key={i}
                                    className="text-xs font-mono px-3 py-1.5 rounded-lg"
                                    style={
                                        row.label.startsWith('↓')
                                            ? { color: row.color }
                                            : {
                                                backgroundColor: '#f9731618',
                                                border: '1px solid #f9731644',
                                                color: row.color,
                                            }
                                    }
                                >
                                    {row.label}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            컨텍스트 스위치: VM exit → <T id="kvm">KVM</T> → QEMU 유저공간
                        </p>
                    </div>

                    {/* vhost */}
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
                        <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                            vhost (커널 백엔드)
                        </div>
                        <div className="space-y-1.5">
                            {[
                                { label: '게스트 VM', color: '#3b82f6' },
                                { label: '↓ virtio 큐', color: '#9ca3af' },
                                { label: 'vhost 커널 스레드', color: '#3b82f6' },
                                { label: '↓ 소켓 / 파일', color: '#9ca3af' },
                                { label: '(유저공간 생략!)', color: '#10b981' },
                            ].map((row, i) => (
                                <div
                                    key={i}
                                    className="text-xs font-mono px-3 py-1.5 rounded-lg"
                                    style={
                                        row.label.startsWith('↓')
                                            ? { color: row.color }
                                            : {
                                                backgroundColor: row.color === '#10b981' ? '#10b98118' : '#3b82f618',
                                                border: `1px solid ${row.color === '#10b981' ? '#10b98144' : '#3b82f644'}`,
                                                color: row.color,
                                            }
                                    }
                                >
                                    {row.label}
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            컨텍스트 스위치: VM exit → KVM → vhost_worker (커널 스레드, 유저공간 생략!)
                        </p>
                    </div>
                </div>

                {/* vhost-net 동작 원리 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        vhost-net 동작 원리
                    </div>
                    <div className="space-y-2">
                        {[
                            { step: '1', desc: 'vhost_net 커널 모듈이 /dev/vhost-net 생성', color: '#3b82f6' },
                            {
                                step: '2',
                                desc: 'QEMU가 /dev/vhost-net을 열고 ioctl로 virtqueue 등록',
                                color: '#8b5cf6',
                            },
                            {
                                step: '3',
                                desc: '이후 게스트 TX 요청은 QEMU 개입 없이 vhost_worker 스레드가 직접 TAP 소켓으로 전달',
                                color: '#10b981',
                            },
                            {
                                step: '★',
                                desc: '성능: QEMU 경유 대비 레이턴시 30–50% 감소, 처리량 최대 2배',
                                color: '#f59e0b',
                            },
                        ].map((row) => (
                            <div key={row.step} className="flex items-start gap-3">
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0"
                                    style={{
                                        backgroundColor: row.color + '20',
                                        color: row.color,
                                        border: `1px solid ${row.color}44`,
                                    }}
                                >
                                    {row.step}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pt-0.5">
                                    {row.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* vhost-user */}
                <div className="rounded-xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20 p-4 space-y-2">
                    <div className="text-sm font-semibold text-purple-700 dark:text-purple-300 font-mono">
                        vhost-user (DPDK) — 호스트 커널도 우회
                    </div>
                    <ul className="space-y-1.5">
                        {[
                            'vhost-net의 한계: 호스트 커널을 거쳐야 함',
                            'vhost-user: 유저 공간(DPDK)과 공유 메모리로 직접 통신. 커널 우회',
                            'Open vSwitch + DPDK + vhost-user = 가장 빠른 VM 네트워킹',
                        ].map((item, i) => (
                            <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">
                                <span className="text-purple-500 shrink-0">▸</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 방식 비교 테이블 */}
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            virtio 백엔드 방식 비교
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-gray-800">
                                    {['방식', '처리 위치', '레이턴시', '설정 복잡도'].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {[
                                    {
                                        method: 'virtio (에뮬레이션)',
                                        location: 'QEMU 유저공간',
                                        latency: '높음',
                                        complexity: '낮음',
                                        latencyColor: 'text-red-500',
                                        complexityColor: 'text-green-500',
                                    },
                                    {
                                        method: 'vhost-net',
                                        location: '커널 스레드',
                                        latency: '중간',
                                        complexity: '낮음',
                                        latencyColor: 'text-yellow-500',
                                        complexityColor: 'text-green-500',
                                    },
                                    {
                                        method: 'vhost-user (DPDK)',
                                        location: '유저 공간 (PMD)',
                                        latency: '낮음',
                                        complexity: '높음',
                                        latencyColor: 'text-green-500',
                                        complexityColor: 'text-red-500',
                                    },
                                    {
                                        method: 'SR-IOV',
                                        location: '하드웨어 직접',
                                        latency: '최저',
                                        complexity: '매우 높음',
                                        latencyColor: 'text-blue-500',
                                        complexityColor: 'text-red-600',
                                    },
                                ].map((row) => (
                                    <tr key={row.method}>
                                        <td className="px-4 py-2.5 font-mono text-gray-700 dark:text-gray-300">
                                            {row.method}
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{row.location}</td>
                                        <td className={`px-4 py-2.5 font-mono ${row.latencyColor}`}>{row.latency}</td>
                                        <td className={`px-4 py-2.5 font-mono ${row.complexityColor}`}>
                                            {row.complexity}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <CodeBlock code={snippets.vhostCode} language="bash" filename="# vhost-net / vhost-user / SR-IOV 실전 명령" />
            </Section>

            {/* 13.7 관련 커널 파라미터 */}
            <Section id="s1317" title="13.7  관련 커널 파라미터">
                <Prose>
                    KVM 가상화 성능과 기능에 영향을 미치는 주요 파라미터입니다. 모듈 파라미터는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        /sys/module/
                    </code>{' '}
                    경로에서 확인하고, sysctl 파라미터는{' '}
                    <code className="text-blue-600 dark:text-blue-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
                        sysctl
                    </code>{' '}
                    명령으로 조정합니다.
                </Prose>
                <InfoTable headers={['파라미터', '기본값', '설명']} rows={snippets.kvmParamRows} />
                <CodeBlock code={snippets.kvmParamCheckCode} language="bash" filename="# KVM 파라미터 확인/변경" />
            </Section>

            <TopicNavigation topicId="13-kvm" />

            {/* 완료 카드 */}
            <div className="rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-8 text-center space-y-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">KVM / 가상화 학습 완료</div>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm max-w-2xl mx-auto">
                    <T id="kvm">KVM</T>의 VMENTRY/<T id="vmexit">VMEXIT</T> 사이클, <T id="vmcs">VMCS</T>를 통한 제어,{' '}
                    <T id="ept">EPT</T>로 주소 변환 효율화,
                    <T id="virtio">virtio</T> 공유 메모리 I/O까지 — 클라우드 인프라를 떠받치는 가상화 레이어를
                    살펴봤습니다.
                </p>
                <a
                    href="#/"
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
                >
                    <span>←</span>
                    홈으로 돌아가기
                </a>
            </div>
        </div>
    )
}
