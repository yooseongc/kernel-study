// ─────────────────────────────────────────────────────────────────────────────
// Topic 13 — KVM / 가상화
// 코드 문자열 상수 모음 (index.tsx에서 분리)
// ─────────────────────────────────────────────────────────────────────────────

export const kvmOverviewCode = `/* KVM — Kernel-based Virtual Machine (Linux 커널 내 하이퍼바이저) */

/* KVM은 /dev/kvm 장치로 유저 공간에 API를 제공합니다 */
int kvm_fd = open("/dev/kvm", O_RDWR);

/* VM 생성 */
int vm_fd = ioctl(kvm_fd, KVM_CREATE_VM, 0);

/* vCPU 생성 */
int vcpu_fd = ioctl(vm_fd, KVM_CREATE_VCPU, 0);

/* 게스트 물리 메모리 등록 */
struct kvm_userspace_memory_region region = {
    .slot            = 0,
    .guest_phys_addr = 0x1000,      /* 게스트 물리 주소 */
    .memory_size     = 0x1000,      /* 크기 */
    .userspace_addr  = (uint64_t)guest_mem,  /* 호스트 VA */
};
ioctl(vm_fd, KVM_SET_USER_MEMORY_REGION, &region);

/* vCPU 실행 루프 */
for (;;) {
    ioctl(vcpu_fd, KVM_RUN, 0);     /* VMENTRY — 게스트 코드 실행 */
    switch (run->exit_reason) {     /* VMEXIT — 처리 후 재진입 */
    case KVM_EXIT_HLT: goto done;
    case KVM_EXIT_IO:  handle_io(run); break;
    case KVM_EXIT_MMIO: handle_mmio(run); break;
    }
}`

export const vmcsCode = `/* VMCS — Virtual Machine Control Structure (Intel VT-x) */

/* VMCS는 Intel CPU가 VMENTRY/VMEXIT 시 참조하는 4KB 자료 구조입니다.
   AMD는 동등한 VMCB(Virtual Machine Control Block)를 사용합니다. */

VMCS 주요 필드:
┌─────────────────────────────────────────────────┐
│  Guest State Area  (게스트 CPU 상태)             │
│  ├─ CR0, CR3, CR4  (제어 레지스터)              │
│  ├─ RIP, RSP, RFLAGS                            │
│  ├─ CS, DS, ES, SS ... (세그먼트 레지스터)       │
│  └─ GDTR, IDTR, TR                             │
├─────────────────────────────────────────────────│
│  Host State Area   (호스트 복귀 상태)            │
│  ├─ CR0, CR3, CR4, RIP, RSP                    │
│  └─ CS, DS, GDTR, IDTR ...                     │
├─────────────────────────────────────────────────│
│  VM Execution Control Fields                    │
│  ├─ Pin-based: 외부 인터럽트 → VMEXIT 여부      │
│  ├─ Proc-based: HLT, I/O, RDMSR 등 트랩 여부   │
│  └─ Exception Bitmap: 예외별 VMEXIT 설정        │
├─────────────────────────────────────────────────│
│  VM Exit Information (VMEXIT 원인 기록)          │
│  ├─ Exit Reason (I/O / EPT Violation / HLT…)   │
│  └─ Exit Qualification (상세 정보)              │
└─────────────────────────────────────────────────┘

/* VMENTRY / VMEXIT 흐름 */
// VMENTRY: VMLAUNCH/VMRESUME 명령 → CPU가 Guest State로 전환
// VMEXIT:  특권 명령, I/O, 인터럽트 등 → CPU가 Host State로 복귀`

export const eptCode = `/* EPT — Extended Page Tables (중첩 페이지 테이블) */

/* 두 단계 주소 변환 */
게스트 VA → (게스트 페이지 테이블) → 게스트 PA
게스트 PA → (EPT) → 호스트 PA (실제 물리 주소)

/* EPT Violation (= Page Fault의 가상화 버전) */
// 게스트가 접근한 게스트 PA가 EPT에 매핑되지 않으면 VMEXIT 발생
// → KVM이 메모리 할당 후 EPT 항목 추가 → VMRESUME

/* TLB 관계 */
// CPU는 vTLB(가상 TLB)에 두 단계 변환 결과를 캐시
// VPID(Virtual Processor ID)로 VM 전환 시 전체 TLB flush 없이 구분

/* EPT 성능 이점 vs Shadow Page Table */
// Shadow PT: 소프트웨어로 게스트 VA → 호스트 PA 직접 매핑 (KVM이 관리)
//            → CR3 쓰기 시마다 VMEXIT, 높은 오버헤드
// EPT:       하드웨어가 두 단계 변환을 직접 처리
//            → VMEXIT 없이 페이지 탐색, 성능 크게 향상

# EPT 통계 확인
cat /sys/kernel/debug/kvm/ept_misconfig
# 또는
perf kvm stat --event=ept_violations`

