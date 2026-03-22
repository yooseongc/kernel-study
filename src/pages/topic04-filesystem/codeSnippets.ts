// ─────────────────────────────────────────────────────────────────────────────
// Topic 04 — VFS와 파일시스템
// 코드 문자열 상수 모음 (index.tsx에서 분리)
// ─────────────────────────────────────────────────────────────────────────────

// 4.2 VFS open 흐름
export const openFlowCode = `/* VFS open 흐름 (간략화) */
long do_sys_open(int dfd, const char __user *filename, int flags, umode_t mode)
{
    struct filename *tmp = getname(filename);
    int fd = get_unused_fd_flags(flags);

    /* 경로 탐색: /etc → etc dentry → passwd dentry → inode */
    struct file *f = do_filp_open(dfd, tmp, &op);
    /*   └─ path_openat()
           └─ link_path_walk() : 경로 컴포넌트 순회
           └─ dentry_open()    : struct file 생성
           └─ ext4_file_open() : 파일시스템별 open */

    fd_install(fd, f);  /* fd → file 매핑 등록 */
    return fd;
}

/* ext4 read 경로 */
static ssize_t ext4_file_read_iter(struct kiocb *iocb, struct iov_iter *to)
{
    /* 페이지 캐시 확인 */
    return generic_file_read_iter(iocb, to);
    /*   └─ find_get_page()     : 페이지 캐시 조회
           └─ (miss) ext4_readpage() → submit_bio() → 디스크 I/O
           └─ copy_page_to_iter() : 커널→유저 복사 */
}`

// 4.3 페이지 캐시
export const pageCacheCode = `# 메모리에서 페이지 캐시 사용량 확인
cat /proc/meminfo | grep -E "Cached|Buffers|Dirty|Writeback"
# Cached:    8543212 kB  ← 페이지 캐시
# Buffers:    245760 kB  ← 블록 디바이스 버퍼
# Dirty:       12288 kB  ← 쓰기 대기 중인 더티 페이지
# Writeback:       0 kB  ← 현재 쓰기 중

# 특정 파일이 캐시에 있는지 확인
vmtouch /etc/passwd
# Files: 1
# Resident Pages: 1/1  100%  ← 전부 캐시됨

# 페이지 캐시 강제 비우기 (테스트용)
echo 3 > /proc/sys/vm/drop_caches  # 주의: 성능 저하

# dirty 페이지 즉시 플러시
sync
echo 1 > /proc/sys/vm/drop_caches`

// 4.3 write-back
export const writebackCode = `# dirty 페이지 현황 확인
cat /proc/meminfo | grep -E "Dirty|Writeback"
# Dirty:       24576 kB   ← 아직 디스크에 안 쓰인 페이지
# Writeback:    4096 kB   ← 현재 쓰는 중

# writeback 튜닝 파라미터
cat /proc/sys/vm/dirty_ratio          # 40% 초과 시 프로세스 직접 플러시
cat /proc/sys/vm/dirty_background_ratio # 10% 초과 시 백그라운드 writeback 시작
cat /proc/sys/vm/dirty_expire_centisecs # 3000 = 30초

# 특정 파일 강제 플러시
fsync(open("important.db", O_RDWR))

# iotop으로 writeback I/O 확인
iotop -o
# kworker/u4:2  ← 커널 writeback 워커`

// 4.4 ext4
export const ext4Code = `# ext4 파일시스템 정보
tune2fs -l /dev/sda1 | grep -E "Block size|Inode|Journal"

# 저널링 모드 확인
mount | grep ext4
# /dev/sda1 on / type ext4 (rw,relatime,data=ordered)

# 파일 블록 위치 확인
filefrag -v /etc/passwd
# physical_offset  logical_offset  length
# 123456           0               1      ← 블록 123456에 위치

# 아이노드 정보
stat /etc/passwd
# File: /etc/passwd
# Inode: 1048577    Links: 1
# Access: 2026-03-21 ...

# 아이노드 소진 확인 (파일 수 제한)
df -i /
# Filesystem  Inodes  IUsed  IFree  IUse%`

