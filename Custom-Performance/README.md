# PNetLab Custom-Performance Subsystem

The **`Custom-Performance`** pillar contains extreme high-density hypervisor tunings, memory deduplication, dynamic resource governance, dataplane acceleration, and autonomous health monitoring for **PNetLab v8**.

---

## ⚡ Subsystem Architecture

```
Custom-Performance/
├── apply-performance.sh              # Standalone idempotent deployment hook (+x)
├── README.md                         # This reference manual
├── scripts/                          # Performance & optimization scripts (33 tools)
│   ├── pnet-speed-optimizer.sh       # Ultra-KSM, OPcache 256MB, socket queue 16MB
│   ├── pnet-ksm-merge-exec.c         # Ultra-KSM 4KB RAM deduplication C-engine
│   ├── pnet-iol-shim.c               # Cisco IOL dynamic memory C-shim (<64MB)
│   ├── pnet-cgroups-v2-engine.sh     # Dynamic memory limits & cgroups v2 governor
│   ├── pnet-cpu-governor.py          # Dynamic CPU frequency scaling engine
│   ├── pnet-cpu-governor.service     # Systemd service for CPU governor
│   ├── pnet-heavy-node-optimizer.sh  # Multi-core optimizer for Cat8000v / Cisco 8000
│   ├── pnet-apply-heavy-node-optimizer.sh # Standalone heavy optimizer runner
│   ├── pnet-heavy-optimizer.service  # Heavy node optimizer background service
│   ├── pnet-bootstorm.py             # Anti-bootstorm staggered startup scheduler
│   ├── pnet-dataplane-engine.sh      # Silicon dataplane fast-path (MTU 9000)
│   ├── pnet-dataplane-stats.py       # Dataplane telemetry collector
│   ├── pnet-roce-engine.sh           # Soft-RoCE RXE & RDMA controller
│   ├── pnet-link-impairment.sh       # Link quality impairment (delay, jitter, loss)
│   ├── pnet-linkwatchd.py            # Daemon monitoring per-link state
│   ├── pnet-image-doctor.sh          # QCOW2 virtual disk integrity & compression
│   ├── pnet-watchdog.py              # 24/7 autonomous watchdog daemon
│   ├── pnet-perf.py                  # Real-time resource and thread profiler
│   ├── pnet-bench.sh                 # Cluster throughput and latency benchmark
│   ├── pnet-cluster-capacity.py      # Real-time cluster headroom calculator
│   ├── pnet-fleet-status.sh          # Multi-node satellite cluster telemetry
│   ├── pnet-console-fix.sh           # Console socket buffers & guacd multiplexer
│   ├── pnet-system-and-console-fix.sh # System socket & console cleanup
│   ├── pnet-fix-network.py           # Bridge & veth interface repair
│   ├── pnet-fix-network-boot.sh      # Network interface boot ordering
│   ├── pnet-fix-network-management.sh # Dedicated management network isolation
│   ├── pnet-sync-network-config.sh   # Netplan & bridge synchronizer
│   ├── pnet-modern-netplan-engine.sh # Modern Ubuntu 24/26 Netplan v2 generator
│   ├── pnet-fix-eth0-permanent.py    # Permanent eth0 cloud bridge anchor
│   ├── pnet-fix-node-startup.sh      # QEMU node startup & lock recovery
│   ├── pnet-php-modernizer.sh        # PHP 8.5 batch fault isolation & OPcache tuning
│   ├── pnet-node-test-suite.py       # Node lifecycle test runner
│   └── pnet-dry-test.py              # Non-destructive hypervisor probe
├── docs/                             # Subsystem Documentation
│   ├── 01_System_Speed_and_Resource_Tuning.md # Ultra-KSM & OPcache guide
│   ├── 02_High_Density_Cisco_Router_Tuning.md # Cisco IOL C-shim & bootstorm guide
│   ├── 03_Dataplane_JumboFrames_and_Impairment.md # Fast-path MTU 9000 guide
│   ├── 04_Universal_Hypervisor_and_Device_Optimization.md # QEMU headless VRAM guide
│   └── Benchmark_AzamLabs_vs_PNETLab_vs_EVENG.md # Side-by-side benchmark matrix
└── tests/                            # Automated performance benchmarks
```

---

## 🚀 Execution & Deployment

Deploy all components in this pillar independently:
```bash
sudo bash /opt/pnet/Custom-Performance/apply-performance.sh
```
Or via the unified master orchestrator:
```bash
sudo bash /opt/pnet/apply-all-custom.sh
```

---

## 🛠️ Canonical CLI Commands Mapped
- `pnet-optimizer`: Multi-core optimizer for Cisco Cat8000v, Cisco 8000, and heavy appliances.
- `pnet-bootstorm`: Staggered startup engine preventing host crashes during mass boot.
- `pnet-cgroups`: Enforces dynamic memory ceilings and cgroups v2 resource accounting.
- `pnet-cpu-governor`: Autonomous governor scaling CPU performance profiles.
- `pnet-roce`: Manages Soft-RoCE (RXE) and low-latency RDMA dataplane acceleration.
- `pnet-link-impair`: Injects synthetic latency, jitter, packet loss, and corruption via `tc netem`.
- `pnet-doctor` / `pnet-images`: Checks QCOW2 virtual disk integrity and reclaims zero clusters.
- `pnet-watchdog`: 24/7 daemon monitoring QEMU zombie processes, hung nodes, and memory exhaustion.
- `pnet-perf`: Real-time CLI performance monitor and node resource inspector.
- `pnet-capacity`: Headroom calculator for maximum concurrent node capacity.