export const virtioCode = `/* virtio — 반가상화 I/O 표준 (OASIS 사양) */

/* virtio 계층 구조 */
게스트 커널
  └─ virtio 드라이버 (virtio-net, virtio-blk, virtio-scsi …)
       └─ virtqueue (링 버퍼 — 호스트·게스트 공유 메모리)
            └─ KVM / QEMU (호스트)
                 └─ 실제 네트워크 / 디스크

/* virtqueue — 공유 메모리 링 버퍼 */
struct vring {
    unsigned int num;       /* 엔트리 수 (2의 거듭제곱) */
    struct vring_desc *desc;    /* 디스크립터 테이블 (버퍼 주소/길이/플래그) */
    struct vring_avail *avail;  /* 게스트 → 호스트: 사용 가능한 버퍼 */
    struct vring_used  *used;   /* 호스트 → 게스트: 처리 완료된 버퍼 */
};

/* virtio-net 패킷 전송 흐름 */
// 1. 게스트 드라이버가 sk_buff를 vring_desc에 등록
// 2. avail 링 업데이트 → kick (호스트에 알림)
// 3. 호스트(QEMU/vhost)가 버퍼 소비 → 실제 전송
// 4. used 링 업데이트 → 게스트에 인터럽트

# vhost-net: QEMU 바이패스 — 커널 스레드가 직접 처리
modprobe vhost_net
ls /dev/vhost-net`

export const vhostCode = `# vhost-net 모듈 로드
modprobe vhost_net
ls /dev/vhost-net

# QEMU에서 vhost-net 사용
qemu-system-x86_64 \
  -enable-kvm \
  -netdev tap,id=net0,vhost=on,vhostfd=3 \
  -device virtio-net-pci,netdev=net0 \
  3<>/dev/vhost-net

# vhost_worker 스레드 확인 (커널 스레드)
ps aux | grep vhost
# root  1234  [vhost-1234]  ← VM의 virtqueue 처리

# vhost-net 통계
cat /proc/net/dev | grep tap
# tap0: RX bytes=... TX bytes=...

# vhost-user 소켓 경로 (OVS-DPDK)
ovs-vsctl add-port br0 vhost0 \
  -- set Interface vhost0 type=dpdkvhostuserclient \
     options:vhost-server-path=/tmp/vhost0.sock

# SR-IOV VF 생성 (Intel X710)
echo 4 > /sys/bus/pci/devices/0000:01:00.0/sriov_numvfs
# 4개의 Virtual Function 생성 → VM에 PCI passthrough`

export const kvmMgmtCode = `# KVM 지원 확인
egrep -c '(vmx|svm)' /proc/cpuinfo   # > 0 이면 지원
lsmod | grep kvm
# kvm_intel  335872  0    (Intel VT-x)
# kvm        1069056  1 kvm_intel

# QEMU/KVM으로 VM 생성 예시
qemu-system-x86_64 \
  -enable-kvm \
  -m 2G \
  -cpu host \\          # 호스트 CPU 모델 그대로 노출
  -smp 2 \\             # vCPU 2개
  -hda ubuntu.qcow2 \
  -netdev user,id=net0 -device virtio-net-pci,netdev=net0 \
  -nographic

# virsh (libvirt) — KVM VM 관리
virsh list --all
virsh start myvm
virsh dumpxml myvm | grep -i cpu   # vCPU 설정 확인

# KVM 성능 통계
perf kvm stat -p <qemu_pid> sleep 5
# vmexit 원인별 횟수 출력 (EPT_VIOLATION, EXTERNAL_INTERRUPT 등)

# 게스트 메모리 사용량
cat /sys/kernel/debug/kvm/*/mmu_cache_miss`

// ─────────────────────────────────────────────────────────────────────────────
// 13.7  관련 커널 파라미터
// ─────────────────────────────────────────────────────────────────────────────

export const kvmParamRows = [
    { cells: ['/sys/module/kvm/parameters/halt_poll_ns', '200000', 'VM halt 시 호스트 폴링 시간(ns). 높을수록 지연↓ CPU↑'] },
    { cells: ['/sys/module/kvm_intel/parameters/nested', '0', '중첩 가상화 활성화 (nested VMX)'] },
    { cells: ['/sys/module/kvm_intel/parameters/ept', '1', 'EPT(Extended Page Table) 사용 여부'] },
    { cells: ['/sys/module/kvm_intel/parameters/vpid', '1', 'VPID(Virtual Processor ID) — TLB flush 최적화'] },
    { cells: ['vm.nr_hugepages', '0', 'HugePages 사전 할당 (VM 메모리 백엔드용)'] },
    { cells: ['/sys/module/kvm/parameters/enable_vmware_backdoor', '0', 'VMware 호환 백도어 포트'] },
]

export const kvmParamCheckCode = `# KVM 모듈 파라미터 확인
cat /sys/module/kvm/parameters/halt_poll_ns
cat /sys/module/kvm_intel/parameters/nested
cat /sys/module/kvm_intel/parameters/ept
cat /sys/module/kvm_intel/parameters/vpid

# 중첩 가상화 활성화
modprobe -r kvm_intel
modprobe kvm_intel nested=1
# 또는 영구 설정:
# echo "options kvm_intel nested=1" > /etc/modprobe.d/kvm.conf

# HugePages 할당 (2MB * 1024 = 2GB)
sysctl -w vm.nr_hugepages=1024
cat /proc/meminfo | grep HugePages

# halt_poll_ns 조정 (지연 vs CPU 트레이드오프)
echo 400000 > /sys/module/kvm/parameters/halt_poll_ns`