// 4.5 블록 I/O
export const blockIOCode = `/* bio — 블록 I/O 요청의 기본 단위 (include/linux/blk_types.h) */
struct bio {
    struct block_device *bi_bdev;     /* 대상 블록 디바이스 */
    blk_opf_t            bi_opf;      /* REQ_OP_READ / REQ_OP_WRITE 등 */
    sector_t             bi_iter.bi_sector; /* 시작 섹터 번호 */
    struct bio_vec      *bi_io_vec;   /* 물리 페이지 조각 배열 */
    bio_end_io_t        *bi_end_io;   /* 완료 콜백 */
};

/* 상위 계층(ext4)에서 bio를 생성·제출하는 흐름 */
// ext4_writepage()
//   └─ mpage_submit_page()
//        └─ bio_alloc()           ← bio 할당
//        └─ bio_add_page()        ← 페이지 첨부
//        └─ submit_bio()          ← I/O 스케줄러에 전달
//             └─ blk_mq_submit_bio()
//                  └─ blk_mq_get_request()   ← request 래핑
//                  └─ blk_mq_sched_insert_request() ← 스케줄러 삽입
//                  └─ blk_mq_run_hw_queue()  ← 드라이버 dispatch`

export const blockSchedCode = `# 현재 I/O 스케줄러 확인
cat /sys/block/sda/queue/scheduler
# [mq-deadline] kyber bfq none

# 스케줄러 변경
echo bfq > /sys/block/sda/queue/scheduler

# I/O 통계 (blkstat)
iostat -x 1
# Device  r/s  w/s  rkB/s  wkB/s  await  %util
# sda     10   50   480    2400   2.3    15

# blktrace — 블록 I/O 이벤트 추적
blktrace -d /dev/sda -o trace &
blkparse trace.blktrace.0 | head -20
# 8,0  3  1  0.000000000  Q  WS 1234 + 8 [kworker]  ← 큐 삽입
# 8,0  3  2  0.000123456  D  WS 1234 + 8 [kworker]  ← 드라이버 dispatch

# 프로세스별 I/O 우선순위
ionice -c 2 -n 0 dd if=/dev/zero of=/tmp/test bs=1M count=100
# -c 2: Best-effort 클래스, -n 0: 최고 우선순위`

// 4.7 파일 종류와 권한
export const filePermCode = `# 파일 타입 확인
ls -la /dev/sda /etc/passwd /tmp
# brw-rw---- ... /dev/sda       (블록 디바이스)
# -rw-r--r-- ... /etc/passwd    (일반 파일)
# drwxrwxrwt ... /tmp           (sticky bit 디렉토리)

# setuid 예시 — passwd 명령
ls -la /usr/bin/passwd
# -rwsr-xr-x ... /usr/bin/passwd  (s = setuid)

# ACL 설정/조회
setfacl -m u:nginx:rx /var/www/html
getfacl /var/www/html`

// 4.6 파일시스템 비교
export const fsOverviewCode = `# 커널이 지원하는 파일시스템 목록 (nodev = 블록 디바이스 불필요)
cat /proc/filesystems
# nodev  sysfs          ← /sys 가상 FS
# nodev  proc           ← /proc 가상 FS
# nodev  tmpfs          ← 메모리 기반 FS
# nodev  overlay        ← overlayfs (컨테이너)
#        ext4           ← 디스크 기반 FS
#        xfs
#        btrfs

# 마운트된 FS 타입 확인
df -T
# /dev/nvme0n1p2 ext4  102400000 ...   /
# tmpfs          tmpfs   8192000 ...   /dev/shm
# /dev/sdb1      xfs    51200000 ...   /data

# Btrfs 스냅샷 생성 & 서브볼륨 목록
btrfs subvolume snapshot -r /   /.snapshots/root-$(date +%F)
btrfs subvolume list /

# overlayfs 직접 마운트 (컨테이너 런타임이 내부적으로 하는 일)
mount -t overlay overlay \\
  -o lowerdir=/image-layer,upperdir=/container-rw,workdir=/work \\
  /merged-view

# NFS v4 마운트 (rsize/wsize 최대화로 처리량 향상)
mount -t nfs4 -o rsize=1048576,wsize=1048576 storage:/exports /mnt/nfs

# 파일시스템별 inode 사용량 확인
df -i
# Filesystem       Inodes  IUsed   IFree IUse%
# /dev/nvme0n1p2  6553600 182400 6371200    3%
# tmpfs           2048000      8 2047992    1%`
