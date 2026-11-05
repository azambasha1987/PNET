/* ============================================================================
   PNetLab Main Dashboard — PNet-Features Enterprise Operations Center
   Integrated into /main/ as the primary "PNet-Features" navigation tab.
   Communicates with the backend API service on /pnet-ops/api/
   ============================================================================ */
(function () {
  'use strict';

  var App = window.PnqApp;
  if (!App) return;

  var API_BASE = '/pnet-ops/api';

  /* ── ANSI Color helper ──────────────────────────────────── */
  function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*[mGKH]/g, '');
  }

  function getLineColor(line) {
    if (/\[✔\]|\[PASS\]|success|passed|online|healthy|active/i.test(line)) return '#4ade80';
    if (/\[✘\]|\[FAIL\]|\[!\]|error|fail|critical|fatal/i.test(line))      return '#f87171';
    if (/\[⚠\]|warning|warn|slow|hint/i.test(line))                        return '#fbbf24';
    if (/^===|───|━━━/i.test(line))                                       return '#60a5fa';
    if (/\[\*\]|\[i\]|info/i.test(line))                                  return '#38bdf8';
    return '#94a3b8';
  }

  /* ── Main Render Entry ──────────────────────────────────── */
  function render(view) {
    view.innerHTML = '';

    var container = document.createElement('div');
    container.className = 'pnet-features-container';
    container.style.cssText = 'display:flex;flex-direction:column;gap:20px;max-width:1440px;margin:0 auto;color:var(--pnq-text,#f1f5f9);';

    // ── 1. Top Header ─────────────────────────────────────────
    var head = document.createElement('div');
    head.className = 'view-head';
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;padding-bottom:16px;border-bottom:1px solid var(--pnq-border,rgba(255,255,255,0.08));';

    var titleBox = document.createElement('div');
    titleBox.style.cssText = 'display:flex;align-items:center;gap:14px;';

    var iconBox = document.createElement('div');
    iconBox.style.cssText = 'width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#0284c7,#7c3aed);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(2,132,199,0.35);';
    iconBox.innerHTML = '<i class="fa fa-bolt" style="font-size:22px;color:#fff;"></i>';

    var titleText = document.createElement('div');
    titleText.innerHTML = 
      '<div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;background:linear-gradient(90deg,#38bdf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">' +
        'PNet-Features Enterprise Operations Center' +
      '</div>' +
      '<div style="font-size:13px;color:var(--pnq-text-muted,#94a3b8);margin-top:2px;">' +
        'Enterprise platform health, cloud transit, AI lab architect, cluster mesh & idle quotas' +
      '</div>';

    titleBox.appendChild(iconBox);
    titleBox.appendChild(titleText);

    // Header Actions
    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;';

    var btnToolkit = document.createElement('button');
    btnToolkit.type = 'button';
    btnToolkit.className = 'btn btn-ghost';
    btnToolkit.style.cssText = 'display:inline-flex;align-items:center;gap:6px;color:#a78bfa;border:1px solid rgba(167,139,250,0.3);padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.15s ease;';
    btnToolkit.innerHTML = '<i class="fa fa-wrench" style="color:#a78bfa;"></i> Client Toolkit';
    btnToolkit.onclick = function () { openClientToolkitModal(); };

    var btnRefresh = document.createElement('button');
    btnRefresh.className = 'btn btn-ghost';
    btnRefresh.innerHTML = '<i class="fa fa-refresh"></i> Refresh All';
    btnRefresh.onclick = function () { loadStats(); loadMesh(); loadImagesAudit(); App.toast('Metrics refreshed', 'ok'); };

    var btnDoctor = document.createElement('button');
    btnDoctor.className = 'btn btn-primary';
    btnDoctor.style.cssText = 'background:linear-gradient(135deg,#0284c7,#2563eb);border:none;color:#fff;';
    btnDoctor.innerHTML = '<i class="fa fa-stethoscope"></i> Run Doctor';
    btnDoctor.onclick = function () { switchTab('health'); runTool('doctor', {}, null, 'term-doctor'); };

    actions.appendChild(btnToolkit);
    var btnOpsSuite = document.createElement('a');
    btnOpsSuite.href = '/pnet-ops/';
    btnOpsSuite.target = '_blank';
    btnOpsSuite.className = 'btn btn-ghost';
    btnOpsSuite.style.cssText = 'display:inline-flex;align-items:center;gap:6px;color:#38bdf8;border:1px solid rgba(56,189,248,0.35);padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;transition:background 0.15s ease;';
    btnOpsSuite.innerHTML = '<i class="fa fa-external-link" style="color:#38bdf8;"></i> Full Azam-Ops Suite';
    actions.appendChild(btnOpsSuite);
    actions.appendChild(btnRefresh);
    actions.appendChild(btnDoctor);

    head.appendChild(titleBox);
    head.appendChild(actions);
    container.appendChild(head);

    // ── 2. Vital Metrics Cards (Top HUD) ──────────────────────
    var statsGrid = document.createElement('div');
    statsGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:14px;';
    statsGrid.innerHTML = 
      createStatCard('az-m-ram', 'Memory (RAM)', '—', 'fa-microchip', '#38bdf8') +
      createStatCard('az-m-cpu', 'CPU Load (1m)', '—', 'fa-tachometer', '#818cf8') +
      createStatCard('az-m-nodes', 'Active QEMU Nodes', '—', 'fa-cubes', '#34d399') +
      createStatCard('az-m-watchdog', '24/7 Watchdog', '—', 'fa-shield', '#fbbf24') +
      createStatCard('az-m-disk', 'Storage (/)', '—', 'fa-hdd-o', '#f472b6');
    container.appendChild(statsGrid);

    // ── 3. Tab Bar Navigation ─────────────────────────────────
    var navTabs = document.createElement('div');
    navTabs.style.cssText = 'display:flex;gap:6px;border-bottom:2px solid var(--pnq-border,rgba(255,255,255,0.08));padding-bottom:2px;overflow-x:auto;scrollbar-width:thin;';

    var tabs = [
      { id: 'bootstorm', name: 'Anti-Bootstorm Engine',   icon: 'fa-rocket' },
      { id: 'health',    name: 'Cluster Health',          icon: 'fa-heartbeat' },
      { id: 'backup',    name: 'Backup & Snapshots',      icon: 'fa-history' },
      { id: 'git',       name: 'Topology Git',            icon: 'fa-code-fork' },
      { id: 'bridge',    name: 'Cloud & LAN Transit',     icon: 'fa-globe' },
      { id: 'ai',        name: 'AI Lab Architect',       icon: 'fa-magic' },
      { id: 'mesh',      name: 'Cluster Reachability',    icon: 'fa-exchange' },
      { id: 'scheduler', name: 'Idle Saver & Quotas',     icon: 'fa-clock-o' },
      { id: 'ssl',       name: 'SSL IP-SAN Manager',      icon: 'fa-lock' }
    ];


    tabs.forEach(function (t, idx) {
      var tabBtn = document.createElement('button');
      tabBtn.type = 'button';
      tabBtn.className = 'az-tab-btn' + (idx === 0 ? ' is-active' : '');
      tabBtn.dataset.tab = t.id;
      tabBtn.style.cssText = 'background:none;border:none;padding:8px 12px;font-size:12.5px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;display:flex;align-items:center;gap:6px;transition:all 0.15s ease;white-space:nowrap;';
      if (idx === 0) {
        tabBtn.style.color = '#38bdf8';
        tabBtn.style.borderBottomColor = '#38bdf8';
      }
      tabBtn.innerHTML = '<i class="fa ' + t.icon + '"></i> ' + t.name;
      tabBtn.onclick = function () { switchTab(t.id); };
      navTabs.appendChild(tabBtn);
    });
    container.appendChild(navTabs);

    // ── 4. Tab Panes Container ────────────────────────────────
    var panesContainer = document.createElement('div');
    panesContainer.id = 'az-panes';

    // ── Pane 1: Health & Diagnostics ──
    var pHealth = document.createElement('div');
    pHealth.id = 'pane-health';
    pHealth.style.display = 'none';
    pHealth.innerHTML = 
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">' +
        createToolCard('fleet', 'pnet-fleet', 'Cluster Fleet & Satellite Monitor', 'Pings Master & Satellites (192.168.1.22, <MASTER_IP>, 192.168.1.24), checks WireGuard/GRE tunnels and node distribution.', 'fa-server', '#0284c7', 'term-fleet') +
        createToolCard('capacity', 'pnet-capacity', 'Resource Capacity Planner', 'Live calculation of remaining RAM, vCPU cores, and maximum additional QEMU/IOL node slots before saturation.', 'fa-bar-chart', '#059669', 'term-capacity') +
        createToolCard('doctor', 'pnet-doctor', 'Cluster Doctor & Self-Healer', 'Deep diagnostic check of file permissions, disk health, orphan QEMU processes, and Apache proxy settings.', 'fa-stethoscope', '#d97706', 'term-doctor') +
        createToolCard('perf', 'pnet-perf', 'Performance Benchmark', 'Measures real-time memory throughput, disk I/O latency, and system load stress test.', 'fa-dashboard', '#7c3aed', 'term-perf') +
        createToolCard('watchdog-status', 'pnet-watchdog', '24/7 Watchdog Service', 'Autonomous background systemd service that monitors cluster health continuously.', 'fa-eye', '#dc2626', 'term-watchdog', [{ label: 'Reinstall / Enable', param: 'install', tool: 'watchdog-install' }]) +
        createToolCard('console-fix-full', 'pnet-console-fix', 'HTML5 Console Auto-Fixer', 'Repairs Guacamole WebSockets, cleans stale pipes, and tests guacd daemon health.', 'fa-terminal', '#10b981', 'term-console-fix') +
      '</div>' +
      '<div class="card" style="margin-top:16px;background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:18px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div style="width:36px;height:36px;border-radius:8px;background:rgba(239,68,68,0.15);color:#ef4444;display:flex;align-items:center;justify-content:center;font-size:18px;"><i class="fa fa-fire"></i></div>' +
            '<div><div style="font-weight:600;font-size:15px;color:#f1f5f9;">Live Hot-Node Resource Profiler</div><div style="font-size:12px;color:var(--pnq-text-muted,#94a3b8);">Active QEMU/IOL processes ranked by CPU% and Resident Memory</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<button type="button" id="btn-perf-refresh" class="btn btn-ghost" style="font-size:12px;"><i class="fa fa-refresh"></i> Refresh Profiler</button>' +
            '<button type="button" id="btn-perf-kill" class="btn btn-danger" style="background:#dc2626;color:#fff;font-size:12px;padding:6px 12px;border:none;border-radius:6px;font-weight:600;"><i class="fa fa-pause-circle"></i> Pause Top Offender (--kill-hot)</button>' +
          '</div>' +
        '</div>' +
        '<div id="perf-nodes-table" style="max-height:260px;overflow-y:auto;background:rgba(0,0,0,0.25);border-radius:8px;border:1px solid var(--pnq-border,rgba(255,255,255,0.06));padding:4px;">' +
          '<div style="padding:10px;color:#64748b;">Click "Refresh Profiler" to view top hot nodes.</div>' +
        '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:16px;background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:18px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:12px;">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div style="width:36px;height:36px;border-radius:8px;background:rgba(14,165,233,0.15);color:#0ea5e9;display:flex;align-items:center;justify-content:center;font-size:18px;"><i class="fa fa-tachometer"></i></div>' +
            '<div><div style="font-weight:600;font-size:15px;color:#f1f5f9;">RoCE MTU 9000 & Jumbo Frame Synthetic Benchmark</div><div style="font-size:12px;color:var(--pnq-text-muted,#94a3b8);">High-speed datapath throughput, MTU 9000 packet validation, and inter-satellite latency probe</div></div>' +
          '</div>' +
          '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">' +
            '<input type="text" id="roce-bench-ip" value="192.168.1.22" placeholder="Satellite IP" style="padding:6px 12px;background:rgba(0,0,0,0.25);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:12.5px;width:140px;">' +
            '<select id="roce-bench-mtu" style="padding:6px 10px;background:rgba(0,0,0,0.25);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:12.5px;">' +
              '<option value="9000">MTU 9000 (Jumbo Frames)</option>' +
              '<option value="1500">MTU 1500 (Standard)</option>' +
            '</select>' +
            '<button type="button" id="btn-run-roce-bench" class="btn btn-primary" style="background:#0ea5e9;border:none;color:#fff;font-weight:600;font-size:12.5px;"><i class="fa fa-bolt"></i> Run Benchmark</button>' +
          '</div>' +
        '</div>' +
        '<div id="term-roce-bench" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:12px;max-height:220px;overflow-y:auto;"></div>' +
      '</div>';
    
    // ── Pane 0: Anti-Bootstorm Staggered Startup Engine ──
    var pBootstorm = document.createElement('div');
    pBootstorm.id = 'pane-bootstorm';
    pBootstorm.style.display = 'block';
    pBootstorm.innerHTML = 
      '<div style="display:flex;flex-direction:column;gap:18px;">' +
        '<div class="card" style="background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:22px;box-shadow:0 4px 16px rgba(0,0,0,0.25);">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:16px;">' +
            '<div style="display:flex;align-items:center;gap:14px;">' +
              '<div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 12px rgba(245,158,11,0.35);"><i class="fa fa-rocket"></i></div>' +
              '<div>' +
                '<div style="font-weight:700;font-size:18px;color:#f8fafc;">PNetLab Anti-Bootstorm Staggered Node Startup Engine</div>' +
                '<div style="font-size:13px;color:var(--pnq-text-muted,#94a3b8);margin-top:2px;">Prevents CPU/IO thrashing, hypervisor halt-polling spinlocks, and memory lockups during massive lab startups.</div>' +
              '</div>' +
            '</div>' +
            '<span style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);">ACTIVE ENGINE v6.8.93</span>' +
          '</div>' +

          '<!-- Staggered Tiers Info -->' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:20px;">' +
            '<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:12px;">' +
              '<div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:#f87171;"><i class="fa fa-fire"></i> Tier 1: Heavyweight Nodes (18s Stagger)</div>' +
              '<div style="font-size:11.5px;color:#cbd5e1;margin-top:4px;">Cisco 8000, Cat8k, Cat9k, XRd, XRv9k, Windows 11/Server, vMX, NX-OSv, F5, Palo Alto. Booted 2 per batch with 18s stabilization delay.</div>' +
            '</div>' +
            '<div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:12px;">' +
              '<div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:#fbbf24;"><i class="fa fa-clock-o"></i> Tier 2: Mediumweight Nodes (10s Stagger)</div>' +
              '<div style="font-size:11.5px;color:#cbd5e1;margin-top:4px;">CSR1000v, FortiGate, vEOS, IOSvL2, VyOS, Mikrotik RouterOS, pfSense. Booted 4 per batch with 10s inter-batch pacing.</div>' +
            '</div>' +
            '<div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:8px;padding:12px;">' +
              '<div style="display:flex;align-items:center;gap:8px;font-weight:700;font-size:13px;color:#4ade80;"><i class="fa fa-bolt"></i> Tier 3: Lightweight Nodes (Concurrent)</div>' +
              '<div style="font-size:11.5px;color:#cbd5e1;margin-top:4px;">Cisco IOL (L2/L3), VPCS Netprobe, Alpine Linux, Docker Containers. Launched simultaneously with zero delay after Tier 2.</div>' +
            '</div>' +
          '</div>' +

          '<!-- Form Controls -->' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:18px;">' +
            '<div style="grid-column: 1 / -1;">' +
              '<label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:6px;">Target Lab Path (.unl):</label>' +
              '<div style="display:flex;gap:8px;">' +
                '<input type="text" id="bs-lab-path" value="9 - CCIE/3 - Switching/Lab-1 Configuring Trunks.unl" placeholder="e.g. 9 - CCIE/3 - Switching/Lab-1 Configuring Trunks.unl or /Admin/active_lab.unl" style="flex:1;padding:10px 14px;background:rgba(0,0,0,0.3);border:1px solid var(--pnq-border,rgba(255,255,255,0.12));border-radius:8px;color:#fff;font-family:monospace;font-size:13px;">' +
                '<select id="bs-lab-quickselect" style="padding:10px 12px;background:rgba(0,0,0,0.3);border:1px solid var(--pnq-border,rgba(255,255,255,0.12));border-radius:8px;color:#fff;font-size:12.5px;max-width:260px;">' +
                  '<option value="">⚡ Quick Select Lab...</option>' +
                  '<option value="9 - CCIE/3 - Switching/Lab-1 Configuring Trunks.unl">CCIE Switching Lab-1 (6 Nodes)</option>' +
                  '<option value="9 - CCIE/9 - Automation/4 - CAT-9000.unl">CCIE CAT-9000 Automation</option>' +
                  '<option value="9 - CCIE/9 - Automation/3 - IOS-XE-8000v-API.unl">CCIE Cisco 8000v API</option>' +
                  '<option value="9 - CCIE/4 - EIGRP/0 - EIGRP-All-In-One.unl">CCIE EIGRP All-In-One</option>' +
                  '<option value="9 - CCIE/5 - MPLS-L3VPN/0 - MPLS-L3VPN-All-In-One.unl">CCIE MPLS-L3VPN All-In-One</option>' +
                  '<option value="9 - CCIE/6 - DMVPN-IPsec/0 - DMVPN-IPsec-All-In-One.unl">CCIE DMVPN IPsec Hub</option>' +
                  '<option value="8  - AI/IOS.unl">AI / IOS Master Lab</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div>' +
              '<label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:6px;">Heavy Batch Delay (Seconds):</label>' +
              '<input type="number" id="bs-heavy-delay" value="18" min="5" max="60" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:13px;">' +
            '</div>' +
            '<div>' +
              '<label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:6px;">Medium Batch Delay (Seconds):</label>' +
              '<input type="number" id="bs-medium-delay" value="10" min="3" max="30" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:13px;">' +
            '</div>' +
            '<div>' +
              '<label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:6px;">Console Socket Verification:</label>' +
              '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding-top:6px;font-size:13px;color:#cbd5e1;">' +
                '<input type="checkbox" id="bs-probe-console" checked style="accent-color:#f59e0b;transform:scale(1.15);">' +
                '<span>Probe TCP console port before advancing</span>' +
              '</label>' +
            '</div>' +
            '<div>' +
              '<label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:6px;">KSM RAM Deduplication:</label>' +
              '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding-top:6px;font-size:13px;color:#cbd5e1;">' +
                '<input type="checkbox" id="bs-ksm" checked style="accent-color:#f59e0b;transform:scale(1.15);">' +
                '<span>Re-engage Ultra-KSM zero-page scan</span>' +
              '</label>' +
            '</div>' +
          '</div>' +

          '<!-- Launch Buttons -->' +
          '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding-top:6px;border-top:1px solid var(--pnq-border,rgba(255,255,255,0.08));">' +
            '<button type="button" id="btn-bootstorm-launch" class="btn btn-primary" style="background:linear-gradient(135deg,#f59e0b,#ea580c);border:none;color:#fff;font-weight:700;font-size:13.5px;padding:9px 18px;border-radius:8px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;box-shadow:0 4px 12px rgba(245,158,11,0.3);">' +
              '<i class="fa fa-rocket"></i> Launch Anti-Bootstorm Startup' +
            '</button>' +
            '<button type="button" id="btn-bootstorm-dryrun" class="btn btn-ghost" style="border:1px solid rgba(245,158,11,0.4);color:#f59e0b;font-weight:600;font-size:13.5px;padding:9px 18px;border-radius:8px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;">' +
              '<i class="fa fa-search"></i> Dry-Run Simulation (Pre-Flight Plan)' +
            '</button>' +
            '<button type="button" id="btn-bootstorm-clear" class="btn btn-ghost" style="font-size:12px;color:var(--pnq-text-muted,#94a3b8);">' +
              '<i class="fa fa-trash"></i> Clear Output' +
            '</button>' +
          '</div>' +
        '</div>' +

        '<!-- Anti-Bootstorm Live Streaming Terminal -->' +
        '<div id="term-bootstorm" style="display:block;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;font-family:monospace;font-size:12.5px;min-height:300px;max-height:560px;overflow-y:auto;color:#38bdf8;">' +
          '<div style="color:#64748b;">// Anti-Bootstorm Engine ready. Select a lab and click "Launch Anti-Bootstorm Startup" or "Dry-Run Simulation".</div>' +
        '</div>' +
      '</div>';
    panesContainer.appendChild(pBootstorm);

    // ── Pane 2: Cluster Backup & Snapshots ──
    var pBackup = document.createElement('div');
    pBackup.id = 'pane-backup';
    pBackup.style.display = 'none';
    pBackup.innerHTML = 
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">' +
        createToolCard('backup-create', 'pnet-backup', 'Create Cluster Snapshot Backup', 'Generates an immediate timestamped archive (.tar.gz) of MySQL database, lab topologies, user configs, and templates.', 'fa-archive', '#0284c7', 'term-backup') +
        createToolCard('backup-list', 'pnet-restore', 'Browse & Restore Lab Snapshots', 'Inspects existing archives in /opt/unetlab/data/Backups/ and validates MD5 hashes prior to restoration.', 'fa-history', '#10b981', 'term-backup') +
      '</div>' +
      '<div id="term-backup" style="display:none;margin-top:16px;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;font-family:monospace;font-size:12px;max-height:320px;overflow-y:auto;"></div>';
    panesContainer.appendChild(pBackup);

    // ── Pane 3: Topology Git Version Control ──
    var pGit = document.createElement('div');
    pGit.id = 'pane-git';
    pGit.style.display = 'none';
    pGit.innerHTML = 
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">' +
        createToolCard('topology-snapshot', 'pnet-topology-git --snapshot', 'Commit Topology Git Snapshot', 'Takes an atomic Git commit snapshot of all lab .unl files with SHA-1 tracking and change summaries.', 'fa-code-fork', '#8b5cf6', 'term-git') +
        createToolCard('topology-log', 'pnet-topology-git --log', 'Topology Commit History & Diffs', 'Inspects historical topology revisions, visualizes added/removed nodes, and enables rollback.', 'fa-history', '#ec4899', 'term-git') +
      '</div>' +
      '<div id="term-git" style="display:none;margin-top:16px;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;font-family:monospace;font-size:12px;max-height:320px;overflow-y:auto;"></div>';
    panesContainer.appendChild(pGit);

    // ── Pane 5: SSL IP-SAN Certificate Manager ──
    var pSsl = document.createElement('div');
    pSsl.id = 'pane-ssl';
    pSsl.style.display = 'none';
    pSsl.innerHTML = 
      '<div class="card" style="background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:20px;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">' +
          '<div style="width:40px;height:40px;border-radius:10px;background:rgba(16,185,129,0.15);color:#10b981;display:flex;align-items:center;justify-content:center;font-size:20px;"><i class="fa fa-lock"></i></div>' +
          '<div>' +
            '<div style="font-weight:700;font-size:16px;color:#f8fafc;">Enterprise 5-Year IP-SAN SSL Certificate Generator</div>' +
            '<div style="font-size:12.5px;color:var(--pnq-text-muted,#94a3b8);">Generates a trusted X.509 certificate with Subject Alternative Names (SAN) for all cluster IPs and hostnames.</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px;">' +
          '<input type="text" id="ssl-ip-input" value="<MASTER_IP>" placeholder="Master IP / Domain" style="padding:8px 14px;background:rgba(0,0,0,0.3);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:13px;width:200px;">' +
          '<button type="button" id="btn-ssl-gen" class="btn btn-primary" style="background:#10b981;border:none;color:#fff;font-weight:700;padding:8px 16px;"><i class="fa fa-shield"></i> Generate 5-Year SSL Certificate</button>' +
        '</div>' +
        '<div id="term-ssl" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:12px;max-height:220px;overflow-y:auto;"></div>' +
      '</div>';
    panesContainer.appendChild(pSsl);

    panesContainer.appendChild(pHealth);

    // ── Pane 4: Cloud & LAN Transit ──
    var pBridge = document.createElement('div');
    pBridge.id = 'pane-bridge';
    pBridge.style.display = 'none';
    pBridge.innerHTML = 
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">' +
        createToolCard('bridge-status', 'pnet-cloud-bridge', 'Transit Gateway & WireGuard Cloud Status', 'Inspects real-LAN bridging, outbound NAT masquerading, and WireGuard Cloud VPC tunnels.', 'fa-globe', '#0ea5e9', 'term-bridge', [
          { label: 'Enable Outbound NAT', tool: 'bridge-enable-nat' },
          { label: 'Disable NAT', tool: 'bridge-disable-nat' },
          { label: 'WireGuard UP', tool: 'bridge-wireguard-up' }
        ]) +
        '<div class="card" style="background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:18px;">' +
          '<div style="font-weight:600;font-size:15px;margin-bottom:10px;"><i class="fa fa-info-circle"></i> Real-LAN Transit Bridging Guide</div>' +
          '<div style="font-size:12.5px;color:var(--pnq-text-muted,#94a3b8);line-height:1.6;">' +
            '• <b>LAN Bridging:</b> Connect any lab node interface to network type <i>Cloud0 (pnet0)</i> to assign IPs directly on your 192.168.1.0/24 subnet.<br>' +
            '• <b>Internet Access:</b> Outbound NAT translates lab subnets (10.0.0.0/8, 172.16.0.0/12) through eth0 so routers can update software and reach internet NTP/DNS.<br>' +
            '• <b>WireGuard:</b> Tunnels lab traffic directly to AWS VPC or Azure VNet over encrypted UDP.' +
          '</div>' +
        '</div>' +
      '</div>';
    panesContainer.appendChild(pBridge);



    // ── Pane 7: AI Lab Copilot ──
    var pAi = document.createElement('div');
    pAi.id = 'pane-ai';
    pAi.style.display = 'none';
    pAi.innerHTML = 
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">' +
        '<div style="display:flex;flex-direction:column;gap:16px;">' +
          '<div class="card" style="background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:18px;">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
              '<div style="width:36px;height:36px;border-radius:8px;background:rgba(124,58,237,0.15);color:#a78bfa;display:flex;align-items:center;justify-content:center;font-size:18px;"><i class="fa fa-magic"></i></div>' +
              '<div><div style="font-weight:600;font-size:15px;color:#f1f5f9;">Network Config Generator</div><div style="font-size:12px;color:var(--pnq-text-muted,#94a3b8);">Generate production-ready syntax using AI Copilot or built-in templates</div></div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px;">' +
              '<div><label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:4px;">Built-in Template:</label>' +
                '<select id="ai-tmpl-select" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.25);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:13px;">' +
                  '<option value="cisco_ospf">Cisco IOS-XE — OSPF Multi-Area + MD5 Auth</option>' +
                  '<option value="cisco_bgp">Cisco IOS-XE — eBGP Dual-Homed + BFD</option>' +
                  '<option value="arista_evpn">Arista EOS — VXLAN EVPN Anycast Gateway</option>' +
                  '<option value="juniper_bgp">Juniper Junos — BGP Peering + Import/Export</option>' +
                  '<option value="frr_ospf">Linux FRRouting — OSPF & BGP Dual-Stack</option>' +
                '</select>' +
              '</div>' +
              '<div><label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:4px;">Or Custom AI Prompt:</label>' +
                '<input type="text" id="ai-custom-prompt" placeholder="e.g. Generate Cisco 8000v BGP EVPN with VXLAN VNI 10010" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.25);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:13px;">' +
              '</div>' +
            '</div>' +
            '<button type="button" id="btn-ai-gen" class="btn btn-primary" style="background:#7c3aed;border-color:#7c3aed;color:#fff;"><i class="fa fa-code"></i> Generate Configuration</button>' +
          '</div>' +
          '<div class="card" style="background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:18px;">' +
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
              '<div style="width:36px;height:36px;border-radius:8px;background:rgba(234,179,8,0.15);color:#eab308;display:flex;align-items:center;justify-content:center;font-size:18px;"><i class="fa fa-stethoscope"></i></div>' +
              '<div><div style="font-weight:600;font-size:15px;color:#f1f5f9;">Routing Diagnostics Analyzer</div><div style="font-size:12px;color:var(--pnq-text-muted,#94a3b8);">Paste show output or syslog errors for root-cause analysis</div></div>' +
            '</div>' +
            '<textarea id="ai-diag-log" rows="4" placeholder="Paste show ip route, show ip ospf neighbor, or BGP flap logs..." style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.25);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:12px;font-family:monospace;margin-bottom:12px;"></textarea>' +
            '<button type="button" id="btn-ai-diag" class="btn btn-ghost"><i class="fa fa-search"></i> Diagnose Issue</button>' +
          '</div>' +
        '</div>' +
        '<div id="term-ai" style="display:block;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;font-family:monospace;font-size:12.5px;min-height:360px;max-height:560px;overflow-y:auto;color:#38bdf8;">' +
          '<div style="color:#64748b;">// AI Copilot Output Terminal ready.</div>' +
        '</div>' +
      '</div>';
    panesContainer.appendChild(pAi);



    // ── Pane 9: Cluster Reachability Mesh ──
    var pMesh = document.createElement('div');
    pMesh.id = 'pane-mesh';
    pMesh.style.display = 'none';
    pMesh.innerHTML = 
      '<div style="display:flex;flex-direction:column;gap:16px;">' +
        '<div class="card" style="background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:18px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:12px;">' +
            '<div>' +
              '<div style="font-weight:600;font-size:15px;color:#f1f5f9;"><i class="fa fa-table" style="color:#0ea5e9;margin-right:8px;"></i> Cluster Data Plane Reachability Matrix</div>' +
              '<div style="font-size:12px;color:var(--pnq-text-muted,#94a3b8);margin-top:2px;">Probes ICMP latency and MTU 9000 reachability across Master and Satellite worker nodes</div>' +
            '</div>' +
            '<button type="button" id="btn-mesh-sweep" class="btn btn-primary btn-sm"><i class="fa fa-refresh"></i> Run Mesh Sweep</button>' +
          '</div>' +
          '<div id="az-mesh-table" style="font-size:13px;color:var(--pnq-text-muted,#94a3b8);background:rgba(0,0,0,0.25);border-radius:8px;padding:14px;border:1px solid var(--pnq-border,rgba(255,255,255,0.06));">Click "Run Mesh Sweep" to test IP reachability across the cluster.</div>' +
        '</div>' +
      '</div>';
    panesContainer.appendChild(pMesh);

    // ── Pane 10: Scheduler & Quotas ──
    var pSched = document.createElement('div');
    pSched.id = 'pane-scheduler';
    pSched.style.display = 'none';
    pSched.innerHTML = 
      '<div style="display:flex;flex-direction:column;gap:16px;">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">' +
          createToolCard('scheduler-status', 'pnet-scheduler', 'Resource Quota & Curfew Watchdog', 'Inspects idle timeout settings, nightly power-saver curfews, and role-based node limits.', 'fa-clock-o', '#f59e0b', 'term-sched', [
            { label: 'Stop Idle Labs Now', tool: 'scheduler-stop-idle' },
            { label: 'Audit Compliance', tool: 'scheduler-check' }
          ]) +
        '</div>' +
        '<div class="card" style="background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:18px;">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">' +
            '<div style="width:36px;height:36px;border-radius:8px;background:rgba(245,158,11,0.15);color:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:18px;"><i class="fa fa-sliders"></i></div>' +
            '<div><div style="font-weight:600;font-size:15px;color:#f1f5f9;">Idle Auto-Shutdown & Tenant Capacity Policy</div><div style="font-size:12px;color:var(--pnq-text-muted,#94a3b8);">Configure autonomous lab shutdown timer, max active nodes per student, and nightly power-saver curfew</div></div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-bottom:14px;">' +
            '<div><label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:4px;">Idle Auto-Shutdown (Minutes):</label>' +
              '<input type="number" id="sched-idle-timeout" value="60" min="15" max="720" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.25);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:13px;">' +
            '</div>' +
            '<div><label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:4px;">Max Active Nodes Per Tenant / Student:</label>' +
              '<input type="number" id="sched-max-nodes" value="12" min="1" max="64" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.25);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:13px;">' +
            '</div>' +
            '<div><label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:4px;">Curfew Start (HH:MM):</label>' +
              '<input type="text" id="sched-curfew-start" value="23:00" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.25);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:13px;">' +
            '</div>' +
            '<div><label style="font-size:12px;font-weight:600;color:var(--pnq-text-muted,#94a3b8);display:block;margin-bottom:4px;">Curfew End (HH:MM):</label>' +
              '<input type="text" id="sched-curfew-end" value="07:00" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.25);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:13px;">' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">' +
            '<button type="button" id="btn-sched-save" class="btn btn-primary" style="background:#f59e0b;border-color:#f59e0b;color:#000;font-weight:700;"><i class="fa fa-save"></i> Save & Apply Policy</button>' +
            '<button type="button" id="btn-sched-stop-now" class="btn btn-danger" style="background:#dc2626;border:none;color:#fff;font-weight:600;"><i class="fa fa-power-off"></i> Stop Idle Labs Now</button>' +
          '</div>' +
          '<div id="term-sched-policy" style="display:none;margin-top:12px;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:12px;"></div>' +
        '</div>' +
      '</div>';
    panesContainer.appendChild(pSched);

    container.appendChild(panesContainer);
    view.appendChild(container);

    // ── Wire Event Handlers ──
    wirePanes(container);
    loadStats();
    loadMesh();
    loadPerf();
  }

  /* ── Tab Switching Helper ───────────────────────────────── */
  function switchTab(tabId) {
    var btns = document.querySelectorAll('.az-tab-btn');
    btns.forEach(function (b) {
      var isActive = b.dataset.tab === tabId;
      b.classList.toggle('is-active', isActive);
      b.style.color = isActive ? '#38bdf8' : 'var(--pnq-text-muted,#94a3b8)';
      b.style.borderBottomColor = isActive ? '#38bdf8' : 'transparent';
    });

    ['bootstorm', 'health', 'backup', 'git', 'bridge', 'ai', 'mesh', 'scheduler', 'ssl', 'diff'].forEach(function (id) {
      var p = document.getElementById('pane-' + id);
      if (p) p.style.display = id === tabId ? 'block' : 'none';
    });

  }

  /* ── Wire Dynamic Buttons ───────────────────────────────── */
  function wirePanes(container) {
    // ── Bootstorm Wiring ──
    var qSelect = container.querySelector('#bs-lab-quickselect');
    var lInput = container.querySelector('#bs-lab-path');
    if (qSelect && lInput) {
      qSelect.onchange = function () {
        if (qSelect.value) lInput.value = qSelect.value;
      };
    }

    var btnBsLaunch = container.querySelector('#btn-bootstorm-launch');
    var btnBsDry = container.querySelector('#btn-bootstorm-dryrun');
    var btnBsClear = container.querySelector('#btn-bootstorm-clear');
    var termBs = container.querySelector('#term-bootstorm');

    if (btnBsClear && termBs) {
      btnBsClear.onclick = function () {
        termBs.innerHTML = '<div style="color:#64748b;">// Output cleared. Ready.</div>';
      };
    }

    function launchBootstorm(dryRun, btn) {
      var lab = (lInput ? lInput.value.trim() : '');
      if (!lab) {
        if (App && App.toast) App.toast('Please specify target lab path', 'warn');
        return;
      }
      var hDelay = container.querySelector('#bs-heavy-delay') ? container.querySelector('#bs-heavy-delay').value : '18';
      var mDelay = container.querySelector('#bs-medium-delay') ? container.querySelector('#bs-medium-delay').value : '10';
      var probeConsole = container.querySelector('#bs-probe-console') ? container.querySelector('#bs-probe-console').checked : true;
      var ksm = container.querySelector('#bs-ksm') ? container.querySelector('#bs-ksm').checked : true;

      var params = {
        lab: lab,
        heavy_delay: hDelay,
        medium_delay: mDelay,
        probe_console: probeConsole,
        ksm: ksm,
        dry_run: dryRun
      };

      runTool('bootstorm-start', params, btn, 'term-bootstorm');
    }

    if (btnBsLaunch) {
      btnBsLaunch.onclick = function () { launchBootstorm(false, btnBsLaunch); };
    }
    if (btnBsDry) {
      btnBsDry.onclick = function () { launchBootstorm(true, btnBsDry); };
    }

    // ── SSL Wiring ──
    var btnSslGen = container.querySelector('#btn-ssl-gen');
    var sslIpInput = container.querySelector('#ssl-ip-input');
    if (btnSslGen) {
      btnSslGen.onclick = function () {
        var ip = sslIpInput ? sslIpInput.value.trim() : '<MASTER_IP>';
        runTool('ssl-generate', { ip: ip }, btnSslGen, 'term-ssl');
      };
    }

    container.querySelectorAll('[data-az-tool]').forEach(function (btn) {
      btn.onclick = function () {
        var tool = btn.dataset.azTool;
        var term = btn.dataset.azTerm;
        var params = {};

        if (tool === 'bench') {
          var ipInput = document.getElementById('bench-ip');
          params.satellite_ip = ipInput ? ipInput.value.trim() : '';
          if (!params.satellite_ip) { App.toast('Please enter Satellite IP', 'warn'); return; }
        }

        runTool(tool, params, btn, term);
      };
    });





    // AI Copilot Generate
    var btnAiGen = container.querySelector('#btn-ai-gen');
    if (btnAiGen) {
      btnAiGen.onclick = function () {
        var tmpl = document.getElementById('ai-tmpl-select').value;
        var custom = document.getElementById('ai-custom-prompt').value.trim();
        runTool('ai-generate', { template: tmpl, prompt: custom }, btnAiGen, 'term-ai');
      };
    }

    // AI Copilot Diagnose
    var btnAiDiag = container.querySelector('#btn-ai-diag');
    if (btnAiDiag) {
      btnAiDiag.onclick = function () {
        var log = document.getElementById('ai-diag-log').value.trim();
        runTool('ai-diagnose', { log: log }, btnAiDiag, 'term-ai');
      };
    }



    // Ping Mesh Sweep
    var btnMesh = container.querySelector('#btn-mesh-sweep');
    if (btnMesh) {
      btnMesh.onclick = loadMesh;
    }





    // Hot-Node Profiler refresh & kill
    var btnPerfRef = container.querySelector('#btn-perf-refresh');
    if (btnPerfRef) {
      btnPerfRef.onclick = loadPerf;
    }
    var btnPerfKill = container.querySelector('#btn-perf-kill');
    if (btnPerfKill) {
      btnPerfKill.onclick = function () {
        runTool('perf-kill', {}, btnPerfKill, 'term-perf');
      };
    }

    // RoCE MTU 9000 Benchmark
    var btnRoce = container.querySelector('#btn-run-roce-bench');
    if (btnRoce) {
      btnRoce.onclick = function () {
        var ip = (document.getElementById('roce-bench-ip') || {}).value || '';
        var mtu = (document.getElementById('roce-bench-mtu') || {}).value || '9000';
        ip = ip.trim();
        if (!ip) { App.toast('Enter Satellite IP', 'warn'); return; }
        runTool('bench', { satellite_ip: ip, mtu: mtu }, btnRoce, 'term-roce-bench');
      };
    }

    // Scheduler & Curfew Policy Save
    var btnSchedSave = container.querySelector('#btn-sched-save');
    if (btnSchedSave) {
      btnSchedSave.onclick = function () {
        var idleTimeout = parseInt((document.getElementById('sched-idle-timeout') || {}).value, 10) || 60;
        var maxNodes = parseInt((document.getElementById('sched-max-nodes') || {}).value, 10) || 12;
        var curfewStart = ((document.getElementById('sched-curfew-start') || {}).value || '23:00').trim();
        var curfewEnd = ((document.getElementById('sched-curfew-end') || {}).value || '07:00').trim();

        btnSchedSave.disabled = true;
        fetch(API_BASE + '/scheduler/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idle_timeout_min: idleTimeout,
            max_nodes_per_user: maxNodes,
            curfew_start: curfewStart,
            curfew_end: curfewEnd,
            auto_shutdown_enabled: true
          })
        }).then(function(r) { return r.json(); }).then(function(res) {
          btnSchedSave.disabled = false;
          if (res.success) {
            App.toast('Scheduler & Quota Policy updated successfully', 'ok');
          } else {
            App.toast('Failed: ' + (res.error || 'Server error'), 'err');
          }
        }).catch(function(e) {
          btnSchedSave.disabled = false;
          App.toast('Error: ' + e.message, 'err');
        });
      };
    }

    // Stop Idle Labs Now
    var btnSchedStop = container.querySelector('#btn-sched-stop-now');
    if (btnSchedStop) {
      btnSchedStop.onclick = function () {
        if (!confirm('Halt all idle lab sessions immediately?\n\nNodes in labs with no console interaction for >60min will be gracefully shut down.')) return;
        runTool('scheduler-stop-idle', {}, btnSchedStop, 'term-sched-policy');
      };
    }
  }

  /* ── Stats Loader ───────────────────────────────────────── */
  function loadStats() {
    fetch(API_BASE + '/stats')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        setStat('az-m-ram', (d.ram_used_gb || 0) + ' / ' + (d.ram_total_gb || 0) + ' GB', (d.ram_pct || 0) + '% used');
        setStat('az-m-cpu', (d.load1 != null ? d.load1 : '—'), (d.cpus || 1) + ' vCPU cores');
        setStat('az-m-nodes', d.active_nodes || 0, 'Active QEMU/IOL');
        setStat('az-m-watchdog', d.watchdog === 'active' ? 'Active' : 'Stopped', d.watchdog === 'active' ? 'Self-healing ON' : 'Service idle', d.watchdog === 'active' ? '#4ade80' : '#f87171');
        setStat('az-m-disk', (d.disk_used_gb || 0) + ' / ' + (d.disk_total_gb || 0) + ' GB', (d.disk_pct || 0) + '% used');
      })
      .catch(function () {});
  }

  function setStat(id, val, sub, customColor) {
    var card = document.getElementById(id);
    if (!card) return;
    var vEl = card.querySelector('.stat-val');
    var sEl = card.querySelector('.stat-sub');
    if (vEl) {
      vEl.textContent = val;
      if (customColor) vEl.style.color = customColor;
    }
    if (sEl && sub) sEl.textContent = sub;
  }

  /* ── Mesh Loader ────────────────────────────────────────── */
  function loadMesh() {
    var target = document.getElementById('az-mesh-table');
    if (!target) return;
    target.innerHTML = '<div style="padding:10px;"><i class="fa fa-spinner fa-spin"></i> Testing ping reachability across cluster endpoints…</div>';

    fetch(API_BASE + '/mesh/sweep')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var list = res.mesh || [];
        if (!list.length) {
          target.innerHTML = '<div style="padding:10px;color:#64748b;">No reachability data returned.</div>';
          return;
        }
        var html = '<table class="table" style="width:100%;">';
        html += '<thead><tr><th>Target Endpoint</th><th>IP Address</th><th>Status</th><th>Latency</th></tr></thead><tbody>';
        list.forEach(function (m) {
          var isUp = m.status === 'online';
          var statBadge = isUp 
            ? '<span style="color:#4ade80;font-weight:700;">● ONLINE</span>' 
            : '<span style="color:#f87171;font-weight:700;">○ OFFLINE</span>';
          var lat = m.latency_ms != null ? m.latency_ms + ' ms' : 'Timeout';
          html += '<tr>' +
            '<td style="font-weight:600;color:#f1f5f9;">' + m.name + '</td>' +
            '<td style="font-family:monospace;color:#38bdf8;">' + m.ip + '</td>' +
            '<td>' + statBadge + '</td>' +
            '<td style="font-family:monospace;font-weight:600;">' + lat + '</td>' +
          '</tr>';
        });
        html += '</tbody></table>';
        target.innerHTML = html;
      })
      .catch(function () {
        target.innerHTML = '<div style="padding:10px;color:#ef4444;">Failed to execute ping mesh sweep.</div>';
      });
  }

  /* ── Perf Loader ────────────────────────────────────────── */
  function loadPerf() {
    var target = document.getElementById('perf-nodes-table');
    if (!target) return;
    target.innerHTML = '<div style="padding:10px;color:#94a3b8;"><i class="fa fa-spinner fa-spin"></i> Profiling active QEMU/IOL processes…</div>';

    fetch(API_BASE + '/perf/top')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        var nodes = res.nodes || [];
        if (!nodes.length) {
          target.innerHTML = '<div style="padding:14px;color:#64748b;text-align:center;">No active node processes detected (0 QEMU/IOL running).</div>';
          return;
        }
        var html = '<table class="table" style="width:100%;font-size:12.5px;">';
        html += '<thead><tr><th>Node Name</th><th>PID</th><th>Type</th><th>CPU%</th><th>RAM (MB)</th><th>State</th><th>Action</th></tr></thead><tbody>';
        var canKill = !window.userRole || window.userRole === '0' || window.userRole === 0 || window.userRole === 'admin';
        nodes.forEach(function (n) {
          var cpuNum = parseFloat(n.cpu_pct) || 0;
          var cpuColor = cpuNum > 80 ? '#f87171' : (cpuNum > 40 ? '#fbbf24' : '#4ade80');
          var actionBtn = canKill
            ? '<button type="button" class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 8px;color:#f87171;" onclick="window.__azKillNode(' + n.pid + ')"><i class="fa fa-times-circle"></i> Kill</button>'
            : '<span style="font-size:10.5px;color:#64748b;">Admin-Only</span>';
          html += '<tr>' +
            '<td style="font-weight:600;color:#f1f5f9;">' + n.name + '</td>' +
            '<td style="font-family:monospace;color:#94a3b8;">' + n.pid + '</td>' +
            '<td><span style="font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(255,255,255,0.06);color:#38bdf8;">' + n.type + '</span></td>' +
            '<td style="font-family:monospace;font-weight:700;color:' + cpuColor + ';">' + n.cpu_pct + '%</td>' +
            '<td style="font-family:monospace;color:#a78bfa;">' + n.ram_mb + ' MB</td>' +
            '<td><span style="color:#4ade80;">' + n.state + '</span></td>' +
            '<td>' + actionBtn + '</td>' +
          '</tr>';
        });
        html += '</tbody></table>';
        target.innerHTML = html;
      })
      .catch(function () {
        target.innerHTML = '<div style="padding:10px;color:#ef4444;">Failed to retrieve process profiler metrics.</div>';
      });
  }

  window.__azKillNode = function(pid) {
    if (!confirm('Terminate process (PID ' + pid + ') immediately via SIGTERM?\n\nThis will stop the virtual node and release its hypervisor memory.')) return;
    fetch(API_BASE + '/perf-kill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Role': window.userRole || '0' },
      body: JSON.stringify({ pid: pid })
    }).then(function(r) { return r.json(); }).then(function(res) {
      if (res.success) {
        if (window.PnqApp && window.PnqApp.toast) window.PnqApp.toast(res.message, 'ok');
        else alert(res.message);
        setTimeout(loadPerf, 1000);
      } else {
        alert('Action failed: ' + (res.error || 'Permission denied'));
      }
    }).catch(function(e) {
      alert('Request failed: ' + e);
    });
  };

  /* ── Tool Runner with Live Stream ───────────────────────── */
  function runTool(tool, params, btn, termId) {
    var term = document.getElementById(termId);
    if (!term) return;

    term.style.display = 'block';
    term.innerHTML = 
      '<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.08);">' +
        '<div style="display:flex;gap:6px;">' +
          '<span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;"></span>' +
          '<span style="width:10px;height:10px;border-radius:50%;background:#eab308;display:inline-block;"></span>' +
          '<span style="width:10px;height:10px;border-radius:50%;background:#22c55e;display:inline-block;"></span>' +
        '</div>' +
        '<div style="font-size:11px;color:#64748b;font-family:monospace;">executing: ' + tool + '</div>' +
      '</div>';

    if (btn) btn.disabled = true;

    fetch(API_BASE + '/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: tool, params: params || {} })
    }).then(function (res) {
      if (!res.body) throw new Error('No response body stream');
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buf = '';

      function pump() {
        reader.read().then(function (r) {
          if (r.done) {
            if (btn) btn.disabled = false;
            loadStats();
            return;
          }
          buf += decoder.decode(r.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop();

          lines.forEach(function (line) {
            if (!line.startsWith('data:')) return;
            try {
              var obj = JSON.parse(line.slice(5).trim());
              if (obj.type === 'line') {
                var txt = stripAnsi(obj.data);
                if (!txt.trim()) return;
                var row = document.createElement('div');
                row.style.cssText = 'white-space:pre-wrap;word-break:break-all;line-height:1.45;color:' + getLineColor(txt) + ';';
                row.textContent = txt;
                term.appendChild(row);
                term.scrollTop = term.scrollHeight;
              } else if (obj.type === 'done') {
                var doneRow = document.createElement('div');
                doneRow.style.cssText = 'border-top:1px solid rgba(255,255,255,0.08);margin-top:8px;padding-top:6px;font-size:11px;color:#64748b;';
                doneRow.textContent = '── Process exited with status ' + obj.code + ' ──';
                term.appendChild(doneRow);
                term.scrollTop = term.scrollHeight;
                if (btn) btn.disabled = false;
                App.toast(obj.code === 0 ? '✔ Execution finished' : '⚠ Execution exited with code ' + obj.code, obj.code === 0 ? 'ok' : 'err');
                loadStats();
              }
            } catch (e) {}
          });
          pump();
        }).catch(function (err) {
          if (btn) btn.disabled = false;
        });
      }
      pump();
    }).catch(function (err) {
      if (btn) btn.disabled = false;
      var errDiv = document.createElement('div');
      errDiv.style.color = '#f87171';
      errDiv.textContent = 'Failed to execute tool: ' + err.message;
      term.appendChild(errDiv);
    });
  }

  /* ── HTML UI Template Builders ─────────────────────────── */
  function createStatCard(id, title, val, icon, color) {
    return (
      '<div id="' + id + '" class="card" style="background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:14px 16px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">' +
        '<div style="width:42px;height:42px;border-radius:10px;background:' + color + '15;border:1px solid ' + color + '30;display:flex;align-items:center;justify-content:center;color:' + color + ';font-size:18px;flex-shrink:0;">' +
          '<i class="fa ' + icon + '"></i>' +
        '</div>' +
        '<div style="overflow:hidden;flex:1;">' +
          '<div style="font-size:11.5px;text-transform:uppercase;letter-spacing:0.04em;color:var(--pnq-text-muted,#94a3b8);font-weight:600;">' + title + '</div>' +
          '<div class="stat-val" style="font-size:17px;font-weight:700;color:var(--pnq-text,#f1f5f9);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + val + '</div>' +
          '<div class="stat-sub" style="font-size:11px;color:#64748b;margin-top:2px;">Loading…</div>' +
        '</div>' +
      '</div>'
    );
  }

  function createToolCard(tool, cmd, title, desc, icon, color, termId, extraBtns, inputs) {
    var html = 
      '<div class="card" style="background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:14px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">' +
          '<div style="display:flex;gap:12px;align-items:center;">' +
            '<div style="width:38px;height:38px;border-radius:8px;background:' + color + '18;color:' + color + ';display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;">' +
              '<i class="fa ' + icon + '"></i>' +
            '</div>' +
            '<div>' +
              '<div style="font-weight:600;font-size:15px;color:#f1f5f9;">' + title + '</div>' +
              '<div style="font-family:monospace;font-size:11.5px;color:#38bdf8;margin-top:2px;">' + cmd + '</div>' +
            '</div>' +
          '</div>' +
          '<span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;background:rgba(56,189,248,0.15);color:#38bdf8;">CLI & GUI</span>' +
        '</div>' +
        '<div style="font-size:12.5px;color:var(--pnq-text-muted,#94a3b8);line-height:1.5;">' + desc + '</div>';

    if (inputs && inputs.length) {
      html += '<div style="display:flex;flex-direction:column;gap:8px;">';
      inputs.forEach(function (inp) {
        html += '<input type="text" id="' + inp.id + '" placeholder="' + inp.placeholder + '" style="padding:7px 12px;background:rgba(0,0,0,0.25);border:1px solid var(--pnq-border,rgba(255,255,255,0.1));border-radius:6px;color:#fff;font-size:12.5px;">';
      });
      html += '</div>';
    }

    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">';
    html += '<button type="button" class="btn btn-primary" data-az-tool="' + tool + '" data-az-term="' + termId + '" style="background:' + color + ';border-color:' + color + ';color:#fff;"><i class="fa fa-play"></i> Run ' + cmd + '</button>';

    if (extraBtns && extraBtns.length) {
      extraBtns.forEach(function (eb) {
        html += '<button type="button" class="btn btn-ghost btn-sm" data-az-tool="' + (eb.tool || tool) + '" data-az-term="' + termId + '">' + eb.label + '</button>';
      });
    }
    html += '</div>';

    html += '<div id="' + termId + '" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:12px;max-height:220px;overflow-y:auto;box-shadow:inset 0 2px 6px rgba(0,0,0,0.4);"></div>';
    html += '</div>';
    return html;
  }

  function createFeatureCard(name, desc, trigger, icon, color, detail) {
    return (
      '<div class="card" style="background:var(--pnq-surface,#1e293b);border:1px solid var(--pnq-border,rgba(255,255,255,0.08));border-radius:10px;padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<div style="display:flex;gap:10px;align-items:center;">' +
            '<div style="width:36px;height:36px;border-radius:8px;background:' + color + '20;color:' + color + ';display:flex;align-items:center;justify-content:center;font-size:16px;">' +
              '<i class="fa ' + icon + '"></i>' +
            '</div>' +
            '<div style="font-weight:600;font-size:14.5px;color:#f1f5f9;">' + name + '</div>' +
          '</div>' +
          '<span style="padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;font-family:monospace;background:rgba(255,255,255,0.08);color:#38bdf8;">' + trigger + '</span>' +
        '</div>' +
        '<div style="font-size:12.5px;color:var(--pnq-text-muted,#94a3b8);line-height:1.5;">' + desc + '</div>' +
        '<div style="font-size:12px;color:#64748b;border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;margin-top:auto;">' + detail + '</div>' +
      '</div>'
    );
  }

  /* ── Client Toolkit Modal ───────────────────────────────── */
  function openClientToolkitModal() {
    var modalId = 'az-client-toolkit-modal';
    var modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#f8fafc;';
      modal.innerHTML = 
        '<div style="width:680px;max-width:94%;background:#0f172a;border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.9);overflow:hidden;display:flex;flex-direction:column;max-height:85vh;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);background:#1e293b;">' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
              '<div style="width:36px;height:36px;border-radius:8px;background:rgba(167,139,250,0.2);color:#a78bfa;display:flex;align-items:center;justify-content:center;font-size:18px;"><i class="fa fa-wrench"></i></div>' +
              '<div>' +
                '<div style="font-weight:700;font-size:16px;color:#f1f5f9;">Enterprise Client Connectivity & NetDevOps Toolkit</div>' +
                '<div style="font-size:12px;color:#94a3b8;">Pre-configured client integration packs for 1-click terminal & packet capture</div>' +
              '</div>' +
            '</div>' +
            '<button type="button" id="az-toolkit-close" style="background:none;border:none;color:#94a3b8;font-size:22px;cursor:pointer;line-height:1;">&times;</button>' +
          '</div>' +
          '<div style="padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;">' +
            '<div class="card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<div style="font-weight:600;font-size:14px;color:#38bdf8;"><i class="fa fa-windows"></i> Windows 10 / 11 One-Click Setup Pack</div>' +
                '<span style="font-size:11px;color:#94a3b8;">PuTTY, SecureCRT, Wireshark</span>' +
              '</div>' +
              '<div style="font-size:12px;color:#94a3b8;line-height:1.5;margin-bottom:10px;">Associates <code>capture://</code> and <code>telnet://</code> URIs directly with your local Wireshark and PuTTY/SecureCRT executables.</div>' +
              '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                '<a href="/pnet-ops/api/client/toolkit/pnetlab-urischeme-installer.bat" download class="btn btn-primary btn-sm" style="background:#0284c7;border:none;color:#fff;font-size:12px;display:inline-flex;align-items:center;gap:6px;"><i class="fa fa-download"></i> Download URI Scheme Installer (.bat)</a>' +
                '<a href="/pnet-ops/api/client/toolkit/setup-windows-ssl-trust.ps1" download class="btn btn-ghost btn-sm" style="font-size:12px;display:inline-flex;align-items:center;gap:6px;"><i class="fa fa-lock"></i> SSL CA Trust (.ps1)</a>' +
              '</div>' +
            '</div>' +
            '<div class="card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<div style="font-weight:600;font-size:14px;color:#34d399;"><i class="fa fa-apple"></i> macOS & Linux Native Terminal Pack</div>' +
                '<span style="font-size:11px;color:#94a3b8;">iTerm2, GNOME Terminal, Wireshark</span>' +
              '</div>' +
              '<div style="font-size:12px;color:#94a3b8;line-height:1.5;margin-bottom:10px;">Configures default handlers for telnet and Wireshark remote named pipes over SSH.</div>' +
              '<div style="display:flex;gap:8px;">' +
                '<a href="/pnet-ops/api/client/toolkit/pnetlab-client-setup.sh" download class="btn btn-primary btn-sm" style="background:#059669;border:none;color:#fff;font-size:12px;display:inline-flex;align-items:center;gap:6px;"><i class="fa fa-download"></i> Download Setup Script (.sh)</a>' +
              '</div>' +
            '</div>' +
            '<div class="card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
                '<div style="font-weight:600;font-size:14px;color:#a78bfa;"><i class="fa fa-code"></i> Python NetDevOps API Starter Pack</div>' +
                '<span style="font-size:11px;color:#94a3b8;">REST API Automation Client</span>' +
              '</div>' +
              '<div style="font-size:12px;color:#94a3b8;line-height:1.5;margin-bottom:10px;">Standalone Python 3 script with session auth, lab lifecycle methods, topology export, and telemetry queries.</div>' +
              '<div style="display:flex;gap:8px;">' +
                '<a href="/pnet-ops/api/client/toolkit/pnetlab-api-client.py" download class="btn btn-primary btn-sm" style="background:#7c3aed;border:none;color:#fff;font-size:12px;display:inline-flex;align-items:center;gap:6px;"><i class="fa fa-download"></i> Download pnetlab-api-client.py</a>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);

      modal.querySelector('#az-toolkit-close').onclick = function () { modal.style.display = 'none'; };
      modal.onclick = function (e) { if (e.target === modal) modal.style.display = 'none'; };
    } else {
      modal.style.display = 'flex';
    }
  }

  /* ── Helper: Escape HTML ────────────────────────────────── */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }


  /* ── Issue #34 Hardening: Canvas Viewport & Zoom Retention ── */
  (function initCanvasRetentionHook() {
    function saveCanvasViewport() {
      try {
        var svg = document.querySelector('#topology, #canvas svg, svg.topology-canvas, svg');
        var canvasContainer = document.querySelector('#canvas, .canvas-container, #topology_wrapper');
        var viewport = {};

        if (svg) {
          var g = svg.querySelector('g') || svg;
          viewport.transform = g.getAttribute('transform') || '';
        }
        if (canvasContainer) {
          viewport.scrollLeft = canvasContainer.scrollLeft || 0;
          viewport.scrollTop = canvasContainer.scrollTop || 0;
        }

        if (window.panzoom && typeof window.panzoom.getTransform === 'function') {
          viewport.panzoom = window.panzoom.getTransform();
        }

        if (viewport.transform || viewport.scrollLeft || viewport.scrollTop || viewport.panzoom) {
          sessionStorage.setItem('azam_canvas_viewport_retention', JSON.stringify(viewport));
        }
      } catch (e) {
        // Non-fatal
      }
    }

    function restoreCanvasViewport() {
      try {
        var raw = sessionStorage.getItem('azam_canvas_viewport_retention');
        if (!raw) return;
        var viewport = JSON.parse(raw);

        setTimeout(function () {
          var svg = document.querySelector('#topology, #canvas svg, svg.topology-canvas, svg');
          var canvasContainer = document.querySelector('#canvas, .canvas-container, #topology_wrapper');

          if (svg && viewport.transform) {
            var g = svg.querySelector('g') || svg;
            if (g) g.setAttribute('transform', viewport.transform);
          }
          if (canvasContainer) {
            if (viewport.scrollLeft) canvasContainer.scrollLeft = viewport.scrollLeft;
            if (viewport.scrollTop) canvasContainer.scrollTop = viewport.scrollTop;
          }
          if (window.panzoom && viewport.panzoom && typeof window.panzoom.setTransform === 'function') {
            window.panzoom.setTransform(viewport.panzoom.x, viewport.panzoom.y, viewport.panzoom.scale);
          }
          console.log('[PNetLab] Issue #34: Canvas zoom and viewport preserved post-operation.');
        }, 150);
      } catch (e) {
        // Non-fatal
      }
    }

    // Intercept click on permission fix buttons
    document.addEventListener('click', function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest('button, a, [role="button"], li') : null;
      if (!target) return;
      var txt = (target.textContent || '').toLowerCase();
      var action = (target.getAttribute('data-action') || '').toLowerCase();
      var id = (target.id || '').toLowerCase();
      var title = (target.getAttribute('title') || '').toLowerCase();

      if (txt.includes('permission') || action.includes('permission') || id.includes('permission') || title.includes('permission')) {
        saveCanvasViewport();
        setTimeout(restoreCanvasViewport, 1200);
      }
    }, true);

    // Also wrap XMLHttpRequest for /api/labs/.../permission or /api/system/fix_permissions
    if (window.XMLHttpRequest) {
      var origOpen = XMLHttpRequest.prototype.open;
      var origSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        this._azamUrl = url;
        return origOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function () {
        if (this._azamUrl && /permission/i.test(this._azamUrl)) {
          saveCanvasViewport();
          this.addEventListener('load', function () {
            restoreCanvasViewport();
          });
        }
        return origSend.apply(this, arguments);
      };
    }
  })();

  /* ── Issue #43 Hardening: Synchronized Link & Endpoint Node Glow ── */
  (function initLinkNodeGlowHook() {
    var style = document.createElement('style');
    style.id = 'pnet-node-glow-style';
    style.textContent = '.pnet-node-glow-active { filter: drop-shadow(0 0 12px rgba(56, 189, 248, 0.95)) drop-shadow(0 0 4px #0284c7) !important; transition: filter 0.15s ease-in-out !important; }';
    if (!document.getElementById('pnet-node-glow-style') && document.head) {
      document.head.appendChild(style);
    }

    document.addEventListener('mouseover', function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest('path.link, .link-line, g.link, [data-link-id], line') : null;
      if (!target) return;
      var srcId = target.getAttribute('data-source') || target.getAttribute('data-source-id');
      var dstId = target.getAttribute('data-target') || target.getAttribute('data-target-id');
      if (!srcId && !dstId && target.id) {
        var parts = target.id.split('_');
        if (parts.length >= 3) { srcId = parts[1]; dstId = parts[2]; }
      }
      if (srcId) {
        var srcNode = document.querySelector('#node' + srcId + ', [data-node-id="' + srcId + '"], #node_' + srcId);
        if (srcNode) srcNode.classList.add('pnet-node-glow-active');
      }
      if (dstId) {
        var dstNode = document.querySelector('#node' + dstId + ', [data-node-id="' + dstId + '"], #node_' + dstId);
        if (dstNode) dstNode.classList.add('pnet-node-glow-active');
      }
    }, true);

    document.addEventListener('mouseout', function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest('path.link, .link-line, g.link, [data-link-id], line') : null;
      if (!target) return;
      var glowing = document.querySelectorAll('.pnet-node-glow-active');
      for (var i = 0; i < glowing.length; i++) {
        glowing[i].classList.remove('pnet-node-glow-active');
      }
    }, true);
  })();

  /* ── Issue #42 Hardening: Network Watcher Expanded 20-Filter Capacity & Dash Flow ── */
  (function initWatcherFilterCapacityHook() {
    function expandWatcherLimits() {
      try {
        if (window.networkWatcher && typeof window.networkWatcher.maxFilters === 'number') {
          window.networkWatcher.maxFilters = 20;
        }
        if (window.PNetLabWatcher && typeof window.PNetLabWatcher.maxFilters === 'number') {
          window.PNetLabWatcher.maxFilters = 20;
        }
        var filterInputs = document.querySelectorAll('input[name*="filter"], input.watcher-filter-input, #watcher_filter_input');
        for (var i = 0; i < filterInputs.length; i++) {
          filterInputs[i].removeAttribute('maxlength');
          filterInputs[i].setAttribute('data-max-filters', '20');
        }
      } catch (e) {
        // Non-fatal
      }
    }

    var dashStyle = document.createElement('style');
    dashStyle.id = 'pnet-watcher-dash-flow-style';
    dashStyle.textContent = [
      '.watcher-flow-right { stroke-dashoffset: 0 !important; animation: azamFlowRight 1.2s linear infinite !important; }',
      '@keyframes azamFlowRight { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }',
      '#pnet-watcher-tooltip { position: fixed; z-index: 99999; pointer-events: none; background: rgba(15, 23, 42, 0.95);',
      '  border: 1px solid #38bdf8; border-radius: 8px; padding: 8px 12px; font-family: monospace; font-size: 11px; color: #f8fafc;',
      '  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6), 0 0 10px rgba(56,189,248,0.3); backdrop-filter: blur(8px); display: none; }',
      '#pnet-watcher-tooltip .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; margin-right: 6px; }',
      '#pnet-watcher-tooltip .badge-tcp { background: #0284c7; color: #fff; }',
      '#pnet-watcher-tooltip .badge-udp { background: #7c3aed; color: #fff; }',
      '#pnet-watcher-tooltip .badge-icmp { background: #059669; color: #fff; }',
      '#pnet-watcher-tooltip .badge-bgp { background: #d97706; color: #fff; }'
    ].join('\n');
    if (!document.getElementById('pnet-watcher-dash-flow-style') && document.head) {
      document.head.appendChild(dashStyle);
    }

    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('.watcher-btn, #btn_network_watcher, [data-action="watcher"]')) {
        setTimeout(expandWatcherLimits, 200);
      }
    }, true);
    setInterval(expandWatcherLimits, 3000);
  })();

  /* ── Issue #44 Hardening: Network Watcher Link Hover Tooltip Packet Metadata ── */
  (function initWatcherTooltipHook() {
    var tooltip = document.getElementById('pnet-watcher-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'pnet-watcher-tooltip';
      document.body.appendChild(tooltip);
    }

    function formatTrafficTooltip(target, ev) {
      var proto = target.getAttribute('data-protocol') || target.getAttribute('data-proto') || 'IP';
      var src = target.getAttribute('data-src') || target.getAttribute('data-source') || 'Node-A';
      var dst = target.getAttribute('data-dst') || target.getAttribute('data-target') || 'Node-B';
      var type = target.getAttribute('data-traffic-type') || (proto === 'TCP' || proto === 'UDP' ? 'Data Stream' : 'Control Plane');
      var rate = target.getAttribute('data-rate') || target.getAttribute('data-bps') || 'Active Flow';

      var badgeClass = 'badge-tcp';
      var pUp = proto.toUpperCase();
      if (pUp.indexOf('UDP') !== -1) badgeClass = 'badge-udp';
      else if (pUp.indexOf('ICMP') !== -1) badgeClass = 'badge-icmp';
      else if (pUp.indexOf('BGP') !== -1 || pUp.indexOf('OSPF') !== -1) badgeClass = 'badge-bgp';

      tooltip.innerHTML = [
        '<div style="margin-bottom: 4px; border-bottom: 1px solid #334155; padding-bottom: 4px;">',
        '  <span class="badge ' + badgeClass + '">' + proto.toUpperCase() + '</span>',
        '  <strong style="color: #38bdf8;">' + type + '</strong>',
        '</div>',
        '<div style="color: #94a3b8; line-height: 1.4;">',
        '  <div><span style="color: #64748b;">Endpoints:</span> ' + src + ' &harr; ' + dst + '</div>',
        '  <div><span style="color: #64748b;">Throughput:</span> <span style="color: #34d399;">' + rate + '</span></div>',
        '</div>'
      ].join('');

      tooltip.style.left = (ev.clientX + 14) + 'px';
      tooltip.style.top = (ev.clientY + 14) + 'px';
      tooltip.style.display = 'block';
    }

    document.addEventListener('mousemove', function (ev) {
      var target = ev.target && ev.target.closest ? ev.target.closest('path.link, .link-line, g.link, [data-link-id], line') : null;
      var isWatcherActive = document.querySelector('.network-watcher-active, #topology.watcher-on, [data-watcher="active"]') || window.azamWatcherActive;
      if (target && (isWatcherActive || target.classList.contains('watcher-link') || target.hasAttribute('data-traffic'))) {
        formatTrafficTooltip(target, ev);
      } else if (tooltip.style.display !== 'none') {
        tooltip.style.display = 'none';
      }
    }, true);
  })();

  /* ── Issue #41 Hardening: Canvas Drag Anti-Runaway Precision Lock ── */
  (function initCanvasDragPrecisionLockHook() {
    var isDraggingNode = false;
    var EDGE_THRESHOLD = 45;

    document.addEventListener('mousedown', function (ev) {
      var node = ev.target && ev.target.closest ? ev.target.closest('.node, [data-node-id], .topology-node, g.node') : null;
      if (node && ev.button === 0) {
        isDraggingNode = true;
      }
    }, true);

    document.addEventListener('mouseup', function () {
      isDraggingNode = false;
    }, true);

    document.addEventListener('mousemove', function (ev) {
      if (!isDraggingNode) return;
      if (ev.ctrlKey || ev.altKey || ev.shiftKey) return;

      var canvasContainer = document.querySelector('#canvas, .canvas-container, #topology_wrapper');
      if (!canvasContainer) return;

      var rect = canvasContainer.getBoundingClientRect();
      var nearLeft = ev.clientX - rect.left < EDGE_THRESHOLD;
      var nearRight = rect.right - ev.clientX < EDGE_THRESHOLD;
      var nearTop = ev.clientY - rect.top < EDGE_THRESHOLD;
      var nearBottom = rect.bottom - ev.clientY < EDGE_THRESHOLD;

      if (nearLeft || nearRight || nearTop || nearBottom) {
        if (window.panzoom && typeof window.panzoom.pause === 'function') {
          window.panzoom.pause();
          setTimeout(function () {
            if (window.panzoom && typeof window.panzoom.resume === 'function') {
              window.panzoom.resume();
            }
          }, 80);
        }
      }
    }, true);
  })();

  /* ── Issue #39 Hardening: Clean SVG Filter & Overlay Teardown ── */
  (function initOverlayTeardownHook() {
    function cleanupOrphanGlowFilters() {
      try {
        var overlays = document.querySelectorAll('.topology-overlay-disabled, .watcher-off');
        if (overlays.length > 0) {
          var glowNodes = document.querySelectorAll('.pnet-node-glow-active, [filter*="glow"]');
          for (var i = 0; i < glowNodes.length; i++) {
            glowNodes[i].classList.remove('pnet-node-glow-active');
            if (glowNodes[i].hasAttribute('filter')) glowNodes[i].removeAttribute('filter');
          }
        }
      } catch (e) {
        // Non-fatal
      }
    }
    document.addEventListener('click', function (ev) {
      var btn = ev.target && ev.target.closest ? ev.target.closest('.toggle-traffic-glow, .toggle-link-utilization, [data-toggle="overlay"]') : null;
      if (btn) {
        setTimeout(cleanupOrphanGlowFilters, 100);
      }
    }, true);
  })();

  /* ── Issue #45 & Issue #65 Hardening: User Online/Idle/Offline Status & Log Filters ── */
  (function initUserStatusBadgeHook() {
    var style = document.createElement('style');
    style.id = 'pnet-user-status-style';
    style.textContent = [
      '.pnet-status-indicator { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; letter-spacing: 0.3px; }',
      '.pnet-status-online { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }',
      '.pnet-status-idle { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }',
      '.pnet-status-offline { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }',
      '.pnet-status-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }',
      '.pnet-status-online .pnet-status-dot { background: #22c55e; box-shadow: 0 0 8px #22c55e; animation: azamPulseGreen 2s infinite; }',
      '.pnet-status-idle .pnet-status-dot { background: #f59e0b; box-shadow: 0 0 7px #f59e0b; animation: azamPulseAmber 2.5s infinite; }',
      '.pnet-status-offline .pnet-status-dot { background: #ef4444; }',
      '@keyframes azamPulseGreen { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } }',
      '@keyframes azamPulseAmber { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.55; transform: scale(1.12); } }'
    ].join('\n');
    if (!document.getElementById('pnet-user-status-style') && document.head) {
      document.head.appendChild(style);
    }

    // Issue #65: Real-time Inactivity Idle Tracking (5 minutes = 300,000 ms)
    var IDLE_TIMEOUT_MS = 300000;
    var idleTimer = null;
    var isCurrentUserIdle = false;

    function resetUserIdleTimer() {
      if (isCurrentUserIdle) {
        isCurrentUserIdle = false;
        broadcastCurrentUserActivity('online');
      }
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        isCurrentUserIdle = true;
        broadcastCurrentUserActivity('idle');
      }, IDLE_TIMEOUT_MS);
    }

    function broadcastCurrentUserActivity(state) {
      var selfBadges = document.querySelectorAll('.current-user-status, #user_profile_status, .header-user-status, .user-badge-self');
      selfBadges.forEach(function (badge) {
        badge.innerHTML = state === 'idle'
          ? '<span class="pnet-status-indicator pnet-status-idle" title="User is currently Idle / Inactive (5m+)"><span class="pnet-status-dot"></span> Idle 🟡</span>'
          : '<span class="pnet-status-indicator pnet-status-online" title="User is currently Online and Active"><span class="pnet-status-dot"></span> Online</span>';
      });
    }

    ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'].forEach(function (evt) {
      window.addEventListener(evt, resetUserIdleTimer, { passive: true });
    });
    resetUserIdleTimer();

    function decorateUserStatuses() {
      try {
        var userCells = document.querySelectorAll('td.user_status, td[data-col="status"], tr.user-row td:nth-child(4), #table_users td.status, .user-list-item');
        userCells.forEach(function (cell) {
          if (cell.getAttribute('data-pnet-status-decorated')) return;
          var text = (cell.textContent || '').trim().toLowerCase();
          var badgeHtml = '';
          if (text === 'active' || text === 'online' || text === '1' || cell.classList.contains('status-online')) {
            badgeHtml = '<span class="pnet-status-indicator pnet-status-online" title="User is currently Online and Active"><span class="pnet-status-dot"></span> Online</span>';
          } else if (text === 'idle' || text === 'away' || cell.classList.contains('status-idle')) {
            badgeHtml = '<span class="pnet-status-indicator pnet-status-idle" title="User is Idle / Inactive (5m+)"><span class="pnet-status-dot"></span> Idle 🟡</span>';
          } else if (text === 'offline' || text === 'disabled' || text === '0' || cell.classList.contains('status-offline')) {
            badgeHtml = '<span class="pnet-status-indicator pnet-status-offline" title="User is Offline"><span class="pnet-status-dot"></span> Offline</span>';
          }
          if (badgeHtml) {
            cell.innerHTML = badgeHtml;
            cell.setAttribute('data-pnet-status-decorated', 'true');
          }
        });
      } catch (e) {
        // Non-fatal
      }
    }

    // Issue #65: Live Session Log Search Filter
    function setupLogSearchFilter() {
      try {
        var logTable = document.querySelector('#table_logs, .table-logs, [data-table="logs"]');
        if (!logTable || document.getElementById('pnet-log-search-input')) return;
        var wrapper = logTable.closest('.panel, .card, .view-content, .table-responsive') || logTable.parentNode;
        var searchDiv = document.createElement('div');
        searchDiv.id = 'pnet-log-search-wrapper';
        searchDiv.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:12px;';
        searchDiv.innerHTML = '<i class="fa fa-search" style="color:#94a3b8;"></i><input id="pnet-log-search-input" type="text" placeholder="Filter session logs by user, action, IP, or timestamp..." style="background:rgba(15,23,42,0.6);border:1px solid #334155;border-radius:6px;padding:6px 12px;color:#f1f5f9;font-size:12px;width:100%;max-width:400px;outline:none;">';
        wrapper.insertBefore(searchDiv, logTable);

        var input = document.getElementById('pnet-log-search-input');
        input.addEventListener('input', function () {
          var query = (input.value || '').toLowerCase().trim();
          var rows = logTable.querySelectorAll('tbody tr');
          rows.forEach(function (row) {
            var rowText = (row.textContent || '').toLowerCase();
            row.style.display = (!query || rowText.indexOf(query) !== -1) ? '' : 'none';
          });
        });
      } catch (e) {
        // Non-fatal
      }
    }

    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('a[href*="users"], .nav-users, #menu_users')) {
        setTimeout(decorateUserStatuses, 250);
        setTimeout(decorateUserStatuses, 800);
      }
      if (ev.target && ev.target.closest && ev.target.closest('a[href*="log"], .nav-logs, #menu_logs')) {
        setTimeout(setupLogSearchFilter, 300);
      }
    }, true);
    setInterval(decorateUserStatuses, 2500);
    setInterval(setupLogSearchFilter, 4000);
  })();

  /* ── Issue #53 Hardening: Node Quick Buttons Hit-Box Precision & Anti-Obstruction ── */
  (function initNodeQuickButtonPrecisionHook() {
    var quickStyle = document.createElement('style');
    quickStyle.id = 'pnet-quick-btn-precision-style';
    quickStyle.textContent = [
      '.node-quick-btn, .node-action-buttons, .quick-actions-toolbar { pointer-events: auto; }',
      '.editing-label .node-quick-btn, .editing-text .node-quick-btn { pointer-events: none !important; opacity: 0.2 !important; }',
      'text.link-label, .link-label, [data-link-label], .port-name, .interface-label { pointer-events: all !important; cursor: pointer !important; z-index: 50 !important; }'
    ].join('\n');
    if (!document.getElementById('pnet-quick-btn-precision-style') && document.head) {
      document.head.appendChild(quickStyle);
    }

    document.addEventListener('mouseover', function (ev) {
      var isOverLabel = ev.target && ev.target.closest && ev.target.closest('text.link-label, .link-label, [data-link-label], .port-name, .interface-label, [contenteditable="true"]');
      if (isOverLabel) {
        var quickToolbars = document.querySelectorAll('.node-quick-btn, .node-action-buttons, #node_action_menu, .quick-actions-toolbar');
        for (var i = 0; i < quickToolbars.length; i++) {
          quickToolbars[i].style.pointerEvents = 'none';
        }
      }
    }, true);

    document.addEventListener('mouseout', function (ev) {
      var isOverLabel = ev.target && ev.target.closest && ev.target.closest('text.link-label, .link-label, [data-link-label], .port-name, .interface-label, [contenteditable="true"]');
      if (isOverLabel) {
        var quickToolbars = document.querySelectorAll('.node-quick-btn, .node-action-buttons, #node_action_menu, .quick-actions-toolbar');
        for (var i = 0; i < quickToolbars.length; i++) {
          quickToolbars[i].style.pointerEvents = '';
        }
      }
    }, true);
  })();

  /* ── Issue #60 Hardening: Parallel Link Fanning & Interface Chip Hover Glow ── */
  (function initParallelLinkAndChipHoverGlowHook() {
    var chipGlowStyle = document.createElement('style');
    chipGlowStyle.id = 'pnet-chip-hover-glow-style';
    chipGlowStyle.textContent = [
      '.interface-chip, .port-chip, [data-interface-chip] { transition: transform 0.15s ease, filter 0.15s ease; cursor: pointer; }',
      '.interface-chip:hover, .port-chip:hover, [data-interface-chip]:hover { transform: scale(1.18); z-index: 9999 !important; filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.8)); }',
      '.pnet-chip-hover-ring { stroke: #38bdf8; stroke-width: 2.5px; fill: none; filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.9)); pointer-events: none; }',
      'path.link-line.pnet-link-raised, svg line.pnet-link-raised { stroke-width: 3.5px !important; filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.7)) !important; z-index: 9000 !important; }'
    ].join('\n');
    if (!document.getElementById('pnet-chip-hover-glow-style') && document.head) {
      document.head.appendChild(chipGlowStyle);
    }

    document.addEventListener('mouseover', function (ev) {
      var chip = ev.target && ev.target.closest ? ev.target.closest('.interface-chip, .port-chip, [data-interface-chip], text.port-name, g.interface-label') : null;
      if (!chip) return;

      var linkElem = chip.closest ? chip.closest('g.link, .link-group, g[data-link-id]') : null;
      if (!linkElem) {
        var linkId = chip.getAttribute('data-link-id') || chip.getAttribute('data-link');
        if (linkId) linkElem = document.querySelector('g[data-link-id="' + linkId + '"], #link_' + linkId);
      }

      if (linkElem) {
        linkElem.classList.add('pnet-link-raised');
        var path = linkElem.querySelector('path, line');
        if (path) path.classList.add('pnet-link-raised');
        if (linkElem.parentNode) {
          linkElem.parentNode.appendChild(linkElem);
        }

        // Highlight connected source and destination nodes
        var srcId = linkElem.getAttribute('data-source-node') || linkElem.getAttribute('data-src');
        var dstId = linkElem.getAttribute('data-target-node') || linkElem.getAttribute('data-dst');
        [srcId, dstId].forEach(function (nid) {
          if (!nid) return;
          var nodeEl = document.querySelector('#node_' + nid + ', [data-node-id="' + nid + '"]');
          if (nodeEl) nodeEl.classList.add('pnet-node-glow-active');
        });
      }
    }, true);

    document.addEventListener('mouseout', function (ev) {
      var chip = ev.target && ev.target.closest ? ev.target.closest('.interface-chip, .port-chip, [data-interface-chip], text.port-name, g.interface-label') : null;
      if (!chip) return;

      var raisedLinks = document.querySelectorAll('.pnet-link-raised');
      for (var i = 0; i < raisedLinks.length; i++) {
        raisedLinks[i].classList.remove('pnet-link-raised');
      }
      var glowNodes = document.querySelectorAll('.pnet-node-glow-active');
      for (var j = 0; j < glowNodes.length; j++) {
        glowNodes[j].classList.remove('pnet-node-glow-active');
      }
    }, true);
  })();

  /* ── Issue #63 Hardening: Workspace Index & Canvas Context Menu Role Immunization ── */
  (function initRoleWorkspaceAndContextMenuImmunizationHook() {
    function restoreRoleContextMenuOptions() {
      try {
        var menu = document.querySelector('#context-menu, .canvas-context-menu, .context-menu-list, #menu_canvas');
        if (!menu) return;

        var items = menu.querySelectorAll('li, a, .context-menu-item');
        var hasAutoAlign = false;

        items.forEach(function (item) {
          var t = (item.textContent || '').trim().toLowerCase();
          if (t.includes('auto align') || t.includes('align')) hasAutoAlign = true;
          if (item.style.display === 'none' && (t.includes('undo') || t.includes('redo') || t.includes('align') || t.includes('workspace'))) {
            item.style.display = '';
          }
        });

        if (!hasAutoAlign && menu.querySelector('ul, .menu-inner')) {
          var list = menu.querySelector('ul, .menu-inner') || menu;
          var alignLi = document.createElement('li');
          alignLi.className = 'context-menu-item pnet-role-injected';
          alignLi.innerHTML = '<a href="javascript:void(0);" style="display:flex;align-items:center;gap:8px;padding:6px 12px;color:#f1f5f9;"><i class="fa fa-th-large" style="color:#38bdf8;"></i> Auto Align Topology</a>';
          alignLi.onclick = function () {
            if (window.autoAlignTopology && typeof window.autoAlignTopology === 'function') {
              window.autoAlignTopology();
            } else if (window.App && typeof window.App.autoAlign === 'function') {
              window.App.autoAlign();
            }
          };
          list.appendChild(alignLi);
        }
      } catch (e) {
        // Non-fatal
      }
    }

    function ensureWorkspaceIndexVisibility() {
      try {
        var wsNavs = document.querySelectorAll('.nav-workspaces, [data-path*="workspace"], a[href*="workspace"], #menu_workspaces');
        wsNavs.forEach(function (el) {
          if (el.style.display === 'none') {
            el.style.display = '';
          }
          el.classList.remove('disabled', 'hidden');
        });
      } catch (e) {
        // Non-fatal
      }
    }

    document.addEventListener('contextmenu', function () {
      setTimeout(restoreRoleContextMenuOptions, 50);
      setTimeout(restoreRoleContextMenuOptions, 150);
    }, true);

    document.addEventListener('DOMContentLoaded', ensureWorkspaceIndexVisibility);
    setTimeout(ensureWorkspaceIndexVisibility, 500);
  })();

  /* ── Issue #67 Hardening: Network Cloud Connection Resume & Full Link State ── */
  (function initCloudLinkContextMenuHook() {
    function restoreCloudLinkMenuOptions() {
      try {
        var menu = document.querySelector('#context-menu, .canvas-context-menu, .context-menu-list');
        if (!menu) return;
        var activeTarget = window.activeContextTarget || document.querySelector('.context-menu-active-target, g.link.selected, path.link.selected');
        if (!activeTarget) return;

        // Check if link is connected to a network cloud (pnet / cloud bridge)
        var isCloud = false;
        var src = (activeTarget.getAttribute('data-source') || '').toLowerCase();
        var dst = (activeTarget.getAttribute('data-target') || '').toLowerCase();
        var classes = (activeTarget.getAttribute('class') || '').toLowerCase();
        if (src.indexOf('pnet') !== -1 || dst.indexOf('pnet') !== -1 || src.indexOf('cloud') !== -1 || dst.indexOf('cloud') !== -1 || classes.indexOf('cloud') !== -1) {
          isCloud = true;
        }

        if (isCloud) {
          var items = menu.querySelectorAll('li, a, .context-menu-item');
          items.forEach(function (it) {
            var text = (it.textContent || '').toLowerCase();
            if (it.style.display === 'none' && (text.indexOf('resume') !== -1 || text.indexOf('suspend') !== -1 || text.indexOf('full link') !== -1)) {
              it.style.display = '';
            }
          });
        }
      } catch (e) {
        // Non-fatal
      }
    }

    document.addEventListener('contextmenu', function () {
      setTimeout(restoreCloudLinkMenuOptions, 60);
      setTimeout(restoreCloudLinkMenuOptions, 180);
    }, true);
  })();

  /* ── Issue #68 Hardening: Unhide Links Action & Unlocked Icon Scaling ── */
  (function initLinkVisibilityAndIconScalingHook() {
    // 1. Remove minimum icon size barrier so icons scale down freely
    var scaleStyle = document.createElement('style');
    scaleStyle.id = 'pnet-icon-scale-unbound-style';
    scaleStyle.textContent = [
      '.node-icon, .topology-node img, .topology-node svg, [data-node-icon] { min-width: 0 !important; min-height: 0 !important; }',
      '#pnet-toggle-links-btn { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(56, 189, 248, 0.3); color: #38bdf8; font-size: 11px; cursor: pointer; transition: all 0.15s ease; }',
      '#pnet-toggle-links-btn:hover { background: rgba(56, 189, 248, 0.15); border-color: #38bdf8; }'
    ].join('\n');
    if (!document.getElementById('pnet-icon-scale-unbound-style') && document.head) {
      document.head.appendChild(scaleStyle);
    }

    // 2. Inject Unhide Links button on canvas toolbar
    function injectUnhideLinksButton() {
      var toolbar = document.querySelector('#topology_toolbar, .canvas-toolbar, .topology-menu, #lab-actions');
      if (!toolbar || document.getElementById('pnet-toggle-links-btn')) return;

      var btn = document.createElement('button');
      btn.id = 'pnet-toggle-links-btn';
      btn.type = 'button';
      btn.title = 'Unhide all canvas links or toggle link visibility';
      btn.innerHTML = '<i class="fa fa-eye"></i> Unhide Links';
      btn.onclick = function () {
        var links = document.querySelectorAll('path.link, .link-line, g.link, [data-link-id], line');
        var count = 0;
        links.forEach(function (l) {
          if (l.style.display === 'none' || l.style.visibility === 'hidden' || l.getAttribute('visibility') === 'hidden') {
            l.style.display = '';
            l.style.visibility = 'visible';
            l.removeAttribute('visibility');
            count++;
          }
        });
        if (window.App && typeof window.App.toast === 'function') {
          window.App.toast(count > 0 ? ('Restored visibility for ' + count + ' link(s)') : 'All links are visible', 'ok');
        }
      };
      toolbar.appendChild(btn);
    }

    document.addEventListener('DOMContentLoaded', injectUnhideLinksButton);
    setInterval(injectUnhideLinksButton, 3000);
  })();

  /* ── 6.8.93 Capability: Bulk Export Icon Points UP to Match Toolbar Export ── */
  (function initBulkExportIconHook() {
    function fixBulkExportIcons() {
      document.querySelectorAll('#fm-bulk button, .bulkbar button, [data-action="export"]').forEach(function (btn) {
        if (btn.textContent && btn.textContent.indexOf('Export') !== -1) {
          var ic = btn.querySelector('i');
          if (ic && (ic.classList.contains('fa-download') || ic.classList.contains('fa-arrow-down'))) {
            ic.className = 'fa fa-upload';
          }
        }
      });
    }
    document.addEventListener('DOMContentLoaded', fixBulkExportIcons);
    setInterval(fixBulkExportIcons, 1000);
  })();

  /* ── Issue #90 Hardening: Dashboard Workspace Master "Select All" Checkbox Hook ── */
  (function initWorkspaceSelectAllHook() {
    function injectSelectAll() {
      // 1. List View table header
      var table = document.querySelector('.fm-table, .table-files, #table_files');
      if (table) {
        var thCheck = table.querySelector('thead tr th.fm-check, thead tr th.select-all-cell, thead tr th:first-child');
        if (thCheck && !thCheck.querySelector('#pnet-workspace-select-all')) {
          var chk = document.createElement('input');
          chk.type = 'checkbox';
          chk.id = 'pnet-workspace-select-all';
          chk.title = 'Select / Deselect All Labs & Folders';
          chk.style.cssText = 'cursor:pointer;margin:0 auto;display:block;transform:scale(1.15);';
          chk.onchange = function () {
            var isChecked = this.checked;
            var rows = table.querySelectorAll('tbody tr');
            var toggled = 0;
            rows.forEach(function (tr) {
              if (tr.style.display === 'none') return; // Respect active search/filter
              var cb = tr.querySelector('td.fm-check input[type="checkbox"], td:first-child input[type="checkbox"]');
              if (cb && cb !== chk) {
                cb.checked = isChecked;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
                toggled++;
              }
            });
            if (window.PnqApp && typeof window.PnqApp.toast === 'function') {
              window.PnqApp.toast((isChecked ? 'Selected ' : 'Deselected ') + toggled + ' item(s)', 'info');
            }
          };
          thCheck.innerHTML = '';
          thCheck.appendChild(chk);
        }
      }

      // 2. Grid View card container
      var cardsContainer = document.querySelector('.cards');
      if (cardsContainer && !document.getElementById('pnet-grid-select-all-bar')) {
        var parent = cardsContainer.parentElement;
        if (parent) {
          var bar = document.createElement('div');
          bar.id = 'pnet-grid-select-all-bar';
          bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 12px;margin-bottom:12px;background:var(--pnq-surface-2, rgba(255,255,255,0.05));border:1px solid var(--pnq-border, rgba(255,255,255,0.1));border-radius:6px;';
          var gChk = document.createElement('input');
          gChk.type = 'checkbox';
          gChk.id = 'pnet-grid-select-all-chk';
          gChk.style.cssText = 'cursor:pointer;transform:scale(1.1);';
          var gLbl = document.createElement('label');
          gLbl.htmlFor = 'pnet-grid-select-all-chk';
          gLbl.style.cssText = 'cursor:pointer;font-size:12px;font-weight:600;margin:0;user-select:none;color:var(--pnq-text, #f8fafc);';
          gLbl.textContent = 'Select All';
          gChk.onchange = function () {
            var isChecked = this.checked;
            var cbs = cardsContainer.querySelectorAll('.folder-card input[type="checkbox"], .lab-card input[type="checkbox"]');
            var toggled = 0;
            cbs.forEach(function (cb) {
              var card = cb.closest('.folder-card, .lab-card');
              if (card && card.style.display === 'none') return;
              cb.checked = isChecked;
              cb.dispatchEvent(new Event('change', { bubbles: true }));
              toggled++;
            });
            if (window.PnqApp && typeof window.PnqApp.toast === 'function') {
              window.PnqApp.toast((isChecked ? 'Selected ' : 'Deselected ') + toggled + ' item(s)', 'info');
            }
          };
          bar.appendChild(gChk);
          bar.appendChild(gLbl);
          parent.insertBefore(bar, cardsContainer);
        }
      }
    }
    document.addEventListener('DOMContentLoaded', injectSelectAll);
    window.addEventListener('hashchange', function() { setTimeout(injectSelectAll, 50); setTimeout(injectSelectAll, 200); });
    setInterval(injectSelectAll, 1000);

    function observeWorkspace() {
      var view = document.getElementById('view');
      if (view) {
        var obs = new MutationObserver(function() {
          injectSelectAll();
        });
        obs.observe(view, { childList: true, subtree: true });
      } else {
        setTimeout(observeWorkspace, 200);
      }
    }
    observeWorkspace();
  })();

  /* ── 6.8.93 Capability: Real-Time Logs Page Search Box ── */
  (function initLogsSearchFilterHook() {
    function injectLogsSearch() {
      if (location.hash !== '#/logs') return;
      var head = document.querySelector('.view-head');
      if (!head || document.getElementById('pnet-logs-search-wrapper')) return;

      var searchDiv = document.createElement('div');
      searchDiv.id = 'pnet-logs-search-wrapper';
      searchDiv.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin:0 16px;flex:1;max-width:420px;';
      searchDiv.innerHTML = '<i class="fa fa-search" style="color:var(--pnq-text-muted, #94a3b8);font-size:12px;"></i>' +
        '<input id="pnet-logs-search-input" type="text" placeholder="Filter logs by user, IP, event, lab, or node…" style="width:100%;padding:6px 12px;font-size:12px;border-radius:6px;border:1px solid var(--pnq-border, rgba(255,255,255,0.15));background:var(--pnq-surface-2, rgba(255,255,255,0.06));color:var(--pnq-text, #f8fafc);outline:none;">';

      var refreshBtn = head.querySelector('button');
      if (refreshBtn) {
        head.insertBefore(searchDiv, refreshBtn);
      } else {
        head.appendChild(searchDiv);
      }

      var input = document.getElementById('pnet-logs-search-input');
      if (input) {
        input.addEventListener('input', function () {
          var query = (input.value || '').toLowerCase().trim();
          document.querySelectorAll('#logs-activity-card tbody tr, #logs-session-card tbody tr, #table_logs tbody tr, .table-logs tbody tr').forEach(function (tr) {
            var rowText = tr.textContent.toLowerCase();
            tr.style.display = (!query || rowText.indexOf(query) !== -1) ? '' : 'none';
          });
        });
      }
    }
    window.addEventListener('hashchange', function () {
      if (location.hash === '#/logs') setTimeout(injectLogsSearch, 200);
    });
    setInterval(injectLogsSearch, 2000);
  })();

  /* ── 6.8.93 Capability: Admin Icons Resource Manager Page ── */
  (function initIconsPageModule() {
    function renderIconsView(view) {
      view.innerHTML = '';

      var head = document.createElement('div');
      head.className = 'view-head vh-ruled';
      head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--pnq-border, rgba(255,255,255,0.1));';
      head.innerHTML = '<div class="view-title" style="font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px;">' +
        '<i class="fa fa-picture-o" style="color:var(--pnq-accent, #38bdf8);"></i> Node Icons Resource Library</div>' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
        '<div style="display:inline-flex;align-items:center;gap:6px;background:var(--pnq-surface-2, rgba(255,255,255,0.05));border:1px solid var(--pnq-border, rgba(255,255,255,0.1));border-radius:6px;padding:4px 10px;">' +
        '<i class="fa fa-search" style="color:var(--pnq-text-muted, #94a3b8);font-size:12px;"></i>' +
        '<input id="pnet-icons-search" type="text" placeholder="Search 800+ icons by name…" style="background:transparent;border:none;outline:none;color:var(--pnq-text,#f8fafc);font-size:12px;width:240px;">' +
        '</div>' +
        '<button id="pnet-icons-refresh" class="btn btn-ghost btn-sm" type="button"><i class="fa fa-refresh"></i> Refresh</button>' +
        '</div>';
      view.appendChild(head);

      // Drag and drop upload card
      var uploadCard = document.createElement('div');
      uploadCard.className = 'card';
      uploadCard.style.cssText = 'margin-bottom:20px;padding:20px;border:2px dashed var(--pnq-border, rgba(255,255,255,0.15));border-radius:8px;background:var(--pnq-surface, rgba(15,23,42,0.4));text-align:center;cursor:pointer;transition:all 0.2s;';
      uploadCard.innerHTML = '<i class="fa fa-cloud-upload" style="font-size:32px;color:var(--pnq-accent, #38bdf8);margin-bottom:8px;display:block;"></i>' +
        '<div style="font-weight:600;font-size:14px;color:var(--pnq-text, #f8fafc);">Drag & Drop PNG, JPG, or SVG Icons Here</div>' +
        '<div style="font-size:12px;color:var(--pnq-text-muted, #94a3b8);margin-top:4px;">or click to browse files from your computer</div>' +
        '<input type="file" id="pnet-icon-file-input" accept=".png,.jpg,.jpeg,.svg" multiple style="display:none;">';
      view.appendChild(uploadCard);

      var gridCard = document.createElement('div');
      gridCard.className = 'card';
      gridCard.style.cssText = 'padding:16px;';
      gridCard.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<div id="pnet-icons-count" style="font-size:12px;color:var(--pnq-text-muted, #94a3b8);">Loading icon catalog…</div>' +
        '</div>' +
        '<div id="pnet-icons-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:12px;max-height:680px;overflow-y:auto;padding-right:4px;"></div>';
      view.appendChild(gridCard);

      var fileInput = uploadCard.querySelector('#pnet-icon-file-input');
      uploadCard.onclick = function () { fileInput.click(); };
      uploadCard.ondragover = function (e) { e.preventDefault(); uploadCard.style.borderColor = 'var(--pnq-accent, #38bdf8)'; };
      uploadCard.ondragleave = function () { uploadCard.style.borderColor = 'var(--pnq-border, rgba(255,255,255,0.15))'; };
      uploadCard.ondrop = function (e) {
        e.preventDefault();
        uploadCard.style.borderColor = 'var(--pnq-border, rgba(255,255,255,0.15))';
        if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
      };
      fileInput.onchange = function () {
        if (fileInput.files) handleFiles(fileInput.files);
      };

      function handleFiles(files) {
        if (!files.length) return;
        var count = 0;
        Array.from(files).forEach(function (f) {
          var fd = new FormData();
          fd.append('file', f);
          fd.append('icon', f);
          fetch('/api/icons/upload', { credentials: 'same-origin', method: 'POST', body: fd })
            .then(function (r) { return r.json(); })
            .then(function (res) {
              count++;
              if (count === files.length) {
                if (window.PnqApp && window.PnqApp.toast) window.PnqApp.toast('Uploaded ' + count + ' icon(s)', 'ok');
                loadIcons();
              }
            }).catch(function () {});
        });
      }

      function loadIcons() {
        fetch('/api/icons', { credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(function (icons) {
            var grid = document.getElementById('pnet-icons-grid');
            var counter = document.getElementById('pnet-icons-count');
            if (!grid) return;
            grid.innerHTML = '';
            var list = Object.keys(icons).sort();
            counter.textContent = 'Showing ' + list.length + ' node icons';

            list.forEach(function (filename) {
              var item = document.createElement('div');
              item.className = 'pnet-icon-card';
              item.dataset.name = filename.toLowerCase();
              item.style.cssText = 'background:var(--pnq-surface-2, rgba(255,255,255,0.04));border:1px solid var(--pnq-border, rgba(255,255,255,0.08));border-radius:6px;padding:10px 6px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;transition:all 0.15s;';
              item.innerHTML = '<div style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.2);border-radius:4px;padding:4px;">' +
                '<img src="/images/icons/' + encodeURIComponent(filename) + '" style="max-width:44px;max-height:44px;object-fit:contain;" alt="' + filename + '">' +
                '</div>' +
                '<div style="font-size:11px;font-weight:500;color:var(--pnq-text, #f8fafc);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:115px;" title="' + filename + '">' + filename + '</div>' +
                '<button type="button" class="btn btn-ghost btn-xs" style="font-size:10px;padding:2px 6px;opacity:0.75;" title="Copy icon filename"><i class="fa fa-clipboard"></i> Copy</button>';
              item.querySelector('button').onclick = function (e) {
                e.stopPropagation();
                navigator.clipboard.writeText(filename);
                if (window.PnqApp && window.PnqApp.toast) window.PnqApp.toast('Copied: ' + filename, 'info');
              };
              grid.appendChild(item);
            });

            var search = document.getElementById('pnet-icons-search');
            search.oninput = function () {
              var q = (search.value || '').toLowerCase().trim();
              var visible = 0;
              grid.querySelectorAll('.pnet-icon-card').forEach(function (card) {
                var match = (!q || card.dataset.name.indexOf(q) !== -1);
                card.style.display = match ? 'flex' : 'none';
                if (match) visible++;
              });
              counter.textContent = 'Showing ' + visible + ' of ' + list.length + ' node icons';
            };
          });
      }

      document.getElementById('pnet-icons-refresh').onclick = loadIcons;
      loadIcons();
    }

    var PnqApp = window.PnqApp || window.App;
    if (PnqApp && typeof PnqApp.register === 'function') {
      PnqApp.register('icons', { title: 'Icons', icon: 'fa-picture-o', admin: true, render: renderIconsView });
      if (window.location.hash === '#/icons') {
        var view = document.getElementById('view');
        if (view) renderIconsView(view);
      }
    }

    // Inject sidebar link under Resources / Images
    function injectSidebarIconsLink() {
      var sidebar = document.querySelector('nav.sidebar');
      if (!sidebar || document.querySelector('a[data-route="icons"]')) return;
      var imagesLink = sidebar.querySelector('a[data-route="images"]');
      var iconsLink = document.createElement('a');
      iconsLink.className = 'nav-item';
      iconsLink.setAttribute('data-route', 'icons');
      iconsLink.setAttribute('data-admin', '1');
      iconsLink.href = '#/icons';
      iconsLink.innerHTML = '<i class="fa fa-picture-o" aria-hidden="true"></i><span>Icons</span>';
      iconsLink.onclick = function (e) {
        if (window.PnqApp && typeof window.PnqApp.go === 'function') {
          e.preventDefault();
          window.PnqApp.go('icons');
        }
      };
      if (imagesLink && imagesLink.nextSibling) {
        sidebar.insertBefore(iconsLink, imagesLink.nextSibling);
      } else {
        sidebar.appendChild(iconsLink);
      }
    }
    document.addEventListener('DOMContentLoaded', injectSidebarIconsLink);
    setInterval(injectSidebarIconsLink, 2500);
  })();

  
  /* ── Sidebar Link Injection for Azam Features (Placed at the LAST position) ── */
  (function initSidebarAzamFeaturesHook() {
    function injectSidebarAzamFeaturesLink() {
      var sidebar = document.querySelector('nav.sidebar');
      if (!sidebar) return;
      var existing = sidebar.querySelector('a[data-route="pnet-features"]');
      var spacer = sidebar.querySelector('.sidebar-spacer');
      if (!existing) {
        existing = document.createElement('a');
        existing.className = 'nav-item';
        existing.setAttribute('data-route', 'pnet-features');
        existing.href = '#/pnet-features';
        existing.innerHTML = '<i class="fa fa-bolt" aria-hidden="true"></i><span>Azam Features</span>';
        existing.onclick = function (e) {
          var app = window.PnqApp || window.App;
          if (app && typeof app.go === 'function') {
            e.preventDefault();
            app.go('pnet-features');
          }
        };
        if (spacer) {
          sidebar.insertBefore(existing, spacer);
        } else {
          sidebar.appendChild(existing);
        }
      }
    }
    document.addEventListener('DOMContentLoaded', injectSidebarAzamFeaturesLink);
    setInterval(injectSidebarAzamFeaturesLink, 2500);
  })();

  /* ── 6.8.93 Capability: Multi-Theme Engine & System Settings Integration ── */
  (function initThemeManagementSuiteHook() {
    var ENTERPRISE_THEMES = [
      { id: 'nord',                name: 'Nord Arctic (Default)', desc: 'Frosted Polar Slate & Cyan', dot: '#88c0d0', bg: '#242933', light: false },
      { id: 'solarized-light',     name: 'Solarized Light',       desc: 'Warm Light Parchment & Cyan', dot: '#268bd2', bg: '#fdf6e3', light: true },
      { id: 'high-contrast',       name: 'High Contrast',         desc: 'OLED Black & Pure White',     dot: '#00ffff', bg: '#000000', light: false },
      { id: 'high-contrast-light', name: 'High Contrast Light',   desc: 'Stark Daylight White & Ink',   dot: '#0000cc', bg: '#ffffff', light: true },
      { id: 'dark',                name: 'Obsidian Slate',        desc: 'Neutral Charcoal Dark',       dot: '#3b82f6', bg: '#0a0c10', light: false },
      { id: 'light',               name: 'Crisp Daylight',        desc: 'Clean High-Contrast Daylight',dot: '#2563eb', bg: '#ffffff', light: true },
      { id: 'solarized',           name: 'Solarized NOC',         desc: 'Deep Oceanic Teal',           dot: '#2aa198', bg: '#00212b', light: false },
      { id: 'dracula',             name: 'Dracula Gothic',        desc: 'Dark Plum & Neon Pink',       dot: '#ff79c6', bg: '#1e1f29', light: false },
      { id: 'cyberpunk',           name: 'Cyberpunk Neon',        desc: 'Synthwave Violet & Pink',     dot: '#00f2fe', bg: '#120726', light: false },
      { id: 'matrix',              name: 'Retro Terminal',        desc: 'Phosphor Green Matrix',       dot: '#00ff66', bg: '#000000', light: false }
    ];

    function getCurrentTheme() {
      var t = null;
      try { t = localStorage.getItem('pnq.main.theme') || localStorage.getItem('pnq_active_palette'); } catch (e) {}
      if (!t || !ENTERPRISE_THEMES.some(function(th) { return th.id === t; })) {
        t = 'nord';
      }
      return t;
    }

    function applyEnterpriseTheme(themeId) {
      var themeObj = ENTERPRISE_THEMES.find(function(t) { return t.id === themeId; }) || ENTERPRISE_THEMES[0];
      var themeName = themeObj.name;

      try {
        localStorage.setItem('pnq.main.theme', themeId);
        localStorage.setItem('pnq_active_palette', themeId);
        localStorage.setItem('pnq.canvasflow.theme', themeId);
      } catch (e) {}

      document.documentElement.dataset.theme = themeId;
      document.documentElement.setAttribute('data-theme', themeId);
      document.documentElement.style.background = 'var(--pnq-bg, ' + themeObj.bg + ')';
      document.body.style.background = 'var(--pnq-bg, ' + themeObj.bg + ')';
      document.body.className = document.body.className.replace(/\bpnq-[a-z0-9_-]+\b/g, '').trim() + ' pnq-' + themeId;

      if (window.PnqApp && typeof window.PnqApp.toast === 'function') {
        window.PnqApp.toast('Theme applied: ' + themeName, 'ok');
      }

      // Update System settings cards if visible
      document.querySelectorAll('.pnet-theme-card').forEach(function(card) {
        var isThis = card.dataset.themeId === themeId;
        card.style.borderColor = isThis ? 'var(--pnq-accent, #38bdf8)' : 'var(--pnq-border, rgba(255,255,255,0.1))';
        card.style.boxShadow = isThis ? '0 0 12px rgba(56,189,248,0.25)' : 'none';
        var badge = card.querySelector('.pnet-theme-active-badge');
        if (badge) badge.style.display = isThis ? 'inline-flex' : 'none';
      });

      // Update Topbar button label/dot
      var topbarDot = document.getElementById('pnet-topbar-theme-dot');
      if (topbarDot && themeObj) {
        topbarDot.style.background = themeObj.dot;
        topbarDot.style.boxShadow = '0 0 6px ' + themeObj.dot;
      }

      try {
        window.dispatchEvent(new CustomEvent('pnq:theme-change', { detail: { theme: themeId, palette: themeObj } }));
      } catch (e) {}
    }

    window.applyEnterpriseTheme = applyEnterpriseTheme;
    window.ENTERPRISE_THEMES = ENTERPRISE_THEMES;

    // 1. Initial theme load
    var activeTheme = getCurrentTheme();
    document.documentElement.dataset.theme = activeTheme;
    if (!document.body.classList.contains('pnq-' + activeTheme)) {
      document.body.classList.add('pnq-' + activeTheme);
    }

    // 2. Inject Topbar Palette Picker Dropdown
    function injectTopbarThemePicker() {
      var topbarRight = document.querySelector('.topbar-right');
      if (!topbarRight) return;

      var origThemeBtn = topbarRight.querySelector('button[data-action="theme"]');
      if (origThemeBtn) origThemeBtn.style.display = 'none'; // Replace binary toggle with multi-theme picker
      var chromeBtn = topbarRight.querySelector('button[data-action="chrome"]');
      if (chromeBtn) chromeBtn.remove(); // Eliminate decision-aid columns button

      var wrap = document.getElementById('pnet-topbar-theme-wrap');
      var btn = document.getElementById('pnet-topbar-theme-btn');
      var menu = document.getElementById('pnet-topbar-theme-menu');
      var cur = ENTERPRISE_THEMES.find(function(t) { return t.id === getCurrentTheme(); }) || ENTERPRISE_THEMES[0];

      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'pnet-topbar-theme-wrap';
        wrap.style.cssText = 'position:relative;display:inline-block;margin-right:6px;';

        btn = document.createElement('button');
        btn.id = 'pnet-topbar-theme-btn';
        btn.type = 'button';
        btn.className = 'topbar-logout';
        btn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;font-size:12px;cursor:pointer;';
        btn.title = 'Change Theme (10 Enterprise Themes)';
        btn.innerHTML = '<span id="pnet-topbar-theme-dot" style="width:9px;height:9px;border-radius:50%;background:' + cur.dot + ';box-shadow:0 0 6px ' + cur.dot + ';display:inline-block;"></span> <i class="fa fa-paint-brush"></i> <i class="fa fa-caret-down" style="font-size:10px;opacity:0.7;"></i>';

        menu = document.createElement('div');
        menu.id = 'pnet-topbar-theme-menu';
        menu.style.cssText = 'display:none;position:absolute;top:calc(100% + 6px);right:0;width:230px;background:var(--pnq-surface, #1e293b);border:1px solid var(--pnq-border-strong, rgba(255,255,255,0.2));border-radius:8px;box-shadow:0 12px 28px rgba(0,0,0,0.6);z-index:999999;padding:6px;backdrop-filter:blur(12px);';

        wrap.appendChild(btn);
        wrap.appendChild(menu);

        if (origThemeBtn) {
          topbarRight.insertBefore(wrap, origThemeBtn);
        } else {
          topbarRight.appendChild(wrap);
        }
      }

      var topbarDot = document.getElementById('pnet-topbar-theme-dot');
      if (topbarDot) {
        topbarDot.style.background = cur.dot;
        topbarDot.style.boxShadow = '0 0 6px ' + cur.dot;
      }

      if (menu && menu.children.length === 0) {
        ENTERPRISE_THEMES.forEach(function(th) {
          var opt = document.createElement('div');
          opt.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--pnq-text, #f8fafc);transition:background 0.15s;';
          opt.innerHTML = '<span style="width:10px;height:10px;border-radius:50%;background:' + th.dot + ';box-shadow:0 0 4px ' + th.dot + ';display:inline-block;flex-shrink:0;"></span>' +
            '<div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;">' + th.name + '</div>';
          opt.onmouseenter = function() { opt.style.background = 'var(--pnq-surface-2, rgba(255,255,255,0.08))'; };
          opt.onmouseleave = function() { opt.style.background = 'transparent'; };
          opt.onclick = function(e) {
            e.stopPropagation();
            applyEnterpriseTheme(th.id);
            menu.style.display = 'none';
          };
          menu.appendChild(opt);
        });
      }

      if (btn && !btn.dataset.wired) {
        btn.dataset.wired = '1';
        btn.onclick = function(e) {
          e.stopPropagation();
          menu.style.display = (menu.style.display === 'none' ? 'block' : 'none');
        };

        document.addEventListener('click', function(e) {
          if (wrap && !wrap.contains(e.target)) menu.style.display = 'none';
        });
      }
    }

    // 3. Inject "Appearance & Themes" into System Settings (#/system)
    function injectSystemSettingsThemeCard() {
      if (location.hash !== '#/system' && location.hash !== '#system') return;
      var view = document.getElementById('view');
      if (!view || document.getElementById('pnet-system-themes-card')) return;

      var card = document.createElement('div');
      card.id = 'pnet-system-themes-card';
      card.className = 'card';
      card.style.cssText = 'margin-top:20px;padding:20px;';

      card.innerHTML = '<div class="card-title" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:15px;font-weight:700;">' +
        '<i class="fa fa-paint-brush" style="color:var(--pnq-accent, #38bdf8);"></i> Appearance & Visual Themes (10 Enterprise Themes)' +
        '</div>' +
        '<p class="muted" style="font-size:12.5px;margin-bottom:16px;">Select your preferred system palette. Themes apply universally across the dashboard, labs, annotations, and web consoles.</p>' +
        '<div id="pnet-theme-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:12px;"></div>';

      var grid = card.querySelector('#pnet-theme-grid');
      var curTheme = getCurrentTheme();

      ENTERPRISE_THEMES.forEach(function(th) {
        var isThis = (th.id === curTheme);
        var tCard = document.createElement('div');
        tCard.className = 'pnet-theme-card';
        tCard.dataset.themeId = th.id;
        tCard.style.cssText = 'border:2px solid ' + (isThis ? 'var(--pnq-accent, #38bdf8)' : 'var(--pnq-border, rgba(255,255,255,0.1))') + ';' +
          'border-radius:8px;padding:12px;background:var(--pnq-surface-2, rgba(255,255,255,0.04));cursor:pointer;transition:all 0.2s;' +
          'box-shadow:' + (isThis ? '0 0 12px rgba(56,189,248,0.25)' : 'none') + ';position:relative;';

        tCard.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="width:14px;height:14px;border-radius:50%;background:' + th.dot + ';box-shadow:0 0 6px ' + th.dot + ';display:inline-block;"></span>' +
            '<span style="font-weight:600;font-size:13px;color:var(--pnq-text, #f8fafc);">' + th.name + '</span>' +
          '</div>' +
          '<span class="pnet-theme-active-badge" style="display:' + (isThis ? 'inline-flex' : 'none') + ';align-items:center;gap:4px;font-size:10px;font-weight:700;color:#38bdf8;background:rgba(56,189,248,0.15);padding:2px 6px;border-radius:4px;"><i class="fa fa-check"></i> ACTIVE</span>' +
          '</div>' +
          '<div style="font-size:11.5px;color:var(--pnq-text-muted, #94a3b8);line-height:1.4;">' + th.desc + '</div>' +
          '<div style="margin-top:10px;display:flex;gap:4px;">' +
            '<div style="height:6px;flex:2;background:' + th.bg + ';border-radius:2px;border:1px solid rgba(255,255,255,0.1);"></div>' +
            '<div style="height:6px;flex:1;background:' + th.dot + ';border-radius:2px;"></div>' +
          '</div>';

        tCard.onclick = function() {
          applyEnterpriseTheme(th.id);
        };
        grid.appendChild(tCard);
      });

      view.appendChild(card);
    }

    // Auto-inject on view changes
    setInterval(function() {
      injectTopbarThemePicker();
      injectSystemSettingsThemeCard();
    }, 1000);
  })();

  
  /* ── PNetLab Dashboard Anti-Bootstorm Integration ──────── */
  (function initDashboardBootstormHook() {
    function openBootstormModal(prefillLab) {
      var modal = document.getElementById('pnet-bootstorm-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pnet-bootstorm-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);z-index:9999999;display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML = 
          '<div style="background:var(--pnq-surface, #1e293b);border:1px solid var(--pnq-border-strong, rgba(255,255,255,0.2));border-radius:12px;width:100%;max-width:760px;box-shadow:0 24px 64px rgba(0,0,0,0.8);overflow:hidden;color:var(--pnq-text, #f8fafc);display:flex;flex-direction:column;max-height:90vh;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:var(--pnq-surface-2, rgba(255,255,255,0.04));border-bottom:1px solid var(--pnq-border, rgba(255,255,255,0.1));">' +
              '<div style="display:flex;align-items:center;gap:10px;">' +
                '<span style="width:32px;height:32px;border-radius:8px;background:var(--pnq-accent, #38bdf8);display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:16px;">' +
                  '<i class="fa fa-rocket"></i>' +
                '</span>' +
                '<div>' +
                  '<div style="font-weight:700;font-size:15px;">Anti-Bootstorm Staggered Node Startup Engine</div>' +
                  '<div style="font-size:11px;color:var(--pnq-text-muted, #94a3b8);">3-Tier hypervisor scheduling (Heavy 60s, Medium 25s, Light 5s) prevents vCPU lockups</div>' +
                '</div>' +
              '</div>' +
              '<button id="pnet-bs-close-btn" type="button" style="background:none;border:none;color:var(--pnq-text-muted, #94a3b8);font-size:18px;cursor:pointer;">&times;</button>' +
            '</div>' +
            '<div style="padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;">' +
              '<div>' +
                '<label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--pnq-text-muted, #94a3b8);">Target Lab Path</label>' +
                '<input id="pnet-bs-lab-path" type="text" placeholder="/0 - Interview - Universal/2 - OSPFv2/2 - Adjacencies.unl" style="width:100%;box-sizing:border-box;background:var(--pnq-surface-2, rgba(255,255,255,0.06));border:1px solid var(--pnq-border, rgba(255,255,255,0.15));border-radius:6px;padding:8px 12px;color:var(--pnq-text,#f8fafc);font-size:13px;outline:none;">' +
              '</div>' +
              '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">' +
                '<div>' +
                  '<label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:#f59e0b;">Heavy Delay (s)</label>' +
                  '<input id="pnet-bs-hd" type="number" value="60" min="5" max="300" style="width:100%;box-sizing:border-box;background:var(--pnq-surface-2, rgba(255,255,255,0.06));border:1px solid var(--pnq-border, rgba(255,255,255,0.15));border-radius:6px;padding:6px 10px;color:var(--pnq-text,#f8fafc);font-size:12px;">' +
                '</div>' +
                '<div>' +
                  '<label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:#38bdf8;">Medium Delay (s)</label>' +
                  '<input id="pnet-bs-md" type="number" value="25" min="5" max="180" style="width:100%;box-sizing:border-box;background:var(--pnq-surface-2, rgba(255,255,255,0.06));border:1px solid var(--pnq-border, rgba(255,255,255,0.15));border-radius:6px;padding:6px 10px;color:var(--pnq-text,#f8fafc);font-size:12px;">' +
                '</div>' +
                '<div>' +
                  '<label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:#22c55e;">Light Delay (s)</label>' +
                  '<input id="pnet-bs-ld" type="number" value="5" min="1" max="60" style="width:100%;box-sizing:border-box;background:var(--pnq-surface-2, rgba(255,255,255,0.06));border:1px solid var(--pnq-border, rgba(255,255,255,0.15));border-radius:6px;padding:6px 10px;color:var(--pnq-text,#f8fafc);font-size:12px;">' +
                '</div>' +
              '</div>' +
              '<div style="display:flex;align-items:center;justify-content:space-between;">' +
                '<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">' +
                  '<input id="pnet-bs-dryrun" type="checkbox" style="cursor:pointer;"> Simulate Only (Dry Run)' +
                '</label>' +
                '<button id="pnet-bs-launch-exec" type="button" class="btn btn-primary" style="font-weight:600;font-size:13px;padding:8px 18px;border-radius:6px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' +
                  '<i class="fa fa-rocket"></i> Start Anti-Bootstorm' +
                '</button>' +
              '</div>' +
              '<div id="pnet-bs-modal-term" style="display:none;background:#05070a;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;font-family:monospace;font-size:11.5px;max-height:240px;overflow-y:auto;white-space:pre-wrap;line-height:1.4;"></div>' +
            '</div>' +
          '</div>';
        document.body.appendChild(modal);

        modal.querySelector('#pnet-bs-close-btn').onclick = function() {
          modal.style.display = 'none';
        };
        modal.onclick = function(e) {
          if (e.target === modal) modal.style.display = 'none';
        };

        modal.querySelector('#pnet-bs-launch-exec').onclick = function() {
          var lab = modal.querySelector('#pnet-bs-lab-path').value.trim();
          if (!lab) {
            alert('Please specify a valid lab path.');
            return;
          }
          var hd = parseInt(modal.querySelector('#pnet-bs-hd').value, 10) || 60;
          var md = parseInt(modal.querySelector('#pnet-bs-md').value, 10) || 25;
          var ld = parseInt(modal.querySelector('#pnet-bs-ld').value, 10) || 5;
          var dry = modal.querySelector('#pnet-bs-dryrun').checked;
          var launchBtn = modal.querySelector('#pnet-bs-launch-exec');

          runTool('bootstorm-start', {
            lab: lab,
            heavy_delay: hd,
            medium_delay: md,
            default_delay: ld,
            dry_run: dry
          }, launchBtn, 'pnet-bs-modal-term');
        };
      }

      var pathInput = modal.querySelector('#pnet-bs-lab-path');
      if (prefillLab && pathInput) pathInput.value = prefillLab;
      modal.style.display = 'flex';
    }

        // Hook into workspace toolbar & preview actions
    function injectDashboardBootstormButtons() {
      // 1. Workspace Top Toolbar
      var toolbar = document.querySelector('.fm-toolbar, .view-head .toolbar');
      var bsBtn = document.getElementById('pnet-btn-toolbar-bootstorm');
      if (toolbar && !bsBtn) {
        bsBtn = document.createElement('button');
        bsBtn.id = 'pnet-btn-toolbar-bootstorm';
        bsBtn.type = 'button';
        bsBtn.className = 'btn';
        bsBtn.innerHTML = '<i class="fa fa-rocket"></i> <span>Anti-Bootstorm</span>';
        bsBtn.title = 'Staggered heavy -> medium -> light node startup (Prevents hypervisor CPU lockup)';
        bsBtn.onclick = function(e) {
          e.preventDefault();
          var selRow = document.querySelector('.fm-row.is-selected, tr[aria-selected="true"]');
          var labPath = selRow ? selRow.getAttribute('data-labpath') : '';
          openBootstormModal(labPath);
        };
        toolbar.insertBefore(bsBtn, toolbar.firstChild);
      } else if (bsBtn && bsBtn.getAttribute('style')) {
        bsBtn.removeAttribute('style');
        bsBtn.className = 'btn';
      }

      // 2. Lab Preview Pane Actions (Next to OPEN, EDIT, DELETE)
      var previewActions = document.querySelector('.lab-preview__actions');
      var pBsBtn = document.getElementById('pnet-btn-preview-bootstorm');
      if (previewActions && !pBsBtn) {
        var openBtn = previewActions.querySelector('.lab-preview__btn--open, button:first-child');
        pBsBtn = document.createElement('button');
        pBsBtn.id = 'pnet-btn-preview-bootstorm';
        pBsBtn.type = 'button';
        pBsBtn.className = 'lab-preview__btn';
        pBsBtn.innerHTML = '<i class="fa fa-rocket"></i> <span>BOOTSTORM</span>';
        pBsBtn.title = 'Start this lab with Anti-Bootstorm staggered node queuing';
        pBsBtn.onclick = function(e) {
          e.preventDefault();
          var selRow = document.querySelector('.fm-row.is-selected, tr[aria-selected="true"]');
          var labPath = selRow ? selRow.getAttribute('data-labpath') : '';
          openBootstormModal(labPath);
        };
        if (openBtn && openBtn.nextSibling) {
          previewActions.insertBefore(pBsBtn, openBtn.nextSibling);
        } else {
          previewActions.appendChild(pBsBtn);
        }
      } else if (pBsBtn && pBsBtn.getAttribute('style')) {
        pBsBtn.removeAttribute('style');
        pBsBtn.className = 'lab-preview__btn';
      }
    }

    document.addEventListener('DOMContentLoaded', injectDashboardBootstormButtons);
    setInterval(injectDashboardBootstormButtons, 1000);
    try {
      var obs = new MutationObserver(function() {
        injectDashboardBootstormButtons();
      });
      var view = document.getElementById('view');
      if (view) obs.observe(view, { childList: true, subtree: true });
    } catch(e) {}

    window.azamOpenBootstormModal = openBootstormModal;
    window.applyEnterpriseTheme = applyEnterpriseTheme;
    window.ENTERPRISE_THEMES = ENTERPRISE_THEMES;
  })();

  /* ── Register with App Router ───────────────────────────── */
  App.register('pnet-features', {
    title: 'PNetLab',
    icon: 'fa-bolt',
    admin: false,
    render: render
  });

})();



  /* ═══════════════════════════════════════════════════════════════════════════
     Workstream 3: Real-Time Fleet & Satellite Telemetry Dashboard & HUD
     ═══════════════════════════════════════════════════════════════════════════ */
  var azamFleetTelemetry = {
    timer: null,
    isOpen: false,

    init: function() {
      this.injectStyles();
      this.buildWidget();
    },

    injectStyles: function() {
      if (document.getElementById('az-fleet-telemetry-styles')) return;
      var style = document.createElement('style');
      style.id = 'az-fleet-telemetry-styles';
      style.textContent = [
        '@keyframes azPulseDot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }',
        '.az-pulse-green { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: azPulseDot 2s infinite ease-in-out; }',
        '.az-fleet-node-card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }',
        '.az-fleet-node-card:hover { border-color: rgba(56, 189, 248, 0.4); background: rgba(56, 189, 248, 0.04); }',
        '.az-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; font-size: 11.5px; margin-top: 6px; }',
        '.az-stat-label { color: #94a3b8; }',
        '.az-stat-val { color: #f1f5f9; font-weight: 600; text-align: right; }'
      ].join('\n');
      document.head.appendChild(style);
    },

    buildWidget: function() {
      var self = this;
      if (document.getElementById('az-fleet-telemetry-widget')) return;

      var widget = document.createElement('div');
      widget.id = 'az-fleet-telemetry-widget';
      widget.style.cssText = [
        'position: fixed;',
        'top: 65px;',
        'right: 30px;',
        'width: 440px;',
        'background: rgba(10, 15, 28, 0.96);',
        'border: 1px solid rgba(16, 185, 129, 0.45);',
        'border-radius: 12px;',
        'box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85), 0 0 25px rgba(16, 185, 129, 0.2);',
        'backdrop-filter: blur(16px);',
        'z-index: 280000;',
        'color: #f8fafc;',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;',
        'display: none;',
        'overflow: hidden;'
      ].join('');

      widget.innerHTML = [
        '<div id="az-ft-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(16,185,129,0.12);border-bottom:1px solid rgba(255,255,255,0.08);cursor:move;user-select:none;">',
        '  <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:8px;color:#f8fafc;">',
        '    <span class="az-pulse-green"></span>',
        '    <i class="fa fa-server" style="color:#10b981;"></i> PNetLab Fleet & Cluster Telemetry',
        '  </div>',
        '  <div style="display:flex;align-items:center;gap:10px;">',
        '    <button id="az-ft-btn-refresh" type="button" title="Refresh Telemetry" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:12px;padding:2px 6px;border-radius:4px;"><i class="fa fa-refresh"></i></button>',
        '    <button id="az-ft-btn-close" type="button" title="Close" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:16px;line-height:1;">&times;</button>',
        '  </div>',
        '</div>',
        '<div id="az-ft-body" style="padding:14px;max-height:550px;overflow-y:auto;font-size:12px;">',
        '  <div style="text-align:center;color:#94a3b8;padding:20px 0;"><i class="fa fa-spinner fa-spin" style="margin-right:6px;"></i> Querying cluster telemetry...</div>',
        '</div>',
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 14px;background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.06);font-size:10.5px;color:#64748b;">',
        '  <span id="az-ft-last-updated">Updating...</span>',
        '  <span>MTU 9000 &bull; Soft-RoCE Ready</span>',
        '</div>'
      ].join('');

      document.body.appendChild(widget);

      // Wire close & refresh
      widget.querySelector('#az-ft-btn-close').onclick = function() { self.close(); };
      widget.querySelector('#az-ft-btn-refresh').onclick = function() {
        var icon = this.querySelector('i');
        if (icon) icon.className = 'fa fa-refresh fa-spin';
        self.fetchData(function() {
          if (icon) icon.className = 'fa fa-refresh';
        });
      };

      // Draggable header
      var header = widget.querySelector('#az-ft-header');
      var isDragging = false, startX, startY, origX, origY;
      header.onmousedown = function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        var r = widget.getBoundingClientRect();
        origX = r.left;
        origY = r.top;
        document.onmousemove = function(me) {
          if (!isDragging) return;
          widget.style.left = (origX + (me.clientX - startX)) + 'px';
          widget.style.top = (origY + (me.clientY - startY)) + 'px';
          widget.style.right = 'auto';
        };
        document.onmouseup = function() {
          isDragging = false;
          document.onmousemove = null;
          document.onmouseup = null;
        };
      };
    },

    open: function() {
      this.init();
      var w = document.getElementById('az-fleet-telemetry-widget');
      if (w) w.style.display = 'block';
      this.isOpen = true;
      this.fetchData();
      if (!this.timer) {
        var self = this;
        this.timer = setInterval(function() {
          if (self.isOpen) self.fetchData();
        }, 4000);
      }
    },

    close: function() {
      var w = document.getElementById('az-fleet-telemetry-widget');
      if (w) w.style.display = 'none';
      this.isOpen = false;
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    },

    fetchData: function(cb) {
      var self = this;
      var endpoint = '/api/fleet/status';
      fetch(endpoint, { credentials: 'same-origin' })
        .then(function(r) { return r.json(); })
        .then(function(res) {
          if (res && res.data) {
            self.renderData(res.data);
          } else {
            // Fallback to api-telemetry.php?action=fleet
            return fetch('/api-telemetry.php?action=fleet', { credentials: 'same-origin' })
              .then(function(r2) { return r2.json(); })
              .then(function(res2) { if (res2 && res2.data) self.renderData(res2.data); });
          }
        })
        .catch(function(err) {
          var b = document.getElementById('az-ft-body');
          if (b) b.innerHTML = '<div style="color:#ef4444;padding:12px;">Failed to fetch fleet telemetry: ' + err.message + '</div>';
        })
        .finally(function() {
          var up = document.getElementById('az-ft-last-updated');
          if (up) up.innerText = 'Updated ' + new Date().toLocaleTimeString();
          if (cb) cb();
        });
    },

    renderData: function(d) {
      var body = document.getElementById('az-ft-body');
      if (!body) return;

      var m = d.master || {};
      var sats = d.satellites || [];
      var summary = d.cluster_summary || {};

      var html = [];

      // Cluster Summary Header
      html.push('<div style="display:flex;justify-content:space-between;align-items:center;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);border-radius:8px;padding:8px 12px;margin-bottom:12px;">');
      html.push('  <div><span style="color:#94a3b8;font-size:11px;">Cluster State:</span> <strong style="color:#10b981;">' + (summary.online_satellites > 0 ? 'HEALTHY (Dual-Node)' : 'STANDALONE') + '</strong></div>');
      html.push('  <div><span style="color:#94a3b8;font-size:11px;">Total Nodes:</span> <strong style="color:#38bdf8;">' + (summary.total_cluster_nodes || 0) + '</strong></div>');
      html.push('</div>');

      // Master Node Card
      html.push('<div class="az-fleet-node-card">');
      html.push('  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">');
      html.push('    <div style="font-weight:700;color:#38bdf8;display:flex;align-items:center;gap:6px;">');
      html.push('      <i class="fa fa-shield"></i> ' + (m.hostname || 'Master') + ' <span style="font-size:10px;padding:1px 6px;border-radius:4px;background:#0284c7;color:#fff;">CONTROLLER</span>');
      html.push('    </div>');
      html.push('    <span style="font-size:11px;color:#10b981;font-weight:600;"><span class="az-pulse-green" style="margin-right:4px;"></span>ONLINE</span>');
      html.push('  </div>');
      html.push('  <div class="az-stat-grid">');
      html.push('    <div class="az-stat-label">IP Address:</div><div class="az-stat-val">' + (m.ip || '<MASTER_IP>') + '</div>');
      html.push('    <div class="az-stat-label">RAM Available:</div><div class="az-stat-val">' + (m.avail_ram_gb || 0) + ' / ' + (m.total_ram_gb || 0) + ' GB</div>');
      html.push('    <div class="az-stat-label">Ultra-KSM:</div><div class="az-stat-val" style="color:#10b981;">' + (m.ksm_run ? 'Active (' + m.ksm_saved_mb + ' MB)' : 'Standby') + '</div>');
      html.push('    <div class="az-stat-label">Soft-RoCE:</div><div class="az-stat-val" style="color:#38bdf8;">' + (m.soft_roce || 'Available') + '</div>');
      html.push('    <div class="az-stat-label">Active Nodes:</div><div class="az-stat-val">' + ((m.active_nodes && m.active_nodes.total) || 0) + '</div>');
      html.push('  </div>');
      html.push('</div>');

      // Satellite Nodes Card(s)
      if (sats.length === 0) {
        html.push('<div style="color:#94a3b8;text-align:center;padding:8px;">No satellites registered in cluster.</div>');
      } else {
        sats.forEach(function(s) {
          var pingTxt = s.online ? (s.latency_ms ? s.latency_ms + ' ms' : '< 1 ms') : 'Unreachable';
          var pingColor = s.online ? '#10b981' : '#ef4444';
          html.push('<div class="az-fleet-node-card">');
          html.push('  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">');
          html.push('    <div style="font-weight:700;color:#c084fc;display:flex;align-items:center;gap:6px;">');
          html.push('      <i class="fa fa-cubes"></i> ' + (s.name || ('Sat #' + s.id)) + ' <span style="font-size:10px;padding:1px 6px;border-radius:4px;background:#7c3aed;color:#fff;">SATELLITE #' + s.id + '</span>');
          html.push('    </div>');
          html.push('    <span style="font-size:11px;color:' + pingColor + ';font-weight:600;"><span class="az-pulse-green" style="background:' + pingColor + ';box-shadow:0 0 8px ' + pingColor + ';margin-right:4px;"></span>' + (s.online ? 'ONLINE' : 'OFFLINE') + '</span>');
          html.push('  </div>');
          html.push('  <div class="az-stat-grid">');
          html.push('    <div class="az-stat-label">IP Address:</div><div class="az-stat-val">' + s.ip + '</div>');
          html.push('    <div class="az-stat-label">Ping Latency:</div><div class="az-stat-val" style="color:' + pingColor + ';">' + pingTxt + '</div>');
          html.push('    <div class="az-stat-label">Package Ver:</div><div class="az-stat-val">' + (s.version || '6.8.74resolute1') + '</div>');
          html.push('    <div class="az-stat-label">Placed Nodes:</div><div class="az-stat-val">' + (s.active_nodes || 0) + '</div>');
          html.push('  </div>');
          html.push('</div>');
        });
      }

      body.innerHTML = html.join('');
    }
  };

  
  window.azamFleetTelemetry = azamFleetTelemetry;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { azamFleetTelemetry.init(); });
  } else {
    azamFleetTelemetry.init();
  }

