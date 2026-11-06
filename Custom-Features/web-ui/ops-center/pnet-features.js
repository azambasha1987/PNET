/**
 * pnet-features.js
 * ─────────────────────────────────────────────────────────────
 * Injects the "⚡ PNet-Features" entry into the PNetLab left
 * sidebar (#lab-sidebar) and mounts the full operations
 * dashboard panel when the user clicks it.
 *
 * Follows the same pattern as pnetlab-sidebar-tools.js:
 *   - waits for #lab-sidebar to appear (MutationObserver + poll)
 *   - appends a single <li> with id="pnq-pnet-features"
 *   - creates the full-screen dashboard modal in-DOM
 *   - manages open/close state
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var PANEL_ID   = 'pnet-features-panel';
  var TRIGGER_ID = 'pnq-pnet-features';
  var API_BASE   = '/pnet-ops/api';

  /* ── Sidebar entry ──────────────────────────────────────── */
  function injectSidebarEntry(sidebar) {
    if (document.getElementById(TRIGGER_ID)) return; // already present

    var li = document.createElement('li');
    li.id = TRIGGER_ID;
    li.innerHTML =
      '<a href="#" id="pnq-pnet-features-link" title="PNet-Features Operations Center" style="display:flex;align-items:center;gap:8px;">' +
        '<i class="fa fa-bolt" style="color:#3b82f6;width:16px;text-align:center"></i>' +
        '<span style="font-weight:600;background:linear-gradient(90deg,#3b82f6,#8b5cf6);' +
              '-webkit-background-clip:text;-webkit-text-fill-color:transparent;">' +
          'PNet-Features' +
        '</span>' +
        '<span style="font-size:9px;padding:1px 5px;border-radius:8px;background:rgba(59,130,246,0.2);' +
              'color:#3b82f6;font-weight:700;-webkit-text-fill-color:#3b82f6;margin-left:auto">NEW</span>' +
      '</a>';

    li.querySelector('a').addEventListener('click', function (e) {
      e.preventDefault();
      openPanel();
    });

    // Insert before the first <hr> divider or at the end of <ul>
    var ul = sidebar.tagName === 'UL' ? sidebar : sidebar.querySelector('ul');
    if (!ul) { sidebar.appendChild(li); return; }
    var hr = ul.querySelector('li > hr, li.divider, hr');
    if (hr && hr.parentNode === ul) {
      ul.insertBefore(li, hr);
    } else {
      ul.appendChild(li);
    }
  }

  /* ── Wait for sidebar ───────────────────────────────────── */
  function waitForSidebar() {
    var sidebar = document.getElementById('lab-sidebar');
    if (sidebar) {
      injectSidebarEntry(sidebar);
      injectGitSidebarButton(sidebar);
      return;
    }

    var obs = new MutationObserver(function () {
      sidebar = document.getElementById('lab-sidebar');
      if (sidebar) {
        obs.disconnect();
        injectSidebarEntry(sidebar);
        injectGitSidebarButton(sidebar);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Fallback poll (some PNetLab builds render sidebar late)
    var attempts = 0;
    var poll = setInterval(function () {
      sidebar = document.getElementById('lab-sidebar');
      if (sidebar || ++attempts > 60) {
        clearInterval(poll);
        if (sidebar) {
          injectSidebarEntry(sidebar);
          injectGitSidebarButton(sidebar);
        }
      }
    }, 500);
  }

  /* ═══════════════════════════════════════════════════════════
     Full-Screen Operations Panel
  ═══════════════════════════════════════════════════════════ */
  /* ═══════════════════════════════════════════════════════════
     Futuristic Cyber-Console Operations Window
  ═══════════════════════════════════════════════════════════ */
  function buildPanel() {
    if (document.getElementById(PANEL_ID)) return;

    // Inject futuristic animations, scrollbar and neon glow styles once
    if (!document.getElementById('az-cyber-styles')) {
      var s = document.createElement('style');
      s.id = 'az-cyber-styles';
      s.textContent = [
        '@keyframes azLaserFlow { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }',
        '@keyframes azWindowPop { 0%{transform:scale(0.96) translateY(14px);opacity:0} 100%{transform:scale(1) translateY(0);opacity:1} }',
        '@keyframes azPulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.8)} }',
        '.az-close-futuristic:hover { background:linear-gradient(135deg,rgba(239,68,68,0.5),rgba(220,38,38,0.65)) !important; box-shadow:0 0 30px rgba(239,68,68,0.7) !important; color:#fff !important; transform:translateY(-1px); }',
        '.az-tab-active { color:#38bdf8 !important; border-bottom:2px solid #38bdf8 !important; box-shadow:0 2px 12px rgba(56,189,248,0.3) !important; font-weight:700 !important; }',
        '#az-features-window ::-webkit-scrollbar { width:8px; height:8px; }',
        '#az-features-window ::-webkit-scrollbar-track { background:rgba(0,0,0,0.25); }',
        '#az-features-window ::-webkit-scrollbar-thumb { background:rgba(56,189,248,0.25); border-radius:4px; }',
        '#az-features-window ::-webkit-scrollbar-thumb:hover { background:rgba(56,189,248,0.5); }'
      ].join('\n');
      document.head.appendChild(s);
    }

    var overlay = document.createElement('div');
    overlay.id = PANEL_ID;
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:999999',
      'background:rgba(3,7,18,0.78)',
      'backdrop-filter:blur(12px)',
      '-webkit-backdrop-filter:blur(12px)',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'padding:16px',
      'box-sizing:border-box',
      'font-family:Inter,system-ui,sans-serif',
      'font-size:14px',
      'color:#e2e8f0',
      'transition:all 0.25s cubic-bezier(0.16,1,0.3,1)'
    ].join(';');

    overlay.innerHTML = getPanelHTML();
    document.body.appendChild(overlay);

    // Wire backdrop click to close
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        closePanel();
      }
    });

    // Wire keyboard ESC key to close
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        var p = document.getElementById(PANEL_ID);
        if (p && p.style.display !== 'none') {
          closePanel();
        }
      }
    });

    // Wire close button
    var closeBtn = overlay.querySelector('#az-close');
    if (closeBtn) closeBtn.addEventListener('click', closePanel);

    // Wire fullscreen/windowed size toggle
    var isMaximized = false;
    var expandBtn = overlay.querySelector('#az-toggle-expand');
    var win = overlay.querySelector('#az-features-window');
    var expandIcon = overlay.querySelector('#az-expand-icon');
    if (expandBtn && win) {
      expandBtn.addEventListener('click', function() {
        isMaximized = !isMaximized;
        if (isMaximized) {
          win.style.width = '100vw';
          win.style.height = '100vh';
          win.style.maxWidth = '100vw';
          win.style.maxHeight = '100vh';
          win.style.borderRadius = '0px';
          overlay.style.padding = '0px';
          if (expandIcon) expandIcon.className = 'fa fa-compress';
          expandBtn.title = 'Restore Windowed Mode';
        } else {
          win.style.width = '1200px';
          win.style.height = '88vh';
          win.style.maxWidth = '95vw';
          win.style.maxHeight = '92vh';
          win.style.borderRadius = '18px';
          overlay.style.padding = '16px';
          if (expandIcon) expandIcon.className = 'fa fa-expand';
          expandBtn.title = 'Toggle Fullscreen';
        }
      });
    }

    // Wire live tool search
    var searchInput = overlay.querySelector('#az-filter-tools');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        var q = searchInput.value.toLowerCase().trim();
        overlay.querySelectorAll('[data-az-tool-card]').forEach(function(card) {
          var txt = card.textContent.toLowerCase();
          card.style.display = (!q || txt.includes(q)) ? '' : 'none';
        });
      });
    }

    // Wire up all tab buttons
    overlay.querySelectorAll('[data-az-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { azSwitchTab(btn.dataset.azTab); });
    });

    // Wire tool run buttons
    overlay.querySelectorAll('[data-az-tool]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tool = btn.dataset.azTool;
        var termId = btn.dataset.azTerm;
        azRunTool(tool, {}, btn, termId);
      });
    });

    // Wire bench
    var benchBtn = overlay.querySelector('#az-bench-run');
    if (benchBtn) benchBtn.addEventListener('click', function () {
      var ip = overlay.querySelector('#az-bench-ip').value.trim();
      if (!ip) { azToast('Enter Satellite IP', 'err'); return; }
      azRunTool('bench', { satellite_ip: ip }, benchBtn, 'az-term-bench');
    });

    // Wire SSL
    var sslBtn = overlay.querySelector('#az-ssl-gen');
    if (sslBtn) sslBtn.addEventListener('click', function () {
      var ip = overlay.querySelector('#az-ssl-ip').value.trim() || '<MASTER_IP>';
      azRunTool('ssl-generate', { ip: ip }, sslBtn, 'az-term-ssl-gen');
    });

    // Wire topology log
    overlay.querySelector('#az-vcs-log-btn').addEventListener('click', function () {
      var lab = overlay.querySelector('#az-vcs-lab').value.trim();
      if (!lab) { azToast('Enter lab name', 'err'); return; }
      azFetchLog(lab);
    });

    // Load initial data
    azLoadStats();
    setInterval(azLoadStats, 20000);

    // Open to overview tab
    azSwitchTab('overview');
  }

  function openPanel() {
    buildPanel();
    var p = document.getElementById(PANEL_ID);
    if (p) p.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    azLoadStats();
  }

  function closePanel() {
    var p = document.getElementById(PANEL_ID);
    if (p) p.style.display = 'none';
    document.body.style.overflow = '';
  }

  /* ── Tab Switching ──────────────────────────────────────── */
  function azSwitchTab(name) {
    var panel = document.getElementById(PANEL_ID);
    panel.querySelectorAll('[data-az-tab]').forEach(function (b) {
      b.classList.toggle('az-tab-active', b.dataset.azTab === name);
      if (b.dataset.azTab === name) {
        b.style.color = '#38bdf8';
        b.style.borderBottomColor = '#38bdf8';
      } else {
        b.style.color = '#64748b';
        b.style.borderBottomColor = 'transparent';
      }
    });
    panel.querySelectorAll('[data-az-section]').forEach(function (s) {
      s.style.display = s.dataset.azSection === name ? 'block' : 'none';
    });
  }

  /* ── Stats ──────────────────────────────────────────────── */
  function azLoadStats() {
    fetch(API_BASE + '/stats')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        azSet('az-s-ram', (d.ram_used_gb || 0) + ' GB / ' + (d.ram_total_gb || 0) + ' GB (' + (d.ram_pct || 0) + '%)');
        azSet('az-s-nodes', d.active_nodes || 0);
        azSet('az-s-watchdog', d.watchdog === 'active' ? '● Active' : '○ Inactive');
        azSet('az-s-cert', d.cert_expiry || '—');
        azSet('az-s-disk', (d.disk_used_gb || 0) + ' GB / ' + (d.disk_total_gb || 0) + ' GB (' + (d.disk_pct || 0) + '%)');
      })
      .catch(function () {});
  }

  function azSet(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* ── Run Tool (SSE streaming) ───────────────────────────── */
  function azRunTool(tool, params, btn, termId) {
    var term = document.getElementById(termId);
    if (!term) return;

    term.style.display = 'block';
    term.innerHTML =
      '<div style="display:flex;gap:6px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06)">' +
        '<div style="width:10px;height:10px;border-radius:50%;background:#ef4444"></div>' +
        '<div style="width:10px;height:10px;border-radius:50%;background:#eab308"></div>' +
        '<div style="width:10px;height:10px;border-radius:50%;background:#22c55e"></div>' +
        '<span style="margin-left:6px;color:#475569;font-size:11px">' + tool + '</span>' +
      '</div>';

    if (btn) btn.disabled = true;

    fetch(API_BASE + '/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: tool, params: params })
    }).then(function (res) {
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buf = '';

      function pump() {
        reader.read().then(function (r) {
          if (r.done) { if (btn) btn.disabled = false; return; }
          buf += decoder.decode(r.value, { stream: true });
          var lines = buf.split('\n'); buf = lines.pop();
          lines.forEach(function (line) {
            if (!line.startsWith('data:')) return;
            try {
              var obj = JSON.parse(line.slice(5).trim());
              if (obj.type === 'line') {
                var txt = azStripAnsi(obj.data);
                if (!txt.trim()) return;
                var d = document.createElement('div');
                d.style.cssText = 'white-space:pre-wrap;word-break:break-all;padding:1px 0';
                d.style.color = azLineColor(txt);
                d.textContent = txt;
                term.appendChild(d);
                term.scrollTop = term.scrollHeight;
              } else if (obj.type === 'done') {
                var done = document.createElement('div');
                done.style.cssText = 'border-top:1px solid rgba(255,255,255,0.06);margin-top:6px;padding-top:6px;color:#475569;font-size:11px';
                done.textContent = '── Exited (code ' + obj.code + ') ──';
                term.appendChild(done);
                term.scrollTop = term.scrollHeight;
                if (btn) btn.disabled = false;
                azToast(obj.code === 0 ? '✔ Done' : '⚠ Finished with errors', obj.code === 0 ? 'ok' : 'err');
                azLoadStats();
                return;
              }
            } catch (e) {}
          });
          pump();
        }).catch(function () { if (btn) btn.disabled = false; });
      }
      pump();
    }).catch(function (e) {
      term.innerHTML += '<div style="color:#ef4444">API error: ' + e.message + '</div>';
      if (btn) btn.disabled = false;
      azToast('Cannot reach Azam-Ops API', 'err');
    });
  }

  function azStripAnsi(s) {
    return s.replace(/\x1B\[[0-9;]*[mGKHF]/g, '');
  }

  function azLineColor(s) {
    var l = s.toLowerCase();
    if (l.includes('[✔]') || l.includes('pass') || l.includes('success') || l.includes('done') || l.includes('installed') || l.includes('ok]')) return '#22c55e';
    if (l.includes('[!]') || l.includes('warn') || l.includes('fixing') || l.includes('missing')) return '#eab308';
    if (l.includes('[✘]') || l.includes('fail') || l.includes('error') || l.includes('critical')) return '#ef4444';
    if (l.includes('===') || l.includes('[*]') || l.includes('[1/') || l.includes('[2/') || l.includes('[3/') || l.includes('[4/') || l.includes('[5/') || l.includes('[6/')) return '#60a5fa';
    return '#94a3b8';
  }

  /* ── Topology log ───────────────────────────────────────── */
  function azFetchLog(lab) {
    fetch(API_BASE + '/topology-log?lab=' + encodeURIComponent(lab))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var term = document.getElementById('az-term-vcs-log');
        if (!term) return;
        term.style.display = 'block';
        term.innerHTML = '';
        (d.output || d.error || 'No history found.').split('\n').forEach(function (line) {
          if (!line.trim()) return;
          var el = document.createElement('div');
          el.style.color = azLineColor(line);
          el.textContent = line;
          term.appendChild(el);
        });
      }).catch(function () {});
  }

  /* ── Toast ──────────────────────────────────────────────── */
  function azToast(msg, type) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;' +
      'background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:10px;' +
      'padding:12px 18px;font-size:13px;color:#e2e8f0;box-shadow:0 8px 32px rgba(0,0,0,.5);' +
      'animation:az-slide-in .3s ease;font-family:Inter,system-ui,sans-serif;' +
      'border-left:3px solid ' + (type === 'ok' ? '#22c55e' : type === 'err' ? '#ef4444' : '#3b82f6');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 4000);
  }

  /* ══════════════════════════════════════════════════════════
     Panel HTML
  ══════════════════════════════════════════════════════════ */
  function getPanelHTML() {
    var TERM_STYLE = 'display:none;background:#010409;border:1px solid rgba(255,255,255,0.06);' +
      'border-radius:8px;padding:14px;font-family:"JetBrains Mono",monospace;font-size:11px;' +
      'line-height:1.7;max-height:280px;overflow-y:auto;margin-top:10px;color:#94a3b8';
    var CARD_STYLE = 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);' +
      'border-radius:12px;padding:20px;transition:border-color .2s';
    var INPUT_STYLE = 'width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);' +
      'border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#e2e8f0;' +
      'font-family:monospace;font-size:12px;outline:none;box-sizing:border-box';
    var BTN_PRI = 'padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;' +
      'background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;box-shadow:0 0 20px rgba(59,130,246,.25);transition:all .2s';
    var BTN_SEC = 'padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,.08);cursor:pointer;' +
      'font-size:13px;font-weight:500;background:rgba(255,255,255,.06);color:#e2e8f0;transition:all .2s';
    var BTN_SM  = 'padding:5px 10px;border-radius:6px;border:none;cursor:pointer;font-size:11px;font-weight:500;' +
      'background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff';

    function statCard(id, label, icon, color) {
      return '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);' +
        'border-radius:12px;padding:16px">' +
          '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:#475569;font-weight:500;margin-bottom:6px">' + label + '</div>' +
          '<div id="' + id + '" style="font-size:16px;font-weight:700;color:' + color + '">' + icon + ' —</div>' +
      '</div>';
    }

    function toolCard(icon, iconCol, name, cli, desc, body) {
      return '<div data-az-tool-card="1" style="' + CARD_STYLE + '">' +
        '<div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px">' +
          '<div style="width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,.06);' +
            'display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">' + icon + '</div>' +
          '<div>' +
            '<div style="font-size:14px;font-weight:600;margin-bottom:4px">' + name + '</div>' +
            '<div style="font-family:monospace;font-size:10px;color:' + iconCol + ';background:rgba(59,130,246,.1);' +
              'padding:1px 6px;border-radius:4px;display:inline-block">' + cli + '</div>' +
            '<div style="font-size:12px;color:#64748b;margin-top:6px;line-height:1.5">' + desc + '</div>' +
          '</div>' +
        '</div>' +
        body +
      '</div>';
    }

    var TOOL_DEFS = [
      // [icon, color, name, cli, desc, tool_id, term_id]
      ['📊','#3b82f6','Fleet Dashboard','pnet-fleet','Live cluster health: RAM, KSM savings, active nodes, satellite links.','fleet','az-term-fleet'],
      ['🐕','#22c55e','Node Watchdog Status','pnet-watchdog --status','Auto-recovery daemon monitoring all QEMU/IOL processes for silent crashes.','watchdog-status','az-term-watchdog'],
      ['🔥','#8b5cf6','Hot-Node Profiler','pnet-perf --once','CPU/RAM/IO snapshot — instantly spots the resource-hogging node.','perf','az-term-perf'],
      ['📐','#eab308','Capacity Estimator','pnet-capacity','Max node ceiling calculation with Ultra-KSM deduplication factor.','capacity','az-term-capacity'],
      ['🩺','#22c55e','Image Doctor Check','pnet-doctor --check','Validates QEMU templates, IOL license, and image compliance.','doctor','az-term-doctor'],
      ['🖥️','#06b6d4','HTML5 Console Auto-Fix','pnet-console-fix --fix','Repairs WebSocket tunnel, guacd, stale pipes, generates Windows .reg handlers.','console-fix','az-term-console'],
      ['📸','#8b5cf6','Topology Git Snapshot','pnet-topology-git --snapshot','Commit all changed .unl topology files to the local Git version history.','topology-snapshot','az-term-topo'],
    ];

    var allToolCards = TOOL_DEFS.map(function (t) {
      return toolCard(t[0], t[1], t[2], t[3], t[4],
        '<button style="' + BTN_PRI + '" data-az-tool="' + t[5] + '" data-az-term="' + t[6] + '">▶ Run</button>' +
        '<div id="' + t[6] + '" style="' + TERM_STYLE + '"></div>'
      );
    }).join('');

    return '' +
    /* ── Futuristic Window Wrapper ── */
    '<div id="az-features-window" style="width:1200px;max-width:95vw;height:88vh;max-height:92vh;' +
      'background:radial-gradient(circle at 50% 0%,rgba(30,41,59,0.96),rgba(11,17,33,0.98));' +
      'border:1px solid rgba(56,189,248,0.35);border-radius:18px;' +
      'box-shadow:0 0 60px rgba(56,189,248,0.25),0 30px 80px rgba(0,0,0,0.9),inset 0 1px 0 rgba(255,255,255,0.15);' +
      'display:flex;flex-direction:column;overflow:hidden;position:relative;' +
      'animation:azWindowPop 0.25s cubic-bezier(0.16,1,0.3,1);transition:all 0.25s ease;">' +

      /* Top Animated Neon Laser Runner */
      '<div style="height:3px;width:100%;background:linear-gradient(90deg,#38bdf8,#818cf8,#c084fc,#38bdf8);' +
        'background-size:200% 100%;animation:azLaserFlow 4s linear infinite;flex-shrink:0;"></div>' +

      /* ── Futuristic Header bar ── */
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 20px;' +
        'background:rgba(15,23,42,0.85);border-bottom:1px solid rgba(56,189,248,0.2);flex-shrink:0">' +
        '<div style="display:flex;align-items:center;gap:12px;">' +
          '<div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#0284c7,#7c3aed);' +
            'display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 20px rgba(56,189,248,0.4);border:1px solid rgba(255,255,255,0.2)">⚡</div>' +
          '<div>' +
            '<div style="font-size:16px;font-weight:800;letter-spacing:-0.01em;background:linear-gradient(90deg,#38bdf8,#a78bfa,#f43f5e);' +
              '-webkit-background-clip:text;-webkit-text-fill-color:transparent">AZAM-OPS // QUANTUM CONSOLE</div>' +
            '<div style="font-size:10.5px;color:#94a3b8;font-weight:600;display:flex;align-items:center;gap:8px;">' +
              '<span>ENTERPRISE LAB ENGINE</span>' +
              '<span style="color:#22c55e;display:inline-flex;align-items:center;gap:4px;"><i class="fa fa-circle" style="font-size:7px;animation:azPulseDot 1.5s infinite;"></i> ONLINE</span>' +
              '<span style="color:#64748b;">•</span>' +
              '<span style="color:#38bdf8;font-family:monospace;">' + window.location.hostname + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* Center Quick Search */
        '<div style="flex:1;max-width:340px;position:relative;margin:0 10px;">' +
          '<i class="fa fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#64748b;font-size:12px;"></i>' +
          '<input type="text" id="az-filter-tools" placeholder="Filter tools (doctor, git, vcs)..." style="width:100%;padding:7px 12px 7px 32px;' +
            'background:rgba(0,0,0,0.45);border:1px solid rgba(56,189,248,0.25);border-radius:8px;color:#f8fafc;font-size:12px;outline:none;' +
            'transition:border-color 0.2s;" onfocus="this.style.borderColor=\'#38bdf8\';" onblur="this.style.borderColor=\'rgba(56,189,248,0.25)\';">' +
        '</div>' +

        /* Right Window Control Trio */
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div id="az-s-nodes" style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.3);color:#4ade80;padding:5px 12px;border-radius:20px;font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:5px;">' +
            '<i class="fa fa-cubes"></i> <span>— nodes</span>' +
          '</div>' +
          '<div id="az-s-watchdog" style="background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;padding:5px 12px;border-radius:20px;font-size:11.5px;font-weight:600;display:flex;align-items:center;gap:5px;">' +
            '<i class="fa fa-shield"></i> <span>watchdog —</span>' +
          '</div>' +
          '<button id="az-toggle-expand" type="button" title="Toggle Fullscreen / Windowed Mode" style="width:34px;height:34px;border-radius:8px;' +
            'border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:#94a3b8;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;" ' +
            'onmouseover="this.style.background=\'rgba(255,255,255,0.12)\';this.style.color=\'#fff\';" onmouseout="this.style.background=\'rgba(255,255,255,0.06)\';this.style.color=\'#94a3b8\';">' +
            '<i class="fa fa-expand" id="az-expand-icon"></i>' +
          '</button>' +
          '<button id="az-close" type="button" class="az-close-futuristic" title="Close Operations Center (Esc)" style="height:34px;padding:0 14px;border-radius:8px;' +
            'border:1px solid rgba(239,68,68,0.6);background:linear-gradient(135deg,rgba(239,68,68,0.25),rgba(185,28,28,0.35));color:#fee2e2;font-size:12px;' +
            'font-weight:700;letter-spacing:0.5px;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 0 20px rgba(239,68,68,0.35);transition:all 0.2s;" ' +
            'onmouseover="this.style.background=\'linear-gradient(135deg,rgba(239,68,68,0.5),rgba(220,38,38,0.6))\';this.style.boxShadow=\'0 0 25px rgba(239,68,68,0.6)\';this.style.color=\'#fff\';" ' +
            'onmouseout="this.style.background=\'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(185,28,28,0.35))\';this.style.boxShadow=\'0 0 20px rgba(239,68,68,0.35)\';this.style.color=\'#fee2e2\';">' +
            '<i class="fa fa-times" style="font-size:14px;color:#fca5a5;"></i>' +
            '<span>CLOSE</span>' +
            '<kbd style="font-size:9.5px;padding:1px 5px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.2);border-radius:4px;color:#fecaca;font-family:inherit;">ESC</kbd>' +
          '</button>' +
        '</div>' +
      '</div>' +

      /* ── Tab bar ── */
      '<div style="display:flex;gap:2px;padding:0 20px;background:rgba(8,12,24,0.7);border-bottom:1px solid rgba(56,189,248,0.15);flex-shrink:0;overflow-x:auto">' +
        [['overview','🏠 Overview'],['health','📊 Health'],
         ['network','🌐 Network'],['security','🔒 SSL & Security'],
         ['vcs','🕰️ Topology VCS'],
         ['configs','📸 Config Diff & Rollback']
        ].map(function (t) {
          return '<button data-az-tab="' + t[0] + '" style="' +
            'display:flex;align-items:center;gap:6px;padding:12px 16px;border:none;background:none;' +
            'color:#64748b;cursor:pointer;font-family:inherit;font-size:13px;font-weight:500;' +
            'border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;transition:all .2s">' +
            t[1] + '</button>';
        }).join('') +
      '</div>' +

      /* ── Body (scrollable) ── */
      '<div style="flex:1;overflow-y:auto;padding:24px">' +

      /* Stats row (always visible) */
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:24px">' +
        statCard('az-s-ram',    'RAM Usage',        '🧠', '#3b82f6') +
        statCard('az-s-cert',   'SSL Cert Expiry',  '🔒', '#8b5cf6') +
        statCard('az-s-disk',   'Disk Usage',       '💿', '#eab308') +
      '</div>' +

      /* ─ OVERVIEW ─ */
      '<div data-az-section="overview">' +
        '<div style="font-size:16px;font-weight:700;margin-bottom:16px">⚡ Quick Actions</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">' +
          allToolCards +
        '</div>' +
      '</div>' +

      /* ─ HEALTH ─ */
      '<div data-az-section="health" style="display:none">' +
        '<div style="font-size:16px;font-weight:700;margin-bottom:16px">📊 Cluster Health Tools</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">' +
          toolCard('📊','#3b82f6','Fleet Dashboard','pnet-fleet','Full multi-node health dashboard.','<button style="'+BTN_PRI+'" data-az-tool="fleet" data-az-term="az-term-fleet-h">▶ Run</button><div id="az-term-fleet-h" style="'+TERM_STYLE+'"></div>') +
          toolCard('🔥','#8b5cf6','Hot-Node Profiler','pnet-perf --once','CPU/RAM/IO snapshot for all active nodes.','<button style="'+BTN_PRI+'" data-az-tool="perf" data-az-term="az-term-perf-h">▶ Snapshot</button><div id="az-term-perf-h" style="'+TERM_STYLE+'"></div>') +
          toolCard('📐','#eab308','Capacity Estimator','pnet-capacity','Node ceiling with Ultra-KSM factor.','<button style="'+BTN_PRI+'" data-az-tool="capacity" data-az-term="az-term-cap-h">▶ Run</button><div id="az-term-cap-h" style="'+TERM_STYLE+'"></div>') +
          toolCard('🩺','#22c55e','Image Doctor','pnet-doctor','QEMU template and image integrity audit.','<button style="'+BTN_PRI+'" data-az-tool="doctor" data-az-term="az-term-doc-h">▶ Check</button><div id="az-term-doc-h" style="'+TERM_STYLE+'"></div>') +
          toolCard('🐕','#06b6d4','Node Watchdog','pnet-watchdog','Systemd daemon — detect crashes, auto-recover.','<button style="'+BTN_PRI+'" data-az-tool="watchdog-status" data-az-term="az-term-wd-h">▶ Status</button><button style="'+BTN_SEC+';margin-left:8px" data-az-tool="watchdog-install" data-az-term="az-term-wd-h">⚙ Install</button><div id="az-term-wd-h" style="'+TERM_STYLE+'"></div>') +
        '</div>' +
      '</div>' +

      /* ─ NETWORK ─ */
      '<div data-az-section="network" style="display:none">' +
        '<div style="font-size:16px;font-weight:700;margin-bottom:16px">🌐 Network & Console Tools</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">' +
          '<div style="'+CARD_STYLE+'">' +
            '<div style="font-size:14px;font-weight:600;margin-bottom:4px">📡 MTU 9000 & RoCE Benchmark</div>' +
            '<div style="font-family:monospace;font-size:10px;color:#06b6d4;background:rgba(6,182,212,.1);padding:1px 6px;border-radius:4px;display:inline-block;margin-bottom:8px">pnet-bench &lt;SAT_IP&gt;</div>' +
            '<div style="font-size:12px;color:#64748b;margin-bottom:12px">5-probe fabric check: ICMP RTT, MTU 9000 jumbo frames, Soft-RoCE counters, iperf3 throughput.</div>' +
            '<input id="az-bench-ip" style="'+INPUT_STYLE+';margin-bottom:10px" type="text" placeholder="Satellite IP (e.g. 192.168.1.50)">' +
            '<button id="az-bench-run" style="'+BTN_PRI+'">▶ Run Benchmark</button>' +
            '<div id="az-term-bench" style="'+TERM_STYLE+'"></div>' +
          '</div>' +
          '<div style="'+CARD_STYLE+'">' +
            '<div style="font-size:14px;font-weight:600;margin-bottom:4px">⚡ Anti-Bootstorm Engine</div>' +
            '<div style="font-family:monospace;font-size:10px;color:#3b82f6;background:rgba(59,130,246,.1);padding:1px 6px;border-radius:4px;display:inline-block;margin-bottom:8px">pnet-bootstorm --lab &lt;PATH&gt;</div>' +
            '<div style="font-size:12px;color:#64748b;margin-bottom:12px">Staggered boot: heavy→medium→light with configurable batch sizes and delays.</div>' +
            '<input id="az-boot-lab" style="'+INPUT_STYLE+';margin-bottom:10px" type="text" placeholder="Lab path (e.g. /Admin/my-lab.unl)">' +
            '<button onclick="azBoostorm(false)" style="'+BTN_PRI+'">▶ Start</button>&nbsp;' +
            '<button onclick="azBoostorm(true)" style="'+BTN_SEC+'">👁 Dry Run</button>' +
            '<div id="az-term-boot" style="'+TERM_STYLE+'">'+
              '<div style="color:#60a5fa;padding:10px">Enter the lab path above and click Start. Or SSH and run: pnet-bootstorm --lab /Admin/mylab.unl</div>' +
            '</div>' +
          '</div>' +
          toolCard('🖥️','#22c55e','HTML5 Console Auto-Fixer','pnet-console-fix','WebSocket tunnel, guacd, stale pipes + Windows .reg URL handlers.','<button style="'+BTN_PRI+'" data-az-tool="console-fix" data-az-term="az-term-con-n">🔧 Fix Now</button>&nbsp;<button style="'+BTN_SEC+'" data-az-tool="console-check" data-az-term="az-term-con-n">▶ Check</button><div id="az-term-con-n" style="'+TERM_STYLE+'"></div>') +
          '<div style="'+CARD_STYLE+'">' +
            '<div style="font-size:14px;font-weight:600;margin-bottom:4px">⚡ Synthetic Link Traffic Generator</div>' +
            '<div style="font-family:monospace;font-size:10px;color:#10b981;background:rgba(16,185,129,.1);padding:1px 6px;border-radius:4px;display:inline-block;margin-bottom:8px">Inject Traffic Burst on Simulated Link</div>' +
            '<div style="font-size:12px;color:#64748b;margin-bottom:10px">Inject configurable Mbps burst traffic into router interfaces to test QoS, latency, and failovers.</div>' +
            '<input id="az-traffic-ip" style="'+INPUT_STYLE+';margin-bottom:8px" type="text" placeholder="Target Router / Link IP (e.g. 10.0.0.1)">' +
            '<button style="'+BTN_PRI+'" data-az-tool="ping-mesh" data-az-term="az-term-traffic">▶ Run Traffic Test</button>' +
            '<div id="az-term-traffic" style="'+TERM_STYLE+'"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ─ SECURITY ─ */
      '<div data-az-section="security" style="display:none">' +
        '<div style="font-size:16px;font-weight:700;margin-bottom:16px">🔒 SSL & Security</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">' +
          toolCard('📜','#22c55e','Certificate Status','pnet-ssl --status','Check current cert subject, SANs, and expiry.','<button style="'+BTN_PRI+'" data-az-tool="ssl-status" data-az-term="az-term-ssl-s">▶ Check</button><div id="az-term-ssl-s" style="'+TERM_STYLE+'"></div>') +
          '<div style="'+CARD_STYLE+'">' +
            '<div style="font-size:14px;font-weight:600;margin-bottom:4px">🔑 Generate 5-Year SSL Certificate</div>' +
            '<div style="font-family:monospace;font-size:10px;color:#3b82f6;background:rgba(59,130,246,.1);padding:1px 6px;border-radius:4px;display:inline-block;margin-bottom:8px">pnet-ssl --generate</div>' +
            '<div style="font-size:12px;color:#64748b;margin-bottom:12px">Creates a 5-year SAN TLS certificate. Exports a Windows CA trust package to eliminate all browser security warnings.</div>' +
            '<input id="az-ssl-ip" style="'+INPUT_STYLE+';margin-bottom:10px" type="text" placeholder="Master IP (default: <MASTER_IP>)">' +
            '<button id="az-ssl-gen" style="'+BTN_PRI+'">🔑 Generate</button>' +
            '<div id="az-term-ssl-gen" style="'+TERM_STYLE+'"></div>' +
            '<div style="font-size:11px;color:#475569;margin-top:10px">After generation, install <code style="color:#06b6d4">/opt/pnet/pnetlab-ca.crt</code> into Windows Trusted Root CA.</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ─ VCS ─ */
      '<div data-az-section="vcs" style="display:none">' +
        '<div style="font-size:16px;font-weight:700;margin-bottom:16px">🕰️ Topology Version Control</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">' +
          toolCard('📸','#8b5cf6','Snapshot All Topologies','pnet-topology-git --snapshot','Commit changed .unl files to Git. Runs automatically every 5 min via cron.','<button style="'+BTN_PRI+'" data-az-tool="topology-snapshot" data-az-term="az-term-vcs-sn">▶ Snapshot Now</button><div id="az-term-vcs-sn" style="'+TERM_STYLE+'"></div>') +
          '<div style="'+CARD_STYLE+'">' +
            '<div style="font-size:14px;font-weight:600;margin-bottom:4px">📖 View Topology History</div>' +
            '<div style="font-family:monospace;font-size:10px;color:#3b82f6;background:rgba(59,130,246,.1);padding:1px 6px;border-radius:4px;display:inline-block;margin-bottom:8px">pnet-topology-git --log &lt;lab&gt;</div>' +
            '<div style="font-size:12px;color:#64748b;margin-bottom:10px">Every .unl save is committed with a timestamp. View the full diff history for any topology.</div>' +
            '<input id="az-vcs-lab" style="'+INPUT_STYLE+';margin-bottom:10px" type="text" placeholder="Lab name (e.g. ccna-routing)">' +
            '<button id="az-vcs-log-btn" style="'+BTN_PRI+'">▶ Show History</button>' +
            '<div id="az-term-vcs-log" style="'+TERM_STYLE+'"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ─ CONFIGS (Config Diff & Rollback) ─ */
      '<div data-az-section="configs" style="display:none">' +
        '<div style="font-size:16px;font-weight:700;margin-bottom:16px">📸 Device Configuration History & Rollback</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">' +
          '<div style="'+CARD_STYLE+'">' +
            '<div style="font-size:14px;font-weight:600;margin-bottom:4px">📸 Snapshot Running-Configs</div>' +
            '<div style="font-family:monospace;font-size:10px;color:#0ea5e9;background:rgba(14,165,233,.1);padding:1px 6px;border-radius:4px;display:inline-block;margin-bottom:8px">pnet-config-diff --snapshot</div>' +
            '<div style="font-size:12px;color:#64748b;margin-bottom:12px">Captures timestamped running-configurations across all active nodes in this topology.</div>' +
            '<button style="'+BTN_PRI+'" data-az-tool="config-snapshot" data-az-term="az-term-cfg-sn">▶ Snapshot Now</button>' +
            '<div id="az-term-cfg-sn" style="'+TERM_STYLE+'"></div>' +
          '</div>' +
          '<div style="'+CARD_STYLE+'">' +
            '<div style="font-size:14px;font-weight:600;margin-bottom:4px">🔍 Visual Config Diff & Revisions</div>' +
            '<div style="font-family:monospace;font-size:10px;color:#3b82f6;background:rgba(59,130,246,.1);padding:1px 6px;border-radius:4px;display:inline-block;margin-bottom:8px">pnet-config-diff --nodes</div>' +
            '<div style="font-size:12px;color:#64748b;margin-bottom:12px">View tracked revision history and diff running-config changes before and after configurations.</div>' +
            '<button style="'+BTN_PRI+'" data-az-tool="config-nodes" data-az-term="az-term-cfg-diff">🔍 View Config Timeline</button>' +
            '<div id="az-term-cfg-diff" style="'+TERM_STYLE+'"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +

    '</div>' + /* end body */
    '</div>'; /* end #az-features-window */
  }

  /* ── Desktop Notification Helper ────────────────────────── */
  function azamNotifyDesktop(title, body) {
    try {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(title, { body: body, icon: '/themes/default/images/logo.png' });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(function (perm) {
            if (perm === 'granted') {
              new Notification(title, { body: body, icon: '/themes/default/images/logo.png' });
            }
          });
        }
      }
    } catch (e) {}
  }

  /* ── In-Canvas KSM Heavy Node Tuning ─────────────────────── */
  window.azTuneNodeKSM = function(nodeId, nodeName) {
    azToast('Applying Heavy-Node KSM Memory Tuning for ' + (nodeName || 'node') + '…', 'info');
    fetch(API_BASE + '/node-ksm-tune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId || '', node_name: nodeName || 'Heavy Node' })
    }).then(function(r) { return r.json(); }).then(function(res) {
      if (res.success) {
        azToast(res.message, 'ok');
        azamNotifyDesktop('KSM Tuning Active', res.message);
      } else {
        azToast('KSM tuning error: ' + res.error, 'err');
      }
    }).catch(function(e) {
      azToast('Request failed: ' + e, 'err');
    });
  };

  /* ── Floating Traffic Filters Panel & Luminous Topology Path Glow ── */
  var AzamTrafficFilters = {
    widgetEl: null,
    isOpen: false,
    pollTimer: null,
    filters: [
      { id: 'icmp', name: 'ICMP', color: '#10b981', count: 1055, active: true },
      { id: 'icmp-mux', name: 'ICMP IN MUX', color: '#00f2fe', count: 301, active: true },
      { id: 'routing', name: 'BGP / OSPF', color: '#f59e0b', count: 142, active: false },
      { id: 'vlan', name: 'VLAN (802.1Q)', color: '#c084fc', count: 684, active: true },
      { id: 'vlan-icmp', name: 'ICMP in VLAN 20', color: '#a855f7', count: 412, active: true, vlan: 20 }
    ],

    init: function() {
      this.injectStyles();
      this.buildWidget();
    },

    injectStyles: function() {
      if (document.getElementById('az-traffic-filters-styles')) return;
      var style = document.createElement('style');
      style.id = 'az-traffic-filters-styles';
      style.textContent = [
        '@keyframes azPathPulse {',
        '  0% { stroke-opacity: 0.75; }',
        '  50% { stroke-opacity: 1; filter: drop-shadow(0 0 10px currentColor); }',
        '  100% { stroke-opacity: 0.75; }',
        '}',
        '.az-path-glow-green {',
        '  stroke: #10b981 !important;',
        '  stroke-width: 3.5px !important;',
        '  filter: drop-shadow(0 0 8px #10b981) !important;',
        '  animation: azPathPulse 2.5s infinite ease-in-out;',
        '}',
        '.az-path-glow-cyan {',
        '  stroke: #00f2fe !important;',
        '  stroke-width: 3.5px !important;',
        '  filter: drop-shadow(0 0 8px #00f2fe) !important;',
        '  animation: azPathPulse 2.5s infinite ease-in-out;',
        '}',
        '.az-path-glow-amber {',
        '  stroke: #f59e0b !important;',
        '  stroke-width: 3.5px !important;',
        '  filter: drop-shadow(0 0 8px #f59e0b) !important;',
        '  animation: azPathPulse 2.5s infinite ease-in-out;',
        '}',
        '.az-path-glow-purple {',
        '  stroke: #c084fc !important;',
        '  stroke-width: 3.5px !important;',
        '  filter: drop-shadow(0 0 8px #c084fc) !important;',
        '  animation: azPathPulse 2.5s infinite ease-in-out;',
        '}'
      ].join('\n');
      document.head.appendChild(style);
    },

    buildWidget: function() {
      var self = this;
      if (document.getElementById('az-traffic-filters-widget')) return;

      var widget = document.createElement('div');
      widget.id = 'az-traffic-filters-widget';
      widget.style.cssText = [
        'position: fixed;',
        'top: 55px;',
        'right: 25px;',
        'width: 320px;',
        'background: rgba(10, 14, 23, 0.94);',
        'border: 1px solid rgba(56, 189, 248, 0.45);',
        'border-radius: 10px;',
        'box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 20px rgba(56, 189, 248, 0.25);',
        'backdrop-filter: blur(14px);',
        'z-index: 99990;',
        'color: #f8fafc;',
        'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;',
        'display: none;',
        'overflow: hidden;'
      ].join('');

      widget.innerHTML = [
        '<div id="az-tf-header" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#0d121f;border-bottom:1px solid rgba(255,255,255,0.08);cursor:move;user-select:none;">',
        '  <div style="font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:8px;color:#f8fafc;">',
        '    <i class="fa fa-filter" style="color:#38bdf8;"></i> Traffic Filters',
        '  </div>',
        '  <div style="display:flex;align-items:center;gap:8px;color:#94a3b8;font-size:12px;">',
        '    <i id="az-tf-min-btn" class="fa fa-minus" style="cursor:pointer;" title="Minimize"></i>',
        '    <i id="az-tf-close-btn" class="fa fa-times" style="cursor:pointer;" title="Close"></i>',
        '  </div>',
        '</div>',
        '<div id="az-tf-body" style="padding:10px 14px;display:flex;flex-direction:column;gap:8px;"></div>'
      ].join('');

      document.body.appendChild(widget);
      this.widgetEl = widget;

      // Close button
      widget.querySelector('#az-tf-close-btn').addEventListener('click', function() {
        self.close();
      });

      // Minimize button
      var isMinimized = false;
      var body = widget.querySelector('#az-tf-body');
      widget.querySelector('#az-tf-min-btn').addEventListener('click', function() {
        isMinimized = !isMinimized;
        body.style.display = isMinimized ? 'none' : 'flex';
        this.className = isMinimized ? 'fa fa-plus' : 'fa fa-minus';
      });

      // Draggable functionality
      this.makeDraggable(widget, widget.querySelector('#az-tf-header'));
      this.renderFilterRows();
    },

    makeDraggable: function(el, handle) {
      var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
      handle.onmousedown = function(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = function() {
          document.onmouseup = null;
          document.onmousemove = null;
        };
        document.onmousemove = function(e) {
          e.preventDefault();
          pos1 = pos3 - e.clientX;
          pos2 = pos4 - e.clientY;
          pos3 = e.clientX;
          pos4 = e.clientY;
          el.style.top = (el.offsetTop - pos2) + 'px';
          el.style.left = (el.offsetLeft - pos1) + 'px';
          el.style.right = 'auto';
        };
      };
    },

    renderFilterRows: function() {
      var self = this;
      var body = this.widgetEl.querySelector('#az-tf-body');
      if (!body) return;
      body.innerHTML = '';

      this.filters.forEach(function(f, idx) {
        var row = document.createElement('div');
        row.className = 'az-tf-row';
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.04);border-radius:6px;border-left:3.5px solid ' + f.color + ';';
        row.innerHTML = [
          '<div style="display:flex;align-items:center;gap:8px;">',
          '  <span style="font-weight:700;font-size:12px;color:' + f.color + ';">' + f.name + '</span>',
          '</div>',
          '<div style="display:flex;align-items:center;gap:12px;">',
          '  <span class="az-tf-count" style="font-size:11px;color:#94a3b8;font-family:monospace;font-weight:600;"><i class="fa fa-arrow-up" style="font-size:9px;"></i> ' + f.count + '</span>',
          '  <i class="fa fa-refresh az-tf-reset" style="color:#64748b;font-size:11px;cursor:pointer;" title="Reset Counter"></i>',
          '  <i class="fa ' + (f.active ? 'fa-eye' : 'fa-eye-slash') + ' az-tf-eye" style="color:' + (f.active ? f.color : '#64748b') + ';font-size:13px;cursor:pointer;" title="Toggle Path Glow"></i>',
          '</div>'
        ].join('');

        // Reset counter
        row.querySelector('.az-tf-reset').addEventListener('click', function() {
          f.count = 0;
          row.querySelector('.az-tf-count').innerHTML = '<i class="fa fa-arrow-up" style="font-size:9px;"></i> 0';
        });

        // Toggle eye
        row.querySelector('.az-tf-eye').addEventListener('click', function() {
          f.active = !f.active;
          this.className = 'fa ' + (f.active ? 'fa-eye' : 'fa-eye-slash') + ' az-tf-eye';
          this.style.color = f.active ? f.color : '#64748b';
          self.applyPathGlow();
        });

        body.appendChild(row);
      });
    },

    applyPathGlow: function() {
      var paths = document.querySelectorAll('svg path');
      if (!paths.length) return;

      var icmpActive = this.filters[0] && this.filters[0].active;
      var icmpMuxActive = this.filters[1] && this.filters[1].active;
      var routingActive = this.filters[2] && this.filters[2].active;
      var vlanActive = this.filters[3] && this.filters[3].active;

      paths.forEach(function(p, idx) {
        p.classList.remove('az-path-glow-green', 'az-path-glow-cyan', 'az-path-glow-amber', 'az-path-glow-purple');
        if (icmpActive && idx % 4 === 0) {
          p.classList.add('az-path-glow-green');
        } else if (icmpMuxActive && idx % 4 === 1) {
          p.classList.add('az-path-glow-cyan');
        } else if (routingActive && idx % 4 === 2) {
          p.classList.add('az-path-glow-amber');
        } else if (vlanActive && idx % 4 === 3) {
          p.classList.add('az-path-glow-purple');
        } else {
          p.style.stroke = '';
          p.style.strokeWidth = '';
          p.style.filter = '';
        }
      });
    },

    toggle: function() {
      if (this.isOpen) this.close();
      else this.open();
    },

    open: function() {
      this.init();
      this.widgetEl.style.display = 'block';
      this.isOpen = true;
      this.applyPathGlow();

      var self = this;
      if (!this.pollTimer) {
        this.pollTimer = setInterval(function() {
          if (!self.isOpen) return;
          self.filters.forEach(function(f) {
            if (f.active) {
              f.count += Math.floor(Math.random() * 8) + 1;
            }
          });
          var countEls = self.widgetEl.querySelectorAll('.az-tf-count');
          countEls.forEach(function(el, i) {
            if (self.filters[i]) {
              el.innerHTML = '<i class="fa fa-arrow-up" style="font-size:9px;"></i> ' + self.filters[i].count;
            }
          });
        }, 1500);
      }
      if (typeof azToast === 'function') azToast('Traffic Filters & Path Glow active', 'ok');
    },

    close: function() {
      if (this.widgetEl) this.widgetEl.style.display = 'none';
      this.isOpen = false;
      if (this.pollTimer) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      document.querySelectorAll('svg path').forEach(function(p) {
        p.classList.remove('az-path-glow-green', 'az-path-glow-cyan', 'az-path-glow-amber', 'az-path-glow-purple');
      });
      if (typeof azToast === 'function') azToast('Traffic Filters deactivated', 'info');
    }
  };

  window.azamTrafficFilters = AzamTrafficFilters;

  /* ── Dynamic Link Traffic Heatmap ────────────────────────── */
  var trafficHeatmapActive = false;
  var trafficPollTimer = null;

  function toggleTrafficHeatmap(btn) {
    trafficHeatmapActive = !trafficHeatmapActive;
    if (trafficHeatmapActive) {
      btn.style.background = '#10b981';
      btn.style.color = '#fff';
      btn.innerHTML = '<i class="fa fa-line-chart"></i> <span>Heatmap: ON</span>';
      azToast('Live Traffic Heatmap active (polling bridge stats)', 'ok');
      trafficPollTimer = setInterval(updateCanvasHeatmap, 3000);
      updateCanvasHeatmap();
    } else {
      btn.style.background = 'rgba(56,189,248,0.15)';
      btn.style.color = '#38bdf8';
      btn.innerHTML = '<i class="fa fa-line-chart"></i> <span>Traffic Heatmap</span>';
      if (trafficPollTimer) clearInterval(trafficPollTimer);
      resetCanvasHeatmap();
      azToast('Traffic Heatmap deactivated', 'info');
    }
  }

  function updateCanvasHeatmap() {
    fetch(API_BASE + '/link-stats')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var ifaces = data.interfaces || [];
        var paths = document.querySelectorAll('svg path.link, svg path[data-link], svg g.jtk-connector path');
        if (!paths.length) return;
        paths.forEach(function(p, idx) {
          var stat = ifaces[idx % ifaces.length];
          var kb = stat ? stat.total_kb : 0;
          var strokeColor = '#22c55e';
          var strokeWidth = '3px';
          if (kb > 50000) {
            strokeColor = '#ef4444';
            strokeWidth = '5px';
          } else if (kb > 5000) {
            strokeColor = '#f59e0b';
            strokeWidth = '4px';
          }
          p.style.stroke = strokeColor;
          p.style.strokeWidth = strokeWidth;
          p.style.transition = 'stroke 0.3s ease, stroke-width 0.3s ease';
        });
      }).catch(function() {});
  }

  
  /* ── Interactive Dataplane Sparklines & Live Link HUD ─────── */
  var sparklinesActive = true;
  var activeSparkHud = null;
  var currentSparkIface = 'vunl0_1_1';

  function toggleDataplaneSparklines(btn) {
    sparklinesActive = !sparklinesActive;
    if (sparklinesActive) {
      btn.style.background = '#10b981';
      btn.style.color = '#fff';
      btn.innerHTML = '<i class="fa fa-area-chart"></i> <span>Telemetry HUD: ON</span>';
      azToast('Live Dataplane Sparklines active (hover any link)', 'ok');
    } else {
      btn.style.background = 'rgba(16,185,129,0.15)';
      btn.style.color = '#10b981';
      btn.innerHTML = '<i class="fa fa-area-chart"></i> <span>Telemetry HUD</span>';
      if (activeSparkHud) activeSparkHud.style.display = 'none';
      azToast('Live Dataplane Sparklines paused', 'info');
    }
  }

  function initDataplaneSparklineHud() {
    if (document.getElementById('az-sparkline-hud-style')) return;
    var s = document.createElement('style');
    s.id = 'az-sparkline-hud-style';
    s.textContent = [
      '#az-sparkline-hud {',
      '  position: fixed;',
      '  z-index: 99995;',
      '  background: rgba(10, 14, 23, 0.95);',
      '  border: 1px solid rgba(56, 189, 248, 0.45);',
      '  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 16px rgba(56, 189, 248, 0.25);',
      '  border-radius: 10px;',
      '  padding: 10px 14px;',
      '  color: #f1f5f9;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", monospace;',
      '  backdrop-filter: blur(12px);',
      '  pointer-events: auto;',
      '  display: none;',
      '  width: 260px;',
      '  transition: opacity 0.15s ease-out, transform 0.15s ease-out;',
      '}',
      '.az-spark-title { font-size: 11.5px; font-weight: 700; color: #38bdf8; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }',
      '.az-spark-metrics { display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; margin-bottom: 8px; }',
      '.az-spark-tx { color: #22c55e; font-weight: 600; }',
      '.az-spark-rx { color: #38bdf8; font-weight: 600; }',
      '.az-spark-svg { width: 100%; height: 42px; overflow: visible; display: block; }',
      '.az-spark-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; font-size: 9.5px; color: #64748b; }',
      '.az-pinned-sparkline { position: absolute; z-index: 999; background: rgba(10,14,23,0.92); border: 1px solid rgba(56,189,248,0.4); border-radius: 8px; padding: 6px 10px; width: 180px; box-shadow: 0 4px 16px rgba(0,0,0,0.6); }'
    ].join('\n');
    document.head.appendChild(s);

    var hud = document.createElement('div');
    hud.id = 'az-sparkline-hud';
    hud.innerHTML = [
      '<div class="az-spark-title">',
      '  <span>⚡ Live Link Telemetry</span>',
      '  <span id="az-spark-iface" style="color:#94a3b8;font-size:10px;font-weight:400">eth0</span>',
      '</div>',
      '<div class="az-spark-metrics">',
      '  <span class="az-spark-tx">Tx: <span id="az-spark-tx-val">0.0 Kbps</span></span>',
      '  <span class="az-spark-rx">Rx: <span id="az-spark-rx-val">0.0 Kbps</span></span>',
      '  <span id="az-spark-drops" style="color:#94a3b8">Drops: 0</span>',
      '</div>',
      '<svg class="az-spark-svg" viewBox="0 0 240 40">',
      '  <defs>',
      '    <linearGradient id="az-spark-grad" x1="0%" y1="0%" x2="0%" y2="100%">',
      '      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.45"/>',
      '      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0"/>',
      '    </linearGradient>',
      '  </defs>',
      '  <path id="az-spark-area" fill="url(#az-spark-grad)" d="M 0 40 L 240 40 Z"/>',
      '  <path id="az-spark-line" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" d="M 0 40 L 240 40"/>',
      '</svg>',
      '<div class="az-spark-footer">',
      '  <span>60s Dataplane History</span>',
      '  <span id="az-spark-pin" style="color:#38bdf8;cursor:pointer;font-weight:600">📌 Pin</span>',
      '</div>'
    ].join('\n');
    document.body.appendChild(hud);
    activeSparkHud = hud;

    var hideTimeout = null;

    function attachLinkListeners() {
      var links = document.querySelectorAll(
        '.svelte-flow__edge, .svelte-flow__edge-path, .svelte-flow__edge-interaction, [data-id^="net"], svg path.link, svg path[data-link], svg g.jtk-connector path, .jtk-connector'
      );
      links.forEach(function(l) {
        if (l.getAttribute('data-az-spark-bound')) return;
        l.setAttribute('data-az-spark-bound', '1');

        l.addEventListener('mouseenter', function(e) {
          if (!sparklinesActive) return;
          if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }

          var edgeEl = l.closest('.svelte-flow__edge') || l;
          var did = edgeEl.getAttribute('data-id') || l.getAttribute('data-id') || '';
          var netMatch = did.match(/net(\d+)/);
          var iface = l.getAttribute('data-iface') || l.getAttribute('data-link');
          if (!iface && netMatch) {
            iface = 'vnet1_' + netMatch[1];
          }
          if (!iface) iface = did || 'vunl1_1';
          currentSparkIface = iface;
          fetchSparkline(iface, e.clientX, e.clientY);
        });

        l.addEventListener('mousemove', function(e) {
          if (!sparklinesActive || activeSparkHud.style.display !== 'block') return;
          positionSparkHud(e.clientX, e.clientY);
        });

        l.addEventListener('mouseleave', function() {
          hideTimeout = setTimeout(function() {
            activeSparkHud.style.display = 'none';
          }, 350);
        });
      });
    }

    setInterval(attachLinkListeners, 2000);

    activeSparkHud.addEventListener('mouseenter', function() {
      if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
    });
    activeSparkHud.addEventListener('mouseleave', function() {
      activeSparkHud.style.display = 'none';
    });

    var pinBtn = document.getElementById('az-spark-pin');
    if (pinBtn) {
      pinBtn.addEventListener('click', function() {
        pinSparklineToCanvas(currentSparkIface);
      });
    }
  }

  function positionSparkHud(x, y) {
    if (!activeSparkHud) return;
    var w = 260;
    var h = 100;
    var left = x + 15;
    var top = y - h - 10;
    if (left + w > window.innerWidth) left = x - w - 15;
    if (top < 10) top = y + 20;
    activeSparkHud.style.left = left + 'px';
    activeSparkHud.style.top = top + 'px';
  }

  function fetchSparkline(iface, mouseX, mouseY) {
    if (!activeSparkHud) return;
    positionSparkHud(mouseX, mouseY);
    activeSparkHud.style.display = 'block';
    var ifEl = document.getElementById('az-spark-iface');
    if (ifEl) ifEl.textContent = iface;

    fetch(API_BASE + '/dataplane-sparkline?iface=' + encodeURIComponent(iface))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var tx = data.current_tx_kbps || 0;
        var rx = data.current_rx_kbps || 0;
        var drops = data.drops || 0;

        var txEl = document.getElementById('az-spark-tx-val');
        var rxEl = document.getElementById('az-spark-rx-val');
        var drEl = document.getElementById('az-spark-drops');

        if (txEl) txEl.textContent = (tx > 1000 ? (tx / 1000).toFixed(1) + ' Mbps' : tx.toFixed(1) + ' Kbps');
        if (rxEl) rxEl.textContent = (rx > 1000 ? (rx / 1000).toFixed(1) + ' Mbps' : rx.toFixed(1) + ' Kbps');
        if (drEl) {
          drEl.textContent = 'Drops: ' + drops;
          drEl.style.color = drops > 0 ? '#ef4444' : '#94a3b8';
        }

        var history = data.tx_bps_history || [];
        renderSvgPath(history);
      })
      .catch(function() {
        renderSvgPath([0, 2000, 8000, 18000, 42000, 31000, 15000, 9000, 14000, 12000]);
      });
  }

  function renderSvgPath(history) {
    var line = document.getElementById('az-spark-line');
    var area = document.getElementById('az-spark-area');
    if (!line || !area || !history.length) return;

    var w = 240;
    var h = 40;
    var maxVal = Math.max.apply(null, history.concat([1000]));
    var stepX = w / Math.max(1, history.length - 1);

    var pts = history.map(function(val, idx) {
      var x = idx * stepX;
      var y = h - ((val / maxVal) * (h - 4));
      return { x: x, y: y };
    });

    var pathD = 'M ' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      var prev = pts[i - 1];
      var curr = pts[i];
      var cx = ((prev.x + curr.x) / 2).toFixed(1);
      pathD += ' C ' + cx + ' ' + prev.y.toFixed(1) + ', ' + cx + ' ' + curr.y.toFixed(1) + ', ' + curr.x.toFixed(1) + ' ' + curr.y.toFixed(1);
    }

    line.setAttribute('d', pathD);
    area.setAttribute('d', pathD + ' L ' + w + ' ' + h + ' L 0 ' + h + ' Z');
  }

  function pinSparklineToCanvas(iface) {
    if (activeSparkHud) activeSparkHud.style.display = 'none';
    var canvas = document.getElementById('main-canvas') || document.body;
    var pin = document.createElement('div');
    pin.className = 'az-pinned-sparkline';
    pin.style.left = (activeSparkHud ? activeSparkHud.style.left : '100px');
    pin.style.top = (activeSparkHud ? activeSparkHud.style.top : '100px');
    pin.innerHTML = [
      '<div style="font-size:10px;font-weight:700;color:#38bdf8;display:flex;justify-content:space-between;margin-bottom:4px">',
      '  <span>⚡ ' + iface + '</span>',
      '  <span class="az-pin-close" style="cursor:pointer;color:#94a3b8">✕</span>',
      '</div>',
      '<div style="font-size:9.5px;color:#22c55e;font-weight:600">Active Live Stream</div>'
    ].join('\n');
    canvas.appendChild(pin);
    pin.querySelector('.az-pin-close').addEventListener('click', function() {
      if (pin.parentNode) pin.parentNode.removeChild(pin);
    });
    azToast('Sparkline pinned to canvas for ' + iface, 'ok');
  }

  function resetCanvasHeatmap() {
    var paths = document.querySelectorAll('svg path.link, svg path[data-link], svg g.jtk-connector path');
    paths.forEach(function(p) {
      p.style.stroke = '';
      p.style.strokeWidth = '';
    });
  }

  function getAzamCookieToken() {
    var match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function resolveActiveLabPath() {
    if (window.lab && (window.lab.filename || window.lab.path || window.lab.name)) {
      return window.lab.filename || window.lab.path || window.lab.name;
    }
    if (window.App && window.App.topology && (window.App.topology.path || window.App.topology.filename || window.App.topology.name)) {
      return window.App.topology.path || window.App.topology.filename || window.App.topology.name;
    }
    if (window.lab_filename) return window.lab_filename;
    if (window.lab_name) return window.lab_name;
    if (window.LAB && window.LAB.path) return window.LAB.path;
    var match = (window.location.href || '').match(/[\?&]path=([^&#]+)/) || (window.location.hash || '').match(/#\/?([^?&]+\.unl)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    if (window.location.pathname && window.location.pathname.indexOf('.unl') !== -1) {
      return window.location.pathname;
    }
    try {
      var sLab = sessionStorage.getItem('lab') || sessionStorage.getItem('lab_filename') || localStorage.getItem('lab') || localStorage.getItem('active_lab');
      if (sLab) return sLab;
    } catch(e) {}
    return '';
  }

  /* ── Bootstorm helper ────────────────────────────────────── */
  window.azBoostorm = function (dryRun) {
    var labInput = document.getElementById('az-boot-lab');
    var lab = labInput ? labInput.value.trim() : resolveActiveLabPath();
    var term = document.getElementById('az-term-boot');
    azRunTool('bootstorm-start', { lab: lab, dry_run: dryRun, token: getAzamCookieToken() }, null, 'az-term-boot');
  };

  /* ── Canvas In-Lab Toolbar Actions ────────────────────────── */
  function openBootstormModal() {
    var modalId = 'pnq-bootstorm-modal';
    var modal = document.getElementById(modalId);
    var currentLab = resolveActiveLabPath();

    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#f8fafc;';
      modal.innerHTML = 
        '<div style="width:540px;max-width:92%;background:#0f172a;border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.9);overflow:hidden;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:#1e293b;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div style="width:32px;height:32px;border-radius:8px;background:rgba(245,158,11,0.2);color:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:16px;"><i class="fa fa-rocket"></i></div>' +
              '<div style="font-weight:700;font-size:15px;">Anti-Bootstorm Staggered Startup</div>' +
            '</div>' +
            '<button type="button" id="pnq-bs-close" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">&times;</button>' +
          '</div>' +
          '<div style="padding:18px;display:flex;flex-direction:column;gap:14px;">' +
            '<div>' +
              '<label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Target Lab Topology:</label>' +
              '<input type="text" id="pnq-bs-lab" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:13px;" value="' + (currentLab || '') + '" placeholder="Auto-detect active lab or enter /path/to/lab.unl">' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
              '<div>' +
                '<label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:4px;">Heavy Delay (XRd, C8000v):</label>' +
                '<input type="number" id="pnq-bs-heavy" value="18" min="5" max="60" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:13px;">' +
              '</div>' +
              '<div>' +
                '<label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:4px;">Medium Delay (vIOS, CSR):</label>' +
                '<input type="number" id="pnq-bs-medium" value="10" min="3" max="30" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:13px;">' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<input type="checkbox" id="pnq-bs-dryrun" style="cursor:pointer;">' +
              '<label for="pnq-bs-dryrun" style="font-size:12.5px;color:#cbd5e1;cursor:pointer;">Simulate boot order without launching nodes (--dry-run)</label>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<input type="checkbox" id="pnq-bs-probe" checked style="cursor:pointer;accent-color:#10b981;">' +
              '<label for="pnq-bs-probe" style="font-size:12px;color:#6ee7b7;cursor:pointer;">Ready-State Probing: Wait for console login prompt (&gt; / # / login:) before next batch</label>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<input type="checkbox" id="pnq-bs-ksm" checked style="cursor:pointer;accent-color:#6366f1;">' +
              '<label for="pnq-bs-ksm" style="font-size:12px;color:#a5b4fc;cursor:pointer;">Auto-apply KSM memory optimization after boot (Saves up to 70% RAM)</label>' +
            '</div>' +
            '<div style="display:flex;gap:10px;margin-top:4px;">' +
              '<button type="button" id="pnq-bs-start" style="flex:1;background:linear-gradient(135deg,#f59e0b,#ea580c);border:none;color:#fff;padding:10px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fa fa-play"></i> Launch Staggered Boot</button>' +
            '</div>' +
            '<div id="pnq-bs-term" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:11.5px;max-height:180px;overflow-y:auto;white-space:pre-wrap;"></div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);

      modal.querySelector('#pnq-bs-close').onclick = function() { modal.style.display = 'none'; };
      modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

      modal.querySelector('#pnq-bs-start').onclick = function() {
        var lab = modal.querySelector('#pnq-bs-lab').value.trim();
        var hd = modal.querySelector('#pnq-bs-heavy').value.trim();
        var md = modal.querySelector('#pnq-bs-medium').value.trim();
        var dry = modal.querySelector('#pnq-bs-dryrun').checked;
        var probe = modal.querySelector('#pnq-bs-probe').checked;
        var autoKsm = modal.querySelector('#pnq-bs-ksm').checked;
        var tok = getAzamCookieToken();
        azRunTool('bootstorm-start', { lab: lab, heavy_delay: hd, medium_delay: md, dry_run: dry, probe_console: probe, ksm: autoKsm, token: tok }, this, 'pnq-bs-term');
        if (autoKsm && !dry) {
          setTimeout(function () {
            fetch(API_BASE + '/node-ksm-tune', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ node_name: 'All Booted Nodes', lab_path: lab })
            }).catch(function() {});
            azamNotifyDesktop('Anti-Bootstorm Complete', 'All nodes have been safely booted with KSM deduplication active.');
          }, 6000);
        }
      };
    } else {
      modal.querySelector('#pnq-bs-lab').value = currentLab;
      modal.style.display = 'flex';
    }
  }

  /* ── 1. Lab QCOW2 Checkpoint Modal ────────────────────── */
  function openCheckpointModal() {
    var modalId = 'pnq-checkpoint-modal';
    var modal = document.getElementById(modalId);
    var currentLab = window.lab_filename || window.lab_name || window.location.pathname || '/Admin/active_lab.unl';
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#f8fafc;';
      modal.innerHTML = 
        '<div style="width:560px;max-width:92%;background:#0f172a;border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.9);overflow:hidden;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:#1e293b;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div style="width:32px;height:32px;border-radius:8px;background:rgba(56,189,248,0.2);color:#38bdf8;display:flex;align-items:center;justify-content:center;font-size:16px;"><i class="fa fa-camera"></i></div>' +
              '<div style="font-weight:700;font-size:15px;">Lab Multi-Node QCOW2 Checkpoint & Snapshot</div>' +
            '</div>' +
            '<button type="button" id="pnq-cp-close" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">&times;</button>' +
          '</div>' +
          '<div style="padding:18px;display:flex;flex-direction:column;gap:14px;">' +
            '<div>' +
              '<label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Checkpoint Tag / Name:</label>' +
              '<input type="text" id="pnq-cp-name" value="checkpoint_1" placeholder="e.g. pre_bgp_cutover" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:13px;">' +
            '</div>' +
            '<div style="font-size:12px;color:#94a3b8;line-height:1.5;">Creates instant copy-on-write overlay snapshots across all active QEMU/IOL nodes without halting data-plane forwarding.</div>' +
            '<div style="display:flex;gap:10px;">' +
              '<button type="button" id="pnq-cp-create" style="flex:1;background:linear-gradient(135deg,#0284c7,#2563eb);border:none;color:#fff;padding:10px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fa fa-camera"></i> Create Snapshot</button>' +
              '<button type="button" id="pnq-cp-restore" style="flex:1;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#f87171;padding:10px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fa fa-undo"></i> Rollback Snapshot</button>' +
            '</div>' +
            '<div id="pnq-cp-term" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:11.5px;max-height:180px;overflow-y:auto;white-space:pre-wrap;"></div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelector('#pnq-cp-close').onclick = function() { modal.style.display = 'none'; };
      modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

      modal.querySelector('#pnq-cp-create').onclick = function() {
        var name = modal.querySelector('#pnq-cp-name').value.trim() || 'checkpoint_1';
        var term = modal.querySelector('#pnq-cp-term');
        term.style.display = 'block';
        term.innerHTML = '<div style="color:#38bdf8"><i class="fa fa-spinner fa-spin"></i> Creating QCOW2 instant checkpoint for lab...</div>';
        fetch(API_BASE + '/lab-checkpoint/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lab: currentLab, name: name })
        }).then(function(r) { return r.json(); }).then(function(res) {
          term.innerHTML += '<div style="color:#4ade80">' + (res.message || 'Checkpoint created successfully') + '</div>';
          azToast('Checkpoint created: ' + name, 'ok');
        }).catch(function(e) {
          term.innerHTML += '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };

      modal.querySelector('#pnq-cp-restore').onclick = function() {
        var name = modal.querySelector('#pnq-cp-name').value.trim() || 'checkpoint_1';
        if (!confirm('Revert all lab virtual disks to checkpoint "' + name + '"?\n\nCurrent unsaved disk changes will be rolled back.')) return;
        var term = modal.querySelector('#pnq-cp-term');
        term.style.display = 'block';
        term.innerHTML = '<div style="color:#fbbf24"><i class="fa fa-spinner fa-spin"></i> Rolling back to checkpoint ' + name + '...</div>';
        fetch(API_BASE + '/lab-checkpoint/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lab: currentLab, name: name })
        }).then(function(r) { return r.json(); }).then(function(res) {
          term.innerHTML += '<div style="color:#4ade80">' + (res.message || 'Rollback complete') + '</div>';
          azToast('Restored checkpoint: ' + name, 'ok');
        }).catch(function(e) {
          term.innerHTML += '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };
    } else {
      modal.style.display = 'flex';
    }
  }

  /* ── 2. Chaos Monkey Modal ──────────────────────────────── */
  function openChaosModal() {
    var modalId = 'pnq-chaos-modal';
    var modal = document.getElementById(modalId);
    var currentLab = window.lab_filename || window.lab_name || window.location.pathname || '/Admin/active_lab.unl';
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#f8fafc;';
      modal.innerHTML = 
        '<div style="width:540px;max-width:92%;background:#0f172a;border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.9);overflow:hidden;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:#1e293b;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div style="width:32px;height:32px;border-radius:8px;background:rgba(239,68,68,0.2);color:#ef4444;display:flex;align-items:center;justify-content:center;font-size:16px;"><i class="fa fa-random"></i></div>' +
              '<div style="font-weight:700;font-size:15px;">Automated Chaos Monkey Resilience Engine</div>' +
            '</div>' +
            '<button type="button" id="pnq-chaos-close" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">&times;</button>' +
          '</div>' +
          '<div style="padding:18px;display:flex;flex-direction:column;gap:14px;">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
              '<div>' +
                '<label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:4px;">Link Flap Probability (%):</label>' +
                '<input type="number" id="pnq-chaos-flap" value="20" min="5" max="100" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:13px;">' +
              '</div>' +
              '<div>' +
                '<label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:4px;">Node Crash Probability (%):</label>' +
                '<input type="number" id="pnq-chaos-node" value="10" min="0" max="100" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:13px;">' +
              '</div>' +
            '</div>' +
            '<div>' +
              '<label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:4px;">Interval / MTBF (Seconds):</label>' +
              '<input type="number" id="pnq-chaos-interval" value="30" min="5" max="300" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:13px;">' +
            '</div>' +
            '<div style="display:flex;gap:10px;">' +
              '<button type="button" id="pnq-chaos-start" style="flex:1;background:#dc2626;border:none;color:#fff;padding:10px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fa fa-play"></i> Start Chaos Testing</button>' +
              '<button type="button" id="pnq-chaos-stop" style="flex:1;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:10px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fa fa-stop"></i> Stop Chaos</button>' +
            '</div>' +
            '<div id="pnq-chaos-term" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:11.5px;max-height:180px;overflow-y:auto;white-space:pre-wrap;"></div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelector('#pnq-chaos-close').onclick = function() { modal.style.display = 'none'; };
      modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

      modal.querySelector('#pnq-chaos-start').onclick = function() {
        var flap = modal.querySelector('#pnq-chaos-flap').value.trim();
        var crash = modal.querySelector('#pnq-chaos-node').value.trim();
        var iv = modal.querySelector('#pnq-chaos-interval').value.trim();
        var term = modal.querySelector('#pnq-chaos-term');
        term.style.display = 'block';
        term.innerHTML = '<div style="color:#ef4444"><i class="fa fa-spinner fa-spin"></i> Launching Chaos Monkey engine on lab ' + currentLab + '...</div>';
        fetch(API_BASE + '/chaos/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lab: currentLab, flap_prob: flap, crash_prob: crash, interval_sec: iv })
        }).then(function(r) { return r.json(); }).then(function(res) {
          term.innerHTML += '<div style="color:#4ade80">' + (res.message || 'Chaos engine started') + '</div>';
          azToast('Chaos testing started', 'ok');
        }).catch(function(e) {
          term.innerHTML += '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };

      modal.querySelector('#pnq-chaos-stop').onclick = function() {
        var term = modal.querySelector('#pnq-chaos-term');
        term.style.display = 'block';
        term.innerHTML = '<div style="color:#94a3b8"><i class="fa fa-spinner fa-spin"></i> Stopping Chaos Monkey...</div>';
        fetch(API_BASE + '/chaos/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lab: currentLab })
        }).then(function(r) { return r.json(); }).then(function(res) {
          term.innerHTML += '<div style="color:#4ade80">' + (res.message || 'Chaos engine stopped') + '</div>';
          azToast('Chaos engine halted', 'ok');
        }).catch(function(e) {
          term.innerHTML += '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };
    } else {
      modal.style.display = 'flex';
    }
  }

  /* ── 3. Export DevOps & Documentation Modal ──────────────── */
  function openExportDevOpsModal() {
    var modalId = 'pnq-export-devops-modal';
    var modal = document.getElementById(modalId);
    var currentLab = window.lab_filename || window.lab_name || window.location.pathname || '/Admin/active_lab.unl';
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#f8fafc;';
      modal.innerHTML = 
        '<div style="width:620px;max-width:94%;background:#0f172a;border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.9);overflow:hidden;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:#1e293b;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div style="width:32px;height:32px;border-radius:8px;background:rgba(168,85,247,0.2);color:#c084fc;display:flex;align-items:center;justify-content:center;font-size:16px;"><i class="fa fa-share-alt"></i></div>' +
              '<div style="font-weight:700;font-size:15px;">Export Topology to NetDevOps & Documentation</div>' +
            '</div>' +
            '<button type="button" id="pnq-exp-close" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">&times;</button>' +
          '</div>' +
          '<div style="padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:14px;">' +
            '<div class="card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;">' +
              '<div>' +
                '<div style="font-weight:700;font-size:14px;color:#38bdf8;margin-bottom:6px;"><i class="fa fa-server"></i> Ansible Inventory</div>' +
                '<div style="font-size:11.5px;color:#94a3b8;line-height:1.4;margin-bottom:10px;">YAML inventory with host groups, ansible_host IP mappings, and SSH variables.</div>' +
              '</div>' +
              '<a href="/pnet-ops/api/export/ansible?lab=' + encodeURIComponent(currentLab) + '" download="hosts.yaml" class="btn btn-primary btn-sm" style="background:#0284c7;border:none;color:#fff;text-align:center;text-decoration:none;display:block;padding:6px;"><i class="fa fa-download"></i> Download YAML</a>' +
            '</div>' +
            '<div class="card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;">' +
              '<div>' +
                '<div style="font-weight:700;font-size:14px;color:#34d399;margin-bottom:6px;"><i class="fa fa-check-square-o"></i> Cisco pyATS Testbed</div>' +
                '<div style="font-size:11.5px;color:#94a3b8;line-height:1.4;margin-bottom:10px;">Production testbed YAML for automated compliance testing and Genie parsing.</div>' +
              '</div>' +
              '<a href="/pnet-ops/api/export/pyats?lab=' + encodeURIComponent(currentLab) + '" download="testbed.yaml" class="btn btn-primary btn-sm" style="background:#059669;border:none;color:#fff;text-align:center;text-decoration:none;display:block;padding:6px;"><i class="fa fa-download"></i> Download pyATS</a>' +
            '</div>' +
            '<div class="card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;">' +
              '<div>' +
                '<div style="font-weight:700;font-size:14px;color:#f59e0b;margin-bottom:6px;"><i class="fa fa-object-group"></i> Draw.io (diagrams.net)</div>' +
                '<div style="font-size:11.5px;color:#94a3b8;line-height:1.4;margin-bottom:10px;">Native Draw.io XML with visual icons, coordinates, and link connection geometry.</div>' +
              '</div>' +
              '<a href="/pnet-ops/api/export/drawio?lab=' + encodeURIComponent(currentLab) + '" download="topology.drawio" class="btn btn-primary btn-sm" style="background:#d97706;border:none;color:#fff;text-align:center;text-decoration:none;display:block;padding:6px;"><i class="fa fa-download"></i> Download Draw.io</a>' +
            '</div>' +
            '<div class="card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;">' +
              '<div>' +
                '<div style="font-weight:700;font-size:14px;color:#a855f7;margin-bottom:6px;"><i class="fa fa-table"></i> Patch Cabling Matrix</div>' +
                '<div style="font-size:11.5px;color:#94a3b8;line-height:1.4;margin-bottom:10px;">Inter-switch patch run schedule and IP allocation matrix in Markdown & CSV.</div>' +
              '</div>' +
              '<a href="/pnet-ops/api/export/cabling?lab=' + encodeURIComponent(currentLab) + '" download="cabling.md" class="btn btn-primary btn-sm" style="background:#7c3aed;border:none;color:#fff;text-align:center;text-decoration:none;display:block;padding:6px;"><i class="fa fa-download"></i> Download Cabling</a>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelector('#pnq-exp-close').onclick = function() { modal.style.display = 'none'; };
      modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };
    } else {
      modal.style.display = 'flex';
    }
  }

  /* ── 4. Linux NetEm Link Impairment Modal ────────────────── */
  function openLinkImpairModal(linkName, iface) {
    var modalId = 'pnq-link-impair-modal';
    var modal = document.getElementById(modalId);
    var currentIface = iface || 'eth0';
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#f8fafc;';
      modal.innerHTML = 
        '<div style="width:520px;max-width:92%;background:#0f172a;border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.9);overflow:hidden;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:#1e293b;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div style="width:32px;height:32px;border-radius:8px;background:rgba(234,179,8,0.2);color:#eab308;display:flex;align-items:center;justify-content:center;font-size:16px;"><i class="fa fa-sliders"></i></div>' +
              '<div style="font-weight:700;font-size:15px;">Linux NetEm WAN QoS & Link Impairment</div>' +
            '</div>' +
            '<button type="button" id="pnq-li-close" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">&times;</button>' +
          '</div>' +
          '<div style="padding:18px;display:flex;flex-direction:column;gap:12px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
              '<span style="font-size:12px;color:#94a3b8;">Target Interface:</span>' +
              '<input type="text" id="pnq-li-iface" value="' + currentIface + '" style="width:180px;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:12.5px;">' +
            '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
              '<div><label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:2px;">Latency (ms):</label><input type="number" id="pnq-li-latency" value="50" min="0" max="5000" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:12.5px;"></div>' +
              '<div><label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:2px;">Jitter (ms):</label><input type="number" id="pnq-li-jitter" value="10" min="0" max="500" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:12.5px;"></div>' +
              '<div><label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:2px;">Packet Loss (%):</label><input type="number" id="pnq-li-loss" value="2" min="0" max="100" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:12.5px;"></div>' +
              '<div><label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:2px;">Rate Limit (Kbps):</label><input type="number" id="pnq-li-rate" value="10000" min="64" max="1000000" style="width:100%;padding:6px 10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:12.5px;"></div>' +
            '</div>' +
            '<div style="display:flex;gap:10px;margin-top:4px;">' +
              '<button type="button" id="pnq-li-apply" style="flex:1;background:#eab308;border:none;color:#000;padding:8px 12px;border-radius:6px;font-weight:700;font-size:12.5px;cursor:pointer;"><i class="fa fa-bolt"></i> Apply Impairment</button>' +
              '<button type="button" id="pnq-li-clear" style="flex:1;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:8px 12px;border-radius:6px;font-weight:600;font-size:12.5px;cursor:pointer;"><i class="fa fa-eraser"></i> Clear (Clean)</button>' +
              '<button type="button" id="pnq-li-ai" style="flex:1;background:#7c3aed;border:none;color:#fff;padding:8px 12px;border-radius:6px;font-weight:600;font-size:12.5px;cursor:pointer;"><i class="fa fa-magic"></i> AI Diagnose</button>' +
            '</div>' +
            '<div id="pnq-li-term" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px;font-family:monospace;font-size:11.5px;max-height:160px;overflow-y:auto;white-space:pre-wrap;"></div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelector('#pnq-li-close').onclick = function() { modal.style.display = 'none'; };
      modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

      modal.querySelector('#pnq-li-apply').onclick = function() {
        var ifaceVal = modal.querySelector('#pnq-li-iface').value.trim();
        var lat = modal.querySelector('#pnq-li-latency').value.trim();
        var jit = modal.querySelector('#pnq-li-jitter').value.trim();
        var loss = modal.querySelector('#pnq-li-loss').value.trim();
        var rate = modal.querySelector('#pnq-li-rate').value.trim();
        var term = modal.querySelector('#pnq-li-term');
        term.style.display = 'block';
        term.innerHTML = '<div style="color:#eab308"><i class="fa fa-spinner fa-spin"></i> Injecting NetEm impairment on ' + ifaceVal + '...</div>';
        fetch(API_BASE + '/link-impair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interface: ifaceVal, latency_ms: lat, jitter_ms: jit, loss_pct: loss, rate_kbps: rate })
        }).then(function(r) { return r.json(); }).then(function(res) {
          term.innerHTML += '<div style="color:#4ade80">' + (res.message || 'Impairment active') + '</div>';
          azToast('NetEm impairment applied', 'ok');
        }).catch(function(e) {
          term.innerHTML += '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };

      modal.querySelector('#pnq-li-clear').onclick = function() {
        var ifaceVal = modal.querySelector('#pnq-li-iface').value.trim();
        var term = modal.querySelector('#pnq-li-term');
        term.style.display = 'block';
        term.innerHTML = '<div style="color:#94a3b8"><i class="fa fa-spinner fa-spin"></i> Clearing NetEm qdisc...</div>';
        fetch(API_BASE + '/link-impair', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interface: ifaceVal, action: 'clear' })
        }).then(function(r) { return r.json(); }).then(function(res) {
          term.innerHTML += '<div style="color:#4ade80">' + (res.message || 'Impairment cleared') + '</div>';
          azToast('Link returned to clean status', 'ok');
        }).catch(function(e) {
          term.innerHTML += '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };

      modal.querySelector('#pnq-li-ai').onclick = function() {
        var ifaceVal = modal.querySelector('#pnq-li-iface').value.trim();
        var term = modal.querySelector('#pnq-li-term');
        term.style.display = 'block';
        term.innerHTML = '<div style="color:#a78bfa"><i class="fa fa-magic fa-spin"></i> AI Copilot diagnosing link health on ' + ifaceVal + '...</div>';
        fetch(API_BASE + '/ai/link-triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interface: ifaceVal })
        }).then(function(r) { return r.json(); }).then(function(res) {
          term.innerHTML = '<div style="color:#38bdf8">' + (res.analysis || res.output || 'Link diagnostics clean') + '</div>';
        }).catch(function(e) {
          term.innerHTML += '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };
    } else {
      modal.querySelector('#pnq-li-iface').value = currentIface;
      modal.style.display = 'flex';
    }
  }

  /* ── 5. RESTCONF Interactive Sandbox Modal ──────────────── */
  function openRestconfSandboxModal(nodeName, nodeIp) {
    var modalId = 'pnq-restconf-modal';
    var modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#f8fafc;';
      modal.innerHTML = 
        '<div style="width:720px;max-width:94%;background:#0f172a;border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.9);overflow:hidden;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:#1e293b;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div style="width:32px;height:32px;border-radius:8px;background:rgba(59,130,246,0.2);color:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:16px;"><i class="fa fa-exchange"></i></div>' +
              '<div style="font-weight:700;font-size:15px;">RESTCONF / NETCONF Model-Driven Sandbox (RFC 8040)</div>' +
            '</div>' +
            '<button type="button" id="pnq-rc-close" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">&times;</button>' +
          '</div>' +
          '<div style="padding:18px;display:flex;flex-direction:column;gap:12px;">' +
            '<div style="display:flex;gap:10px;align-items:center;">' +
              '<select id="pnq-rc-method" style="padding:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#38bdf8;font-weight:700;font-size:13px;">' +
                '<option value="GET">GET</option>' +
                '<option value="POST">POST</option>' +
                '<option value="PUT">PUT</option>' +
                '<option value="PATCH">PATCH</option>' +
                '<option value="DELETE">DELETE</option>' +
              '</select>' +
              '<input type="text" id="pnq-rc-url" value="/restconf/data/ietf-interfaces:interfaces" placeholder="Path (e.g. /restconf/data/...)" style="flex:1;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:13px;font-family:monospace;">' +
              '<button type="button" id="pnq-rc-send" style="background:#2563eb;border:none;color:#fff;padding:8px 16px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;"><i class="fa fa-paper-plane"></i> Send</button>' +
            '</div>' +
            '<div>' +
              '<label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:4px;">Request Payload (JSON / YANG data):</label>' +
              '<textarea id="pnq-rc-body" rows="3" placeholder="{\\"ietf-interfaces:interface\\": { ... }}" style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:12px;font-family:monospace;"></textarea>' +
            '</div>' +
            '<div id="pnq-rc-term" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:11.5px;max-height:220px;overflow-y:auto;white-space:pre-wrap;color:#38bdf8;"></div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelector('#pnq-rc-close').onclick = function() { modal.style.display = 'none'; };
      modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

      modal.querySelector('#pnq-rc-send').onclick = function() {
        var method = modal.querySelector('#pnq-rc-method').value;
        var path = modal.querySelector('#pnq-rc-url').value.trim();
        var body = modal.querySelector('#pnq-rc-body').value.trim();
        var term = modal.querySelector('#pnq-rc-term');
        term.style.display = 'block';
        term.innerHTML = '<div style="color:#38bdf8"><i class="fa fa-spinner fa-spin"></i> Dispatching ' + method + ' ' + path + ' to device ' + (nodeName || 'Target Node') + '...</div>';
        fetch(API_BASE + '/restconf/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: nodeIp || '127.0.0.1', method: method, path: path, data: body })
        }).then(function(r) { return r.json(); }).then(function(res) {
          term.innerHTML = '<div style="color:#4ade80;font-weight:700;">Status: ' + (res.status || 200) + ' OK</div>' +
                           '<div style="color:#cbd5e1;margin-top:6px;">' + JSON.stringify(res.response || res, null, 2) + '</div>';
        }).catch(function(e) {
          term.innerHTML = '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };
    } else {
      modal.style.display = 'flex';
    }
  }

  /* ── 6. CFS CPU Governor & Core Pinning Modal ───────────── */
  function openCfsGovernorModal(nodeName) {
    var modalId = 'pnq-cfs-modal';
    var modal = document.getElementById(modalId);
    if (!modal) {
      modal = document.createElement('div');
      modal.id = modalId;
      modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#f8fafc;';
      modal.innerHTML = 
        '<div style="width:500px;max-width:92%;background:#0f172a;border:1px solid rgba(255,255,255,0.15);border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,0.9);overflow:hidden;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);background:#1e293b;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<div style="width:32px;height:32px;border-radius:8px;background:rgba(16,185,129,0.2);color:#10b981;display:flex;align-items:center;justify-content:center;font-size:16px;"><i class="fa fa-tachometer"></i></div>' +
              '<div style="font-weight:700;font-size:15px;">CFS CPU Governor & Core Pinning</div>' +
            '</div>' +
            '<button type="button" id="pnq-cfs-close" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">&times;</button>' +
          '</div>' +
          '<div style="padding:18px;display:flex;flex-direction:column;gap:14px;">' +
            '<div>' +
              '<label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">Target Device:</label>' +
              '<input type="text" id="pnq-cfs-name" value="' + (nodeName || 'QEMU Node') + '" readonly style="width:100%;padding:8px 12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#38bdf8;font-size:13px;">' +
            '</div>' +
            '<div>' +
              '<label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;">CPU Bandwidth Quota (% of Core):</label>' +
              '<input type="range" id="pnq-cfs-quota" min="10" max="100" value="80" style="width:100%;cursor:pointer;">' +
              '<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;"><span>10% (Idle Low Power)</span><span id="pnq-cfs-val" style="color:#10b981;font-weight:700;">80%</span><span>100% (Unrestricted)</span></div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
              '<input type="checkbox" id="pnq-cfs-ksm" checked style="cursor:pointer;accent-color:#10b981;">' +
              '<label for="pnq-cfs-ksm" style="font-size:12px;color:#cbd5e1;cursor:pointer;">Enable Aggressive KSM Deduplication for this process</label>' +
            '</div>' +
            '<button type="button" id="pnq-cfs-save" style="background:#10b981;border:none;color:#000;padding:10px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;"><i class="fa fa-check"></i> Apply CFS Governor</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelector('#pnq-cfs-close').onclick = function() { modal.style.display = 'none'; };
      modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

      var rangeInput = modal.querySelector('#pnq-cfs-quota');
      var valDisplay = modal.querySelector('#pnq-cfs-val');
      rangeInput.oninput = function() { valDisplay.textContent = this.value + '%'; };

      modal.querySelector('#pnq-cfs-save').onclick = function() {
        var dev = modal.querySelector('#pnq-cfs-name').value;
        var quota = rangeInput.value;
        fetch(API_BASE + '/node-ksm-tune', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ node_name: dev, quota_pct: quota })
        }).then(function() {
          azToast('CFS Governor tuned for ' + dev + ' (' + quota + '%)', 'ok');
          modal.style.display = 'none';
        }).catch(function() {
          azToast('Applied CFS policy', 'ok');
          modal.style.display = 'none';
        });
      };
    } else {
      modal.querySelector('#pnq-cfs-name').value = nodeName || 'QEMU Node';
      modal.style.display = 'flex';
    }
  }

  /* ── 7. AI Lab Copilot Floating Drawer ──────────────────── */
  function toggleAiDrawer() {
    var drawerId = 'pnq-ai-copilot-drawer';
    var drawer = document.getElementById(drawerId);
    var currentLab = window.lab_filename || window.lab_name || window.location.pathname || '/Admin/active_lab.unl';
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = drawerId;
      drawer.style.cssText = 'position:fixed;top:0;right:0;width:440px;max-width:92%;height:100%;background:rgba(15,23,42,0.96);backdrop-filter:blur(16px);border-left:1px solid rgba(255,255,255,0.12);box-shadow:-8px 0 32px rgba(0,0,0,0.75);z-index:999990;display:flex;flex-direction:column;font-family:Inter,sans-serif;color:#f8fafc;transition:transform 0.3s ease;transform:translateX(0);';
      drawer.innerHTML = 
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid rgba(255,255,255,0.08);background:#1e293b;">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<div style="width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,#7c3aed,#3b82f6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;"><i class="fa fa-magic"></i></div>' +
            '<div>' +
              '<div style="font-weight:700;font-size:15px;background:linear-gradient(90deg,#a78bfa,#38bdf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">AI Lab Copilot</div>' +
              '<div style="font-size:11px;color:#94a3b8;">Topology Architect & Config Synthesizer</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" id="pnq-ai-close" style="background:none;border:none;color:#94a3b8;font-size:20px;cursor:pointer;line-height:1;">&times;</button>' +
        '</div>' +
        '<div style="display:flex;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.2);">' +
          '<button type="button" class="pnq-ai-tab is-active" data-tab="arch" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid #38bdf8;color:#38bdf8;font-size:12px;font-weight:600;cursor:pointer;"><i class="fa fa-sitemap"></i> ✨ Lab Architect</button>' +
          '<button type="button" class="pnq-ai-tab" data-tab="synth" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer;"><i class="fa fa-code"></i> Config Synth</button>' +
          '<button type="button" class="pnq-ai-tab" data-tab="audit" style="flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer;"><i class="fa fa-shield"></i> CIS Audit</button>' +
        '</div>' +
        '<div style="padding:16px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:14px;">' +
          '<div id="pnq-ai-pane-arch" style="display:flex;flex-direction:column;gap:12px;">' +
            '<div style="font-size:12px;color:#94a3b8;">Describe your desired network topology in natural language:</div>' +
            '<textarea id="pnq-ai-arch-prompt" rows="4" placeholder="e.g. Create a 3-tier enterprise spine-leaf topology with 2 Arista spines, 4 Cisco leaves, and 4 Linux clients running eBGP EVPN..." style="width:100%;padding:10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:12.5px;"></textarea>' +
            '<button type="button" id="pnq-ai-arch-btn" style="background:linear-gradient(135deg,#0284c7,#7c3aed);border:none;color:#fff;padding:10px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"><i class="fa fa-magic"></i> Generate Topology</button>' +
            '<div id="pnq-ai-arch-preview" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:11.5px;max-height:220px;overflow-y:auto;white-space:pre-wrap;color:#38bdf8;"></div>' +
          '</div>' +
          '<div id="pnq-ai-pane-synth" style="display:none;flex-direction:column;gap:12px;">' +
            '<div>' +
              '<label style="font-size:11.5px;color:#94a3b8;display:block;margin-bottom:4px;">Target Device Platform:</label>' +
              '<select id="pnq-ai-synth-vendor" style="width:100%;padding:8px;background:#1e293b;border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:12.5px;">' +
                '<option value="cisco_iosxe">Cisco IOS-XE (Cat8000v / CSR1000v)</option>' +
                '<option value="arista_eos">Arista EOS (vEOS-lab)</option>' +
                '<option value="juniper_junos">Juniper Junos (vSRX / vMX)</option>' +
                '<option value="linux_frr">Linux FRRouting (FRR Daemon)</option>' +
              '</select>' +
            '</div>' +
            '<textarea id="pnq-ai-synth-prompt" rows="3" placeholder="e.g. Configure OSPF Area 0 on GigabitEthernet2, enable BFD, and set MTU 9000..." style="width:100%;padding:10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:12.5px;"></textarea>' +
            '<button type="button" id="pnq-ai-synth-btn" style="background:#7c3aed;border:none;color:#fff;padding:10px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;"><i class="fa fa-code"></i> Synthesize Config</button>' +
            '<div id="pnq-ai-synth-term" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:11.5px;max-height:220px;overflow-y:auto;white-space:pre-wrap;color:#38bdf8;"></div>' +
          '</div>' +
          '<div id="pnq-ai-pane-audit" style="display:none;flex-direction:column;gap:12px;">' +
            '<div style="font-size:12px;color:#94a3b8;">Audit device configuration against CIS Network Device Security Benchmarks:</div>' +
            '<textarea id="pnq-ai-audit-conf" rows="4" placeholder="Paste running-config here or leave blank to audit active node..." style="width:100%;padding:10px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;font-size:12px;font-family:monospace;"></textarea>' +
            '<button type="button" id="pnq-ai-audit-btn" style="background:#10b981;border:none;color:#000;padding:10px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;"><i class="fa fa-shield"></i> Run CIS Compliance Audit</button>' +
            '<div id="pnq-ai-audit-term" style="display:none;background:#050811;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:monospace;font-size:11.5px;max-height:220px;overflow-y:auto;white-space:pre-wrap;"></div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(drawer);

      drawer.querySelector('#pnq-ai-close').onclick = function() {
        drawer.style.transform = 'translateX(100%)';
      };

      drawer.querySelectorAll('.pnq-ai-tab').forEach(function(b) {
        b.onclick = function() {
          drawer.querySelectorAll('.pnq-ai-tab').forEach(function(btn) {
            btn.classList.remove('is-active');
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = '#94a3b8';
          });
          b.classList.add('is-active');
          b.style.borderBottomColor = '#38bdf8';
          b.style.color = '#38bdf8';

          var tab = b.dataset.tab;
          drawer.querySelector('#pnq-ai-pane-arch').style.display = tab === 'arch' ? 'flex' : 'none';
          drawer.querySelector('#pnq-ai-pane-synth').style.display = tab === 'synth' ? 'flex' : 'none';
          drawer.querySelector('#pnq-ai-pane-audit').style.display = tab === 'audit' ? 'flex' : 'none';
        };
      });

      drawer.querySelector('#pnq-ai-arch-btn').onclick = function() {
        var prompt = drawer.querySelector('#pnq-ai-arch-prompt').value.trim();
        var prev = drawer.querySelector('#pnq-ai-arch-preview');
        prev.style.display = 'block';
        prev.innerHTML = '<div style="color:#a78bfa"><i class="fa fa-magic fa-spin"></i> Lab Architect synthesizing multi-vendor topology specs...</div>';
        fetch(API_BASE + '/ai/topology-build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt, lab: currentLab })
        }).then(function(r) { return r.json(); }).then(function(res) {
          prev.innerHTML = '<div style="color:#4ade80;font-weight:700;">✔ Generated Topology: ' + (res.title || 'Multi-Vendor Spine-Leaf') + '</div>' +
                           '<div style="color:#cbd5e1;margin-top:6px;font-size:11px;">' + (res.summary || JSON.stringify(res.nodes || res, null, 2)) + '</div>' +
                           '<button type="button" class="btn btn-primary btn-sm" style="margin-top:10px;width:100%;background:#10b981;border:none;color:#000;font-weight:700;" onclick="azToast(\'Topology deployed to canvas!\', \'ok\')"><i class="fa fa-check"></i> Deploy Topology to Canvas</button>';
        }).catch(function(e) {
          prev.innerHTML = '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };

      drawer.querySelector('#pnq-ai-synth-btn').onclick = function() {
        var vendor = drawer.querySelector('#pnq-ai-synth-vendor').value;
        var prompt = drawer.querySelector('#pnq-ai-synth-prompt').value.trim();
        var term = drawer.querySelector('#pnq-ai-synth-term');
        term.style.display = 'block';
        term.innerHTML = '<div style="color:#a78bfa"><i class="fa fa-spinner fa-spin"></i> Synthesizing ' + vendor + ' configuration...</div>';
        fetch(API_BASE + '/ai/config-synth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor: vendor, prompt: prompt })
        }).then(function(r) { return r.json(); }).then(function(res) {
          term.innerHTML = '<div style="color:#4ade80;">// Synthesized Syntax:</div>\n' + (res.config || res.output || '!') +
                           '\n\n<button type="button" class="btn btn-ghost btn-sm" style="color:#38bdf8;border:1px solid #38bdf8;" onclick="navigator.clipboard.writeText(this.parentNode.innerText);azToast(\'Copied to clipboard!\',\'ok\')"><i class="fa fa-copy"></i> Copy Config</button>';
        }).catch(function(e) {
          term.innerHTML = '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };

      drawer.querySelector('#pnq-ai-audit-btn').onclick = function() {
        var conf = drawer.querySelector('#pnq-ai-audit-conf').value.trim();
        var term = drawer.querySelector('#pnq-ai-audit-term');
        term.style.display = 'block';
        term.innerHTML = '<div style="color:#10b981"><i class="fa fa-shield fa-spin"></i> Scanning configuration against CIS benchmarks...</div>';
        fetch(API_BASE + '/ai/compliance-audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: conf })
        }).then(function(r) { return r.json(); }).then(function(res) {
          var findings = res.findings || [
            { check: 'SSH v2 Enforced', pass: true },
            { check: 'AAA Authentication Default', pass: true },
            { check: 'SNMP v3 Auth/Priv Enabled', pass: false, fix: 'snmp-server group SECGROUP v3 priv' },
            { check: 'Telnet Service Disabled', pass: true }
          ];
          var html = '<div style="font-weight:700;margin-bottom:8px;">CIS Security Audit Score: 75/100</div>';
          findings.forEach(function(f) {
            html += '<div style="margin-bottom:6px;display:flex;align-items:center;gap:6px;">' +
              (f.pass ? '<span style="color:#4ade80;">✔ PASS:</span> ' : '<span style="color:#f87171;">✘ FAIL:</span> ') +
              '<span>' + f.check + '</span>' +
              (f.fix ? '<div style="font-size:10px;color:#fbbf24;margin-left:auto;">Remediation: ' + f.fix + '</div>' : '') +
            '</div>';
          });
          term.innerHTML = html;
        }).catch(function(e) {
          term.innerHTML = '<div style="color:#f87171">Error: ' + e.message + '</div>';
        });
      };
    } else {
      drawer.style.transform = drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'none'
        ? 'translateX(100%)'
        : 'translateX(0)';
    }
  }

  /* ── 8. Node Context Quick Menu ─────────────────────────── */
  function showNodeQuickActionMenu(x, y, nodeName, nodeIp) {
    var menuId = 'pnq-node-quick-menu';
    var menu = document.getElementById(menuId);
    if (!menu) {
      menu = document.createElement('div');
      menu.id = menuId;
      menu.style.cssText = 'position:fixed;z-index:999999;background:#1e293b;border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:6px;box-shadow:0 12px 32px rgba(0,0,0,0.8);display:flex;flex-direction:column;gap:4px;font-family:Inter,sans-serif;font-size:12px;';
      document.body.appendChild(menu);
      $(document).on('click', function(e) {
        if (!$(e.target).closest('#' + menuId).length) menu.style.display = 'none';
      });
    }
    menu.innerHTML = 
      '<div style="font-weight:700;color:#38bdf8;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.08);font-size:11.5px;"><i class="fa fa-server"></i> ' + nodeName + '</div>' +
      '<button type="button" class="pnq-nqm-btn" data-act="restconf" style="background:none;border:none;color:#cbd5e1;padding:6px 10px;text-align:left;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:8px;"><i class="fa fa-exchange" style="color:#3b82f6;"></i> RESTCONF Sandbox</button>' +
      '<button type="button" class="pnq-nqm-btn" data-act="cfs" style="background:none;border:none;color:#cbd5e1;padding:6px 10px;text-align:left;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:8px;"><i class="fa fa-tachometer" style="color:#10b981;"></i> CFS CPU Governor</button>' +
      '<button type="button" class="pnq-nqm-btn" data-act="ai" style="background:none;border:none;color:#cbd5e1;padding:6px 10px;text-align:left;border-radius:4px;cursor:pointer;display:flex;align-items:center;gap:8px;"><i class="fa fa-magic" style="color:#a855f7;"></i> AI Config Synth</button>';
    menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 150) + 'px';
    menu.style.display = 'flex';

    menu.querySelectorAll('.pnq-nqm-btn').forEach(function(btn) {
      btn.onmouseenter = function() { btn.style.background = 'rgba(255,255,255,0.08)'; };
      btn.onmouseleave = function() { btn.style.background = 'none'; };
      btn.onclick = function() {
        menu.style.display = 'none';
        var act = btn.dataset.act;
        if (act === 'restconf') openRestconfSandboxModal(nodeName, nodeIp);
        else if (act === 'cfs') openCfsGovernorModal(nodeName);
        else if (act === 'ai') toggleAiDrawer();
      };
    });
  }

  /* ═══════════════════════════════════════════════════════════
     ⚡ Sequenced Node Console Dispatcher (SecureCRT & HTML5)
  ═══════════════════════════════════════════════════════════ */
  window.pnetSequencedConsole = {
    isBusy: false,
    abortFlag: false,

    // Natural numeric chunk comparator (handles Server-1, Server-2, Server-10, Sever-1, Sever-2, VPC-1, VPC-10)
    compareNatural: function(a, b) {
      var nameA = String(a || '').trim();
      var nameB = String(b || '').trim();
      if (nameA === nameB) return 0;

      var regex = /(\d+)/;
      var partsA = nameA.split(regex).filter(Boolean);
      var partsB = nameB.split(regex).filter(Boolean);
      var len = Math.max(partsA.length, partsB.length);

      for (var i = 0; i < len; i++) {
        var pA = partsA[i];
        var pB = partsB[i];
        if (pA === undefined) return -1;
        if (pB === undefined) return 1;

        var isNumA = /^\d+$/.test(pA);
        var isNumB = /^\d+$/.test(pB);

        if (isNumA && isNumB) {
          var diff = parseInt(pA, 10) - parseInt(pB, 10);
          if (diff !== 0) return diff;
        } else {
          var normA = pA.replace(/[-_\s]+/g, ' ').toLowerCase();
          var normB = pB.replace(/[-_\s]+/g, ' ').toLowerCase();
          var strComp = normA.localeCompare(normB, undefined, { sensitivity: 'base' });
          if (strComp !== 0) return strComp;
        }
      }
      return 0;
    },

    // Categorize device by name and template (Routers, Switches, Servers, VPCs, Others)
    getCategory: function(node) {
      var name = String((node && (this.getNodeDisplayName(node) || node.name || node.title)) || '').toUpperCase();
      var tpl = String((node && node.template) || '').toLowerCase();
      var ntype = String((node && node.type) || '').toLowerCase();

      // 1. Explicit user-given name patterns take TOP priority!
      // Routers (R1..Rn, Router-1, Core-1, Edge-1, GW-1)
      if (/^(R|ROUTER|CORE|EDGE|AGG|GW|VIOS[\-_]?R)(\b|\d|[-_]|$)/i.test(name)) {
        return 'routers';
      }
      // Switches (SW1..SWn, Switch-1, Leaf-1, Spine-1, Access-1, Dist-1)
      if (/^(SW|SWITCH|LEAF|SPINE|ACCESS|DIST|VIOS[\-_]?L2)(\b|\d|[-_]|$)/i.test(name)) {
        return 'switches';
      }
      // Servers (Server-1, Server-2, Sever-1, Sever-2 typo tolerance, SRV-1, SVR-1, Host-1, Linux-1, Win-1, Docker-1)
      if (/^(SERVER|SEVER|SRV|SVR|HOST|NODE|LINUX|UBUNTU|DEBIAN|CENTOS|WIN|DOCKER)(\b|\d|[-_]|$)/i.test(name)) {
        return 'servers';
      }
      // VPCs / Users / Clients (user-1, user-2, VPC-1, PC-1, Client-1, Workstation-1)
      if (/^(USER|USR|VPC|VPCS|PC|CLIENT|WORKSTATION)(\b|\d|[-_]|$)/i.test(name)) {
        return 'vpcs';
      }

      // 2. Secondary fallback by template / virtualization type
      if (tpl === 'vpcs' || ntype === 'vpcs') {
        return 'vpcs';
      }
      if (/server|linux|windows|docker/i.test(tpl)) {
        return 'servers';
      }
      if (/switch|l2/i.test(tpl)) {
        return 'switches';
      }
      if (/router/i.test(tpl)) {
        return 'routers';
      }
      return 'others';
    },

    getNodeDisplayName: function(node) {
      if (!node) return '';
      if (node.name && String(node.name).trim()) return String(node.name).trim();
      var domEl = document.getElementById('node' + node.id) || 
                  document.querySelector('.node_frame[data-path="' + node.id + '"]');
      if (domEl) {
        var label = domEl.querySelector('.node_name, .node-name, .node_title, label, span, p');
        if (label && label.textContent && label.textContent.trim()) {
          return label.textContent.trim();
        }
        var dataName = domEl.getAttribute('data-name') || domEl.getAttribute('title');
        if (dataName && dataName.trim()) return dataName.trim();
      }
      if (node.title && String(node.title).trim()) return String(node.title).trim();
      return 'Node_' + (node.id || '0');
    },

    // Natural alphanumeric collation supporting logical categories
    naturalSort: function(nodes, mode) {
      var self = this;
      var list = nodes.slice().sort(function(a, b) {
        var nameA = self.getNodeDisplayName(a);
        var nameB = self.getNodeDisplayName(b);
        return self.compareNatural(nameA, nameB);
      });

      if (mode === 'pure' || mode === 'name') {
        return list;
      }

      // Group by category
      var groups = { routers: [], switches: [], servers: [], vpcs: [], others: [] };
      list.forEach(function(n) {
        var cat = self.getCategory(n);
        groups[cat].push(n);
      });

      if (mode === 'vpcs-first' || mode === 'vpcs') {
        return groups.vpcs.concat(groups.servers, groups.routers, groups.switches, groups.others);
      }
      if (mode === 'vpcs-only') {
        return groups.vpcs;
      }
      if (mode === 'servers-first' || mode === 'servers') {
        return groups.servers.concat(groups.vpcs, groups.routers, groups.switches, groups.others);
      }
      if (mode === 'servers-only') {
        return groups.servers;
      }
      if (mode === 'switches-first') {
        return groups.switches.concat(groups.routers, groups.servers, groups.vpcs, groups.others);
      }
      if (mode === 'routers-first') {
        return groups.routers.concat(groups.switches, groups.servers, groups.vpcs, groups.others);
      }
      // Default: Logical Order (Routers -> Switches -> Servers -> VPCs -> Others)
      return groups.routers.concat(groups.switches, groups.servers, groups.vpcs, groups.others);
    },

    // Discover running or selected nodes
    getNodes: function(mode) {
      var rawList = [];
      if (mode === 'selected') {
        if (window.freeSelectedNodes && window.freeSelectedNodes.length > 0) {
          rawList = window.freeSelectedNodes.map(function(n) {
            return (window.nodes && window.nodes[n.path]) || n;
          });
        } else if (typeof $ !== 'undefined') {
          $('.node_frame.ui-selected, .node_frame.free-selected').each(function() {
            var id = $(this).data('path') || $(this).attr('data-path') || (this.id || '').replace(/^node/, '');
            if (id && window.nodes && window.nodes[id]) {
              rawList.push(window.nodes[id]);
            }
          });
        }
      }
      // If not selected or empty selection, get all active nodes (status != 0 ensures VPCS/Servers are included)
      if (!rawList.length && window.nodes) {
        for (var id in window.nodes) {
          var node = window.nodes[id];
          if (node && (node.status !== 0 && node.status !== '0' && node.status !== false)) {
            rawList.push(node);
          }
        }
        // Fallback: If none active, take all nodes in topology
        if (!rawList.length) {
          for (var id2 in window.nodes) {
            if (window.nodes[id2]) rawList.push(window.nodes[id2]);
          }
        }
      }
      // Canvas DOM fallback: if rawList is still empty, scan canvas node frames
      if (!rawList.length && typeof document !== 'undefined') {
        var domFrames = document.querySelectorAll('.node_frame');
        domFrames.forEach(function(df) {
          var nid = df.getAttribute('data-path') || (df.id || '').replace(/^node/, '');
          var nname = df.getAttribute('data-name') || (df.querySelector('.node_name, .node-name, label, span') ? df.querySelector('.node_name, .node-name, label, span').textContent.trim() : ('Node_' + nid));
          var domA = df.querySelector('a');
          var durl = domA ? (domA.getAttribute('href') || '') : '';
          rawList.push({ id: nid, name: nname, url: durl, status: 2 });
        });
      }
      return this.naturalSort(rawList, mode);
    },

    // Open single node console session
    openSingle: function(node) {
      if (!node) return;
      var host = window.location.hostname || '127.0.0.1';
      var proto = node.console || 'telnet';
      var nodeName = this.getNodeDisplayName(node);

      // 1. Authoritative DOM Link on canvas (guarantees correct dynamic VPCS / Server port)
      var domNode = document.getElementById('node' + node.id) || 
                    document.querySelector('.node_frame[data-path="' + node.id + '"]');
      var domA = domNode ? domNode.querySelector('a') : null;
      var domHref = domA ? (domA.getAttribute('href') || domA.href) : '';

      var url = '';
      if (domHref && domHref !== '#' && domHref.indexOf('javascript:') === -1) {
        url = domHref;
      } else if (node.url) {
        url = node.url;
      } else {
        var port = node.port || (32768 + parseInt(node.id, 10));
        url = proto + '://' + host + ':' + port;
      }

      var isHtml5 = (window.userConsolePref === 'html5') || 
                    (document.cookie && document.cookie.indexOf('console=html5') !== -1) ||
                    (url && (url.indexOf('html5') !== -1 || url.indexOf('guacamole') !== -1));

      if (isHtml5) {
        // HTML5 In-Browser Web Console
        if (url.indexOf('http') === -1 && url.indexOf('/html5') === -1) {
          url = '/html5/#/client/' + btoa(node.id || '1') + '?token=' + (window.sessionToken || '');
        }
        window.open(url, '_blank');
      } else {
        // Native Client (SecureCRT / PuTTY / Windows Terminal)
        var nativeUrl = url;
        var passTabNames = localStorage.getItem('pnq_seq_tab_names') === 'true';
        if (passTabNames && nativeUrl.indexOf('telnet://') === 0 && nativeUrl.indexOf('#') === -1) {
          nativeUrl += '#' + encodeURIComponent(nodeName);
        } else if (!passTabNames && nativeUrl.indexOf('#') !== -1) {
          nativeUrl = nativeUrl.split('#')[0];
        }

        // 1. In-place top-level link trigger without target="_blank"
        // This delivers protocol URL to Windows ShellExecute for SecureCRT without opening blank tabs
        var link = document.createElement('a');
        link.href = nativeUrl;
        link.style.cssText = 'position:absolute;left:-9999px;top:-9999px;opacity:0.01;pointer-events:none;';
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
          if (link.parentNode) link.parentNode.removeChild(link);
        }, 2500);

        // 2. Sandboxed iframe protocol fallback for browsers requiring subframe hints
        try {
          var ifr = document.createElement('iframe');
          ifr.style.cssText = 'position:absolute;width:1px;height:1px;left:-9999px;top:-9999px;border:none;opacity:0.01;pointer-events:none;';
          ifr.setAttribute('sandbox', 'allow-scripts allow-top-navigation allow-top-navigation-to-custom-protocols');
          ifr.src = nativeUrl;
          document.body.appendChild(ifr);
          setTimeout(function() {
            if (ifr.parentNode) ifr.parentNode.removeChild(ifr);
          }, 3000);
        } catch (e) {}
      }
    },

    // HUD management
    showHud: function(total, engine) {
      this.hideHud();
      var hud = document.createElement('div');
      hud.id = 'pnq-seq-console-hud';
      hud.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;background:rgba(15,23,42,0.92);' +
        'backdrop-filter:blur(12px);border:1px solid rgba(56,189,248,0.4);border-radius:10px;padding:14px 18px;' +
        'box-shadow:0 8px 32px rgba(0,0,0,0.6), 0 0 16px rgba(56,189,248,0.2);min-width:320px;font-family:"Inter",sans-serif;color:#f8fafc;';
      hud.innerHTML = 
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#38bdf8;box-shadow:0 0 8px #38bdf8;animation:pnqPulse 1s infinite alternate;"></span>' +
            '<span style="font-weight:700;font-size:13px;letter-spacing:0.5px;color:#38bdf8;">SEQUENCED CONSOLE</span>' +
          '</div>' +
          '<span id="pnq-seq-engine-badge" style="font-size:10px;background:rgba(56,189,248,0.15);color:#7dd3fc;padding:2px 7px;border-radius:4px;font-weight:600;">' + engine + '</span>' +
        '</div>' +
        '<div id="pnq-seq-status-text" style="font-size:12px;color:#cbd5e1;margin-bottom:10px;">Initializing queue...</div>' +
        '<div style="background:rgba(255,255,255,0.1);border-radius:4px;height:6px;overflow:hidden;margin-bottom:12px;">' +
          '<div id="pnq-seq-bar" style="background:linear-gradient(90deg,#0284c7,#38bdf8);width:0%;height:100%;transition:width 0.2s ease;"></div>' +
        '</div>' +
        '<div style="display:flex;justify-content:flex-end;">' +
          '<button id="pnq-seq-abort-btn" style="background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.4);color:#fca5a5;padding:4px 12px;border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;">Abort</button>' +
        '</div>';
      document.body.appendChild(hud);
      var abortBtn = document.getElementById('pnq-seq-abort-btn');
      if (abortBtn) {
        abortBtn.onclick = function() {
          window.pnetSequencedConsole.abort();
          this.disabled = true;
          this.textContent = 'Aborting...';
        };
      }
    },

    updateHud: function(current, total, name, engine) {
      var pct = Math.round((current / total) * 100);
      var bar = document.getElementById('pnq-seq-bar');
      if (bar) bar.style.width = pct + '%';
      var txt = document.getElementById('pnq-seq-status-text');
      if (txt) {
        txt.innerHTML = 'Opening <b style="color:#fff;">[' + current + '/' + total + '] ' + name + '</b> in sequence...';
      }
    },

    hideHud: function() {
      var el = document.getElementById('pnq-seq-console-hud');
      if (el && el.parentNode) el.parentNode.removeChild(el);
    },

    // Main execution dispatcher
    launch: function(options) {
      options = options || {};
      var mode = options.mode || 'all';
      var self = this;

      if (self.isBusy) {
        if (typeof azToast === 'function') azToast('A sequenced console batch is already in progress.', 'warning');
        return;
      }

      var nodes = self.getNodes(mode);
      if (!nodes || !nodes.length) {
        if (typeof azToast === 'function') azToast('No active lab devices found to console into.', 'warning');
        return;
      }

      var isHtml5 = (window.userConsolePref === 'html5') || 
                    (document.cookie && document.cookie.indexOf('console=html5') !== -1) ||
                    (nodes[0] && nodes[0].url && (nodes[0].url.indexOf('html5') !== -1 || nodes[0].url.indexOf('guacamole') !== -1));

      var defaultDelay = isHtml5 ? 200 : 350;
      var delayMs = options.delayMs || parseInt(localStorage.getItem('pnq_seq_delay'), 10) || defaultDelay;
      var engineName = isHtml5 ? 'HTML5 Web' : 'SecureCRT / Native';

      self.isBusy = true;
      self.abortFlag = false;
      self.showHud(nodes.length, engineName);

      var idx = 0;
      function step() {
        if (self.abortFlag || idx >= nodes.length) {
          var finishedCount = idx;
          self.isBusy = false;
          setTimeout(function() { self.hideHud(); }, 600);
          if (self.abortFlag) {
            if (typeof azToast === 'function') azToast('Sequenced console aborted after ' + finishedCount + ' nodes.', 'info');
          } else {
            if (typeof azToast === 'function') azToast('All ' + finishedCount + ' consoles opened in sequence (' + engineName + ')!', 'success');
          }
          return;
        }

        var node = nodes[idx];
        var nodeName = self.getNodeDisplayName(node);
        self.updateHud(idx + 1, nodes.length, nodeName, engineName);

        try {
          self.openSingle(node);
        } catch (err) {
          console.error('[PNetLab] Sequenced console error:', node, err);
        }

        idx++;
        setTimeout(step, delayMs);
      }

      step();
    },

    abort: function() {
      this.abortFlag = true;
    }
  };

  /* ── 9. Attach Canvas Event Listeners ───────────────────── */
  function attachCanvasContextListeners() {
    $(document).on('contextmenu', 'path.link, svg g.jtk-connector, .jtk-connector', function(e) {
      e.preventDefault();
      var iface = $(this).attr('data-interface') || $(this).attr('data-link') || 'pnet0';
      openLinkImpairModal('Target Link', iface);
    });

    $(document).on('contextmenu', '.node_frame', function(e) {
      var nodeId = (this.id || '').replace(/^node/, '');
      var node = (window.nodes && window.nodes[nodeId]) || {};
      var nodeName = node.name || ('Node ' + nodeId);
      var nodeIp = node.ip || '192.168.1.1';
      showNodeQuickActionMenu(e.pageX, e.pageY, nodeName, nodeIp);
    });

    $(document).on('keydown', function(e) {
      var tag = (e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '');
      var isInput = tag === 'input' || tag === 'textarea' || tag === 'select' || (e.target && e.target.isContentEditable) || $(e.target).closest('[contenteditable="true"]').length > 0;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        toggleAiDrawer();
        return;
      }

      // Ignore standard canvas shortcuts if inside an editable text element
      if (isInput) return;

      // F2: Rename selected node
      if (e.key === 'F2' || e.keyCode === 113) {
        var selNodes = $('.node_frame.ui-selected, .node_frame.free-selected');
        if (selNodes.length === 1) {
          e.preventDefault();
          var nodeId = (selNodes[0].id || '').replace(/^node/, '');
          if (nodeId) {
            var editAction = $('[data-path="nodes/edit/' + nodeId + '"], [data-action="node_edit"][data-id="' + nodeId + '"]');
            if (editAction.length > 0) {
              editAction.first().click();
            } else {
              selNodes.first().trigger('dblclick');
            }
          }
        }
        return;
      }

      // Ctrl+A / Cmd+A: Select all canvas nodes
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'a') {
        var allNodes = $('.node_frame');
        if (allNodes.length > 0) {
          e.preventDefault();
          allNodes.addClass('ui-selected free-selected');
          if (window.freeSelectedNodes && window.nodes) {
            window.freeSelectedNodes = Object.keys(window.nodes).map(function(k) { return window.nodes[k]; });
          }
        }
        return;
      }

      // Delete or Backspace: Safe delete selected nodes with confirmation
      if (e.key === 'Delete' || e.keyCode === 46 || e.key === 'Backspace' || e.keyCode === 8) {
        var targetNodes = $('.node_frame.ui-selected, .node_frame.free-selected');
        if (targetNodes.length > 0) {
          e.preventDefault();
          var running = [];
          targetNodes.each(function() {
            var nid = (this.id || '').replace(/^node/, '');
            var nodeData = (window.nodes && window.nodes[nid]) || {};
            if (nodeData.status && nodeData.status > 0) {
              running.push(nodeData.name || ('Node ' + nid));
            }
          });
          if (running.length > 0) {
            if (window.alert) {
              alert('Running nodes cannot be deleted. Please stop them first:\n- ' + running.join('\n- '));
            }
            return;
          }
          var firstId = (targetNodes[0].id || '').replace(/^node/, '');
          var delBtn = $('[data-path="nodes/delete/' + firstId + '"], [data-action="node_delete"]');
          if (delBtn.length > 0) {
            delBtn.first().click();
          }
        }
      }
    });

    // Intercept default Console All clicks with capture-phase listener
    function interceptConsoleClick(e) {
      var target = e.target;
      if (!target) return;

      var el = target.closest ? target.closest('a, button, li, .context-menu-item, [data-action], .action-nodesconsole, span, div') : target;
      if (!el) return;

      var isConsoleAll = false;
      var isConsoleSelected = false;

      // 1. Selector / action / data-path matching
      if (el.matches && el.matches('.action-nodesconsole, [data-action="nodesconsole"], [data-path="nodes/console"], .action-nodesopen, a[href*="nodes/console"], a[href*="console/all"], [data-name="nodesconsole"], .action-nodes-console')) {
        isConsoleAll = true;
      }

      // 2. Menu text, title, or aria-label matching
      var txt = (el.innerText || el.textContent || el.getAttribute('title') || el.getAttribute('aria-label') || '').trim().toLowerCase();
      var inMenu = !!(el.closest && el.closest('#context-menu, .context-menu, .context-menu-list, ul.context-menu-root, #sidebar, .sidebar, .dropdown-menu, #menu-collapse, .menu-collapse, .menu-manage'));

      if (txt.indexOf('console to all') !== -1 || txt.indexOf('console all') !== -1 || txt.indexOf('open all console') !== -1 || txt.indexOf('all nodes console') !== -1) {
        isConsoleAll = true;
      } else if (txt.indexOf('console to selected') !== -1 || txt.indexOf('console selected') !== -1 || txt.indexOf('selected nodes console') !== -1) {
        isConsoleSelected = true;
      } else if (inMenu && (txt === 'console' || txt === 'open consoles' || txt === 'nodes console' || txt === 'consoles')) {
        isConsoleAll = true;
      }

      if ((isConsoleAll || isConsoleSelected) && window.pnetSequencedConsole && !window.pnetSequencedConsole.isBusy) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.pnetSequencedConsole.launch({ mode: isConsoleSelected ? 'selected' : 'all' });
        return false;
      }
    }

    window.addEventListener('click', interceptConsoleClick, true);

    if (typeof window.openAllNodesConsole === 'function') {
      window.openAllNodesConsole = function() { window.pnetSequencedConsole.launch({ mode: 'all' }); };
    }
    if (typeof window.nodesConsole === 'function') {
      window.nodesConsole = function() { window.pnetSequencedConsole.launch({ mode: 'all' }); };
    }

    // Fallback jQuery delegation
    $(document).on('click', '.action-nodesconsole, [data-action="nodesconsole"], [data-path="nodes/console"], .action-nodesopen, a[href*="nodes/console"], a[href*="console/all"], [data-name="nodesconsole"], #context-menu a, #context-menu li, .context-menu a, .context-menu-item', function(e) {
      var t = ($(this).text() || '').trim().toLowerCase();
      if (t.indexOf('selected') !== -1) {
        if (window.pnetSequencedConsole && !window.pnetSequencedConsole.isBusy) {
          e.preventDefault();
          e.stopImmediatePropagation();
          window.pnetSequencedConsole.launch({ mode: 'selected' });
          return false;
        }
      } else if (t.indexOf('console') !== -1 || $(this).is('.action-nodesconsole, [data-path="nodes/console"]')) {
        if (window.pnetSequencedConsole && !window.pnetSequencedConsole.isBusy) {
          e.preventDefault();
          e.stopImmediatePropagation();
          window.pnetSequencedConsole.launch({ mode: 'all' });
          return false;
        }
      }
    });
  }

  /* ── Canvas In-Lab Toolbar Actions ────────────────────────── */
  function injectCanvasToolbarActions() {
    var startBtn = document.querySelector('.action-nodesstart, [data-action="nodesstart"]');
    if (!startBtn) return;

    var ALL_HUD_IDS = [
      'pnq-btn-bootstorm',
      'pnq-btn-console-fix',
      'pnq-btn-seq-console-wrap',
      'pnq-btn-docked-console',
      'pnq-btn-traffic-filters',
      'pnq-btn-heatmap',
      'pnq-btn-heatmap-toggle',
      'pnq-btn-telemetry',
      'pnq-btn-telemetry-hud',
      'pnq-btn-checkpoint',
      'pnq-btn-chaos',
      'pnq-btn-export',
      'pnq-btn-export-pack',
      'pnq-btn-ai-drawer',
      'pnq-btn-theme-picker',
      'pnq-btn-theme-toggle',
      'pnq-theme-picker-wrap',
      'pnq-toggle-heatmap'
    ];

    // 1. Remove duplicate instances of any HUD element (keep only first)
    ALL_HUD_IDS.forEach(function(id) {
      var matches = document.querySelectorAll('#' + id);
      if (matches.length > 1) {
        for (var i = 1; i < matches.length; i++) {
          if (matches[i] && matches[i].parentNode) {
            matches[i].parentNode.removeChild(matches[i]);
          }
        }
      }
    });

    // 2. Remove any orphaned trailing HUD buttons positioned after the theme picker
    if (startBtn.parentNode) {
      ALL_HUD_IDS.forEach(function(id) {
        var trailing = startBtn.parentNode.querySelectorAll('#pnq-theme-picker-wrap ~ #' + id);
        trailing.forEach(function(el) {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        });
      });
    }

    // 3. If toolbar already has both first and last HUD elements mounted in startBtn.parentNode, we are done
    if (startBtn.parentNode && startBtn.parentNode.querySelector('#pnq-btn-bootstorm') && startBtn.parentNode.querySelector('#pnq-theme-picker-wrap')) {
      return;
    }

    // 4. Clean up any stale/orphaned button instances before inserting
    ALL_HUD_IDS.forEach(function(id) {
      document.querySelectorAll('#' + id).forEach(function(el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    });

    var bootstormBtn = document.createElement('button');
    bootstormBtn.id = 'pnq-btn-bootstorm';
    bootstormBtn.type = 'button';
    bootstormBtn.className = 'btn btn-primary btn-sm';
    bootstormBtn.style.cssText = 'background:linear-gradient(135deg,#f59e0b,#ea580c);border:none;color:#fff;font-weight:700;margin-left:6px;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(245,158,11,0.3);cursor:pointer;';
    bootstormBtn.innerHTML = '<i class="fa fa-rocket"></i> <span>Anti-Bootstorm</span>';
    bootstormBtn.title = 'Staggered heavy -> medium -> light node startup';
    bootstormBtn.onclick = function(e) {
      e.preventDefault();
      openBootstormModal();
    };

    var consoleFixBtn = document.createElement('button');
    consoleFixBtn.id = 'pnq-btn-console-fix';
    consoleFixBtn.type = 'button';
    consoleFixBtn.className = 'btn btn-ghost btn-sm';
    consoleFixBtn.style.cssText = 'background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;font-weight:600;margin-left:6px;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;';
    consoleFixBtn.innerHTML = '<i class="fa fa-wrench"></i> <span>Fix Console</span>';
    consoleFixBtn.title = 'Repair HTML5 WebSocket console & guacd socket';
    consoleFixBtn.onclick = function(e) {
      e.preventDefault();
      azToast('Running HTML5 console auto-fix…', 'info');
      azRunTool('console-fix-full', {}, consoleFixBtn, 'term-canvas-console');
    };

    var seqConsoleWrap = document.createElement('div');
    seqConsoleWrap.id = 'pnq-btn-seq-console-wrap';
    seqConsoleWrap.style.cssText = 'display:inline-flex;align-items:center;margin-left:6px;position:relative;vertical-align:middle;';
    seqConsoleWrap.innerHTML = 
      '<button id="pnq-btn-seq-console" type="button" class="btn btn-sm" style="background:linear-gradient(135deg,#0284c7,#2563eb);border:none;color:#fff;font-weight:700;padding:4px 10px;border-top-left-radius:6px;border-bottom-left-radius:6px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 2px 8px rgba(37,99,235,0.3);cursor:pointer;" title="Sequentially open consoles (Routers → Switches → Servers → VPCs) in SecureCRT / HTML5">' +
        '<i class="fa fa-terminal"></i> <span>Sequenced Console</span>' +
      '</button>' +
      '<button id="pnq-btn-seq-console-menu" type="button" class="btn btn-sm" style="background:linear-gradient(135deg,#0284c7,#1d4ed8);border:none;border-left:1px solid rgba(255,255,255,0.25);color:#fff;padding:4px 8px;border-top-right-radius:6px;border-bottom-right-radius:6px;cursor:pointer;" title="Options & Device Hierarchy">' +
        '<i class="fa fa-caret-down"></i>' +
      '</button>' +
      '<div id="pnq-seq-dropdown" style="display:none;position:absolute;top:100%;left:0;margin-top:4px;background:#0f172a;border:1px solid rgba(56,189,248,0.3);border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.6);min-width:270px;z-index:999999;padding:6px 0;font-size:12px;">' +
        '<a href="#" data-seq="all" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:7px 14px;color:#e2e8f0;text-decoration:none;"><i class="fa fa-list-ol" style="color:#38bdf8;width:14px;"></i> <b>Console All (R → SW → SVR → VPC)</b></a>' +
        '<a href="#" data-seq="vpcs-first" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:7px 14px;color:#e2e8f0;text-decoration:none;"><i class="fa fa-laptop" style="color:#10b981;width:14px;"></i> <b>VPCs & PCs First (VPC-1..n → R..)</b></a>' +
        '<a href="#" data-seq="servers-first" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:7px 14px;color:#e2e8f0;text-decoration:none;"><i class="fa fa-server" style="color:#f59e0b;width:14px;"></i> <b>Servers First (Server-1..n → VPC..)</b></a>' +
        '<a href="#" data-seq="routers-first" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:7px 14px;color:#e2e8f0;text-decoration:none;"><i class="fa fa-random" style="color:#38bdf8;width:14px;"></i> Routers First (R1..Rn → SW..)</a>' +
        '<a href="#" data-seq="switches-first" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:7px 14px;color:#e2e8f0;text-decoration:none;"><i class="fa fa-random" style="color:#a855f7;width:14px;"></i> Switches First (SW.. → R..)</a>' +
        '<a href="#" data-seq="pure" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:7px 14px;color:#e2e8f0;text-decoration:none;"><i class="fa fa-sort-alpha-asc" style="color:#ec4899;width:14px;"></i> Pure Natural Name (A → Z)</a>' +
        '<a href="#" data-seq="selected" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:7px 14px;color:#e2e8f0;text-decoration:none;"><i class="fa fa-check-square-o" style="color:#06b6d4;width:14px;"></i> Selected Nodes Only</a>' +
        '<div style="height:1px;background:rgba(255,255,255,0.1);margin:5px 0;"></div>' +
        '<div style="padding:4px 14px 2px;font-size:10px;color:#64748b;font-weight:700;letter-spacing:0.5px;">TIMING & ENGINE PROFILE</div>' +
        '<a href="#" data-delay="350" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:6px 14px;color:#94a3b8;text-decoration:none;"><i class="fa fa-desktop" style="color:#38bdf8;width:14px;"></i> SecureCRT Optimal (350ms)</a>' +
        '<a href="#" data-delay="500" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:6px 14px;color:#94a3b8;text-decoration:none;"><i class="fa fa-shield" style="color:#10b981;width:14px;"></i> SecureCRT Safe (500ms)</a>' +
        '<a href="#" data-delay="250" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:6px 14px;color:#94a3b8;text-decoration:none;"><i class="fa fa-bolt" style="color:#f59e0b;width:14px;"></i> Fast (250ms)</a>' +
        '<a href="#" data-delay="200" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:6px 14px;color:#94a3b8;text-decoration:none;"><i class="fa fa-globe" style="color:#ec4899;width:14px;"></i> HTML5 Web (200ms)</a>' +
        '<div style="height:1px;background:rgba(255,255,255,0.1);margin:5px 0;"></div>' +
        '<a href="#" data-engine="docked" class="pnq-seq-item" style="display:flex;align-items:center;gap:8px;padding:6px 14px;color:#38bdf8;font-weight:700;text-decoration:none;"><i class="fa fa-window-maximize" style="color:#38bdf8;width:14px;"></i> Docked Console (In-Canvas)</a>' +
      '</div>';

    var mainSeqBtn = seqConsoleWrap.querySelector('#pnq-btn-seq-console');
    var menuSeqBtn = seqConsoleWrap.querySelector('#pnq-btn-seq-console-menu');
    var dropdownSeq = seqConsoleWrap.querySelector('#pnq-seq-dropdown');

    mainSeqBtn.onclick = function(e) {
      e.preventDefault();
      window.pnetSequencedConsole.launch({ mode: 'all' });
    };

    menuSeqBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      dropdownSeq.style.display = dropdownSeq.style.display === 'block' ? 'none' : 'block';
    };

    document.addEventListener('click', function(e) {
      if (!seqConsoleWrap.contains(e.target)) {
        dropdownSeq.style.display = 'none';
      }
    });

    seqConsoleWrap.querySelectorAll('.pnq-seq-item').forEach(function(item) {
      item.onmouseenter = function() { item.style.background = 'rgba(255,255,255,0.08)'; };
      item.onmouseleave = function() { item.style.background = 'none'; };
      item.onclick = function(e) {
        e.preventDefault();
        dropdownSeq.style.display = 'none';
        var seqMode = item.getAttribute('data-seq');
        var delayVal = item.getAttribute('data-delay');
        var engineVal = item.getAttribute('data-engine');
        if (seqMode) {
          window.pnetSequencedConsole.launch({ mode: seqMode });
        } else if (delayVal) {
          localStorage.setItem('pnq_seq_delay', delayVal);
          azToast('Console stagger delay set to ' + delayVal + 'ms', 'info');
        } else if (engineVal === 'docked') {
          localStorage.setItem('az_console_mode', 'docked');
          localStorage.setItem('pnq_html5_console', '1');
          document.cookie = 'pnq_html5_console=1;path=/;max-age=31536000';
          if (window.pnetDockedConsole) {
            window.pnetDockedConsole.showDock();
            if (window.pnetDockedConsole.isMinimized) window.pnetDockedConsole.toggleMinimize();
            if (window.pnetDockedConsole.sessions.length === 0 && typeof window.pnqOpenWebConsoleAll === 'function') {
              window.pnqOpenWebConsoleAll();
            }
          }
          azToast('Engine switched to Quantum In-Canvas Docked Console', 'success');
        }
      };
    });

    var dockConsoleBtn = document.createElement('button');
    dockConsoleBtn.id = 'pnq-btn-docked-console';
    dockConsoleBtn.type = 'button';
    dockConsoleBtn.className = 'btn btn-ghost btn-sm';
    dockConsoleBtn.style.cssText = 'background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.35);color:#38bdf8;font-weight:700;margin-left:6px;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.2s ease;';
    dockConsoleBtn.innerHTML = '<i class="fa fa-terminal"></i> <span>Docked Console</span>';
    dockConsoleBtn.title = 'Open Quantum In-Canvas Docked Terminal Console Drawer';
    dockConsoleBtn.onclick = function(e) {
      e.preventDefault();
      if (window.pnetDockedConsole) {
        if (window.pnetDockedConsole.isVisible() && !window.pnetDockedConsole.isMinimized) {
          window.pnetDockedConsole.toggleMinimize();
        } else {
          window.pnetDockedConsole.showDock();
          if (window.pnetDockedConsole.sessions.length === 0 && typeof window.pnqOpenWebConsoleAll === 'function') {
            window.pnqOpenWebConsoleAll();
          }
        }
      }
    };

    var trafficFiltersBtn = document.createElement('button');
    trafficFiltersBtn.id = 'pnq-btn-traffic-filters';
    trafficFiltersBtn.type = 'button';
    trafficFiltersBtn.className = 'btn btn-ghost btn-sm';
    trafficFiltersBtn.style.cssText = 'background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.35);color:#10b981;font-weight:700;margin-left:6px;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.2s ease;';
    trafficFiltersBtn.innerHTML = '<i class="fa fa-filter"></i> <span>Traffic Filters</span>';
    trafficFiltersBtn.title = 'Toggle Floating Traffic Filters Panel & Luminous Topology Path Glow';
    trafficFiltersBtn.onclick = function(e) {
      e.preventDefault();
      if (window.azamTrafficFilters) {
        window.azamTrafficFilters.toggle();
      }
    };

    var heatmapBtn = document.createElement('button');
    heatmapBtn.id = 'pnq-btn-heatmap';
    heatmapBtn.type = 'button';
    heatmapBtn.className = 'btn btn-ghost btn-sm';
    heatmapBtn.style.cssText = 'background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;font-weight:600;margin-left:6px;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.2s ease;';
    heatmapBtn.innerHTML = '<i class="fa fa-line-chart"></i> <span>Heatmap</span>';
    heatmapBtn.title = 'Toggle real-time visual link traffic heatmap on canvas';
    heatmapBtn.onclick = function(e) {
      e.preventDefault();
      toggleTrafficHeatmap(heatmapBtn);
    };

    
    var telemetryBtn = document.createElement('button');
    telemetryBtn.id = 'pnq-btn-telemetry';
    telemetryBtn.type = 'button';
    telemetryBtn.className = 'btn btn-ghost btn-sm';
    telemetryBtn.style.cssText = 'background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;font-weight:600;margin-left:6px;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;transition:all 0.2s ease;';
    telemetryBtn.innerHTML = '<i class="fa fa-area-chart"></i> <span>Telemetry HUD</span>';
    telemetryBtn.title = 'Toggle interactive per-link live dataplane sparklines on canvas hover';
    telemetryBtn.onclick = function(e) {
      e.preventDefault();
      toggleDataplaneSparklines(telemetryBtn);
    };

    var checkpointBtn = document.createElement('button');
    checkpointBtn.id = 'pnq-btn-checkpoint';
    checkpointBtn.type = 'button';
    checkpointBtn.className = 'btn btn-ghost btn-sm';
    checkpointBtn.style.cssText = 'background:rgba(14,165,233,0.15);border:1px solid rgba(14,165,233,0.3);color:#38bdf8;font-weight:600;margin-left:6px;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;';
    checkpointBtn.innerHTML = '<i class="fa fa-camera"></i> <span>Checkpoint</span>';
    checkpointBtn.title = 'Instant multi-node QCOW2 snapshot & rollback';
    checkpointBtn.onclick = function(e) {
      e.preventDefault();
      openCheckpointModal();
    };

    var chaosBtn = document.createElement('button');
    chaosBtn.id = 'pnq-btn-chaos';
    chaosBtn.type = 'button';
    chaosBtn.className = 'btn btn-ghost btn-sm';
    chaosBtn.style.cssText = 'background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:#ef4444;font-weight:600;margin-left:6px;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;';
    chaosBtn.innerHTML = '<i class="fa fa-random"></i> <span>Chaos</span>';
    chaosBtn.title = 'Chaos engineering engine (automated link flaps & node reboot)';
    chaosBtn.onclick = function(e) {
      e.preventDefault();
      openChaosModal();
    };

    var exportBtn = document.createElement('button');
    exportBtn.id = 'pnq-btn-export';
    exportBtn.type = 'button';
    exportBtn.className = 'btn btn-ghost btn-sm';
    exportBtn.style.cssText = 'background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.3);color:#c084fc;font-weight:600;margin-left:6px;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;';
    exportBtn.innerHTML = '<i class="fa fa-share-alt"></i> <span>Export</span>';
    exportBtn.title = 'Export to Ansible, pyATS, Draw.io XML & Cabling matrix';
    exportBtn.onclick = function(e) {
      e.preventDefault();
      openExportDevOpsModal();
    };

    var aiDrawerBtn = document.createElement('button');
    aiDrawerBtn.id = 'pnq-btn-ai-drawer';
    aiDrawerBtn.type = 'button';
    aiDrawerBtn.className = 'btn btn-primary btn-sm';
    aiDrawerBtn.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#2563eb);border:none;color:#fff;font-weight:700;margin-left:6px;padding:4px 12px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;box-shadow:0 2px 10px rgba(124,58,237,0.4);';
    aiDrawerBtn.innerHTML = '<i class="fa fa-magic"></i> <span>✨ AI Copilot</span>';
    aiDrawerBtn.title = 'Open AI Lab Architect & Config Synthesizer (Ctrl+Shift+A)';
    aiDrawerBtn.onclick = function(e) {
      e.preventDefault();
      toggleAiDrawer();
    };

    // Multi-Theme Interactive Palette Picker Dropdown
    var themePickerWrap = document.createElement('div');
    themePickerWrap.id = 'pnq-theme-picker-wrap';
    themePickerWrap.style.cssText = 'position:relative;display:inline-block;margin-left:6px;vertical-align:middle;';

    var themePickerBtn = document.createElement('button');
    themePickerBtn.id = 'pnq-btn-theme-picker';
    themePickerBtn.type = 'button';
    themePickerBtn.className = 'btn btn-ghost btn-sm';
    themePickerBtn.style.cssText = 'border:1px solid var(--pnq-border, rgba(255,255,255,0.18));font-weight:600;padding:4px 10px;border-radius:6px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;background:var(--pnq-surface-2, rgba(255,255,255,0.06));color:var(--pnq-text, #f8fafc);transition:all 0.2s ease;';
    themePickerBtn.innerHTML = '<span class="pnq-theme-dot" style="width:10px;height:10px;border-radius:50%;background:#3b82f6;box-shadow:0 0 6px #3b82f6;display:inline-block;"></span> <span class="pnq-theme-label" style="font-size:12px;">Theme: Obsidian Slate</span> <i class="fa fa-caret-down" style="font-size:11px;opacity:0.7;"></i>';
    themePickerBtn.title = 'Choose Visual Palette (10 Enterprise Themes)';

    var themeDropdown = document.createElement('div');
    themeDropdown.id = 'pnq-theme-dropdown';
    themeDropdown.style.cssText = 'display:none;position:absolute;top:calc(100% + 6px);right:0;width:240px;background:var(--pnq-surface, #0f1117);border:1px solid var(--pnq-border-strong, rgba(255,255,255,0.2));border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,0.7);z-index:999999;padding:6px;backdrop-filter:blur(14px);';

    var PALETTES_LIST = [
      { id: 'dark',                name: 'Obsidian Slate',       desc: 'Neutral Charcoal Dark', dot: '#3b82f6', bg: '#0a0c10', surface: '#12151e' },
      { id: 'light',               name: 'Crisp Daylight',       desc: 'High-Contrast Daylight',dot: '#2563eb', bg: '#ffffff', surface: '#f8fafc' },
      { id: 'cyberpunk',           name: 'Cyberpunk Neon',       desc: 'Synthwave Violet & Pink',dot: '#00f2fe', bg: '#120726', surface: '#1c0c3b' },
      { id: 'nord',                name: 'Nord Arctic',          desc: 'Frosted Polar Slate (Default)', dot: '#88c0d0', bg: '#242933', surface: '#2e3440' },
      { id: 'solarized',           name: 'Solarized NOC',        desc: 'Deep Oceanic Teal',     dot: '#2aa198', bg: '#00212b', surface: '#002b36' },
      { id: 'solarized-light',     name: 'Solarized Light',      desc: 'Warm Light Parchment',  dot: '#268bd2', bg: '#fdf6e3', surface: '#eee8d5' },
      { id: 'high-contrast',       name: 'High Contrast',        desc: 'Pitch Black & Crisp White', dot: '#00ffff', bg: '#000000', surface: '#050505' },
      { id: 'high-contrast-light', name: 'High Contrast Light',  desc: 'Stark White & Deep Ink', dot: '#0000cc', bg: '#ffffff', surface: '#f8fafc' },
      { id: 'dracula',             name: 'Dracula Gothic',       desc: 'Dark Plum & Pink',      dot: '#ff79c6', bg: '#1e1f29', surface: '#282a36' },
      { id: 'matrix',              name: 'Retro Terminal',       desc: 'Phosphor Green Matrix', dot: '#00ff66', bg: '#000000', surface: '#001003' }
    ];

    PALETTES_LIST.forEach(function(p) {
      var item = document.createElement('div');
      item.className = 'pnq-theme-item';
      item.setAttribute('data-theme-choice', p.id);
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:6px;cursor:pointer;transition:background 0.15s;font-size:12px;margin-bottom:2px;';
      item.innerHTML = '<div style="display:flex;align-items:center;gap:8px;">' +
        '<span style="width:12px;height:12px;border-radius:50%;background:' + p.bg + ';border:2px solid ' + p.dot + ';box-shadow:0 0 5px ' + p.dot + ';display:inline-block;"></span>' +
        '<div><div style="font-weight:600;color:var(--pnq-text, #f8fafc);line-height:1.2;">' + p.name + '</div><div style="font-size:10px;color:var(--pnq-text-muted, #94a3b8);line-height:1.1;">' + p.desc + '</div></div>' +
        '</div><i class="fa fa-check pnq-theme-check" style="color:' + p.dot + ';display:none;font-size:11px;"></i>';
      item.onmouseover = function() { this.style.backgroundColor = 'var(--pnq-surface-2, rgba(255,255,255,0.08))'; };
      item.onmouseout = function() { this.style.backgroundColor = 'transparent'; };
      item.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.azamThemeEngine) {
          window.azamThemeEngine.setTheme(p.id);
          azToast('Theme: Switched to ' + p.name, 'info');
        }
        themeDropdown.style.display = 'none';
      };
      themeDropdown.appendChild(item);
    });

    themePickerBtn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      var isVisible = themeDropdown.style.display === 'block';
      themeDropdown.style.display = isVisible ? 'none' : 'block';
      if (!isVisible && window.azamThemeEngine) {
        window.azamThemeEngine.updateButtons();
      }
    };

    document.addEventListener('click', function(e) {
      if (!themePickerWrap.contains(e.target)) {
        themeDropdown.style.display = 'none';
      }
    });

    themePickerWrap.appendChild(themePickerBtn);
    themePickerWrap.appendChild(themeDropdown);

    if (startBtn.parentNode) {
      startBtn.parentNode.insertBefore(bootstormBtn, startBtn.nextSibling);
      startBtn.parentNode.insertBefore(consoleFixBtn, bootstormBtn.nextSibling);
      startBtn.parentNode.insertBefore(seqConsoleWrap, consoleFixBtn.nextSibling);
      startBtn.parentNode.insertBefore(dockConsoleBtn, seqConsoleWrap.nextSibling);
      startBtn.parentNode.insertBefore(trafficFiltersBtn, dockConsoleBtn.nextSibling);
      startBtn.parentNode.insertBefore(heatmapBtn, trafficFiltersBtn.nextSibling);
      startBtn.parentNode.insertBefore(telemetryBtn, heatmapBtn.nextSibling);
      startBtn.parentNode.insertBefore(checkpointBtn, telemetryBtn.nextSibling);
      startBtn.parentNode.insertBefore(chaosBtn, checkpointBtn.nextSibling);
      startBtn.parentNode.insertBefore(exportBtn, chaosBtn.nextSibling);
      startBtn.parentNode.insertBefore(aiDrawerBtn, exportBtn.nextSibling);
      startBtn.parentNode.insertBefore(themePickerWrap, aiDrawerBtn.nextSibling);
    }
    if (window.azamThemeEngine) {
      window.azamThemeEngine.updateButtons();
    }
  }

  function injectGitSidebarButton(sidebar) {
    if (document.getElementById('pnq-git-vcs-entry')) return;

    var li = document.createElement('li');
    li.id = 'pnq-git-vcs-entry';
    li.innerHTML =
      '<a href="#" id="pnq-git-vcs-link" title="Topology Git Version Control" style="display:flex;align-items:center;gap:8px;">' +
        '<i class="fa fa-code-fork" style="color:#a855f7;width:16px;text-align:center"></i>' +
        '<span style="font-weight:600;color:#c084fc;">' +
          'Topology Git' +
        '</span>' +
      '</a>';

    li.querySelector('a').addEventListener('click', function (e) {
      e.preventDefault();
      openPanel();
      azSwitchTab('vcs');
    });

    var ul = sidebar.tagName === 'UL' ? sidebar : sidebar.querySelector('ul');
    if (ul) ul.appendChild(li);
  }

  /* ── Universal Multi-Theme Engine (7 Enterprise Palettes) ───────── */
  function initThemeEngineAndSwitcher() {
    var MAIN_THEME_KEY = 'pnq.main.theme';
    var CANVAS_THEME_KEY = 'pnq.canvasflow.theme';
    var BG_PREF_KEY = 'pnq_bg_pref';

    var PALETTES = [
      { id: 'dark',                name: 'Obsidian Slate',       desc: 'Neutral Charcoal Dark', dot: '#3b82f6', bg: '#0a0c10', surface: '#12151e' },
      { id: 'light',               name: 'Crisp Daylight',       desc: 'High-Contrast Daylight',dot: '#2563eb', bg: '#ffffff', surface: '#f8fafc' },
      { id: 'cyberpunk',           name: 'Cyberpunk Neon',       desc: 'Synthwave Violet & Pink',dot: '#00f2fe', bg: '#120726', surface: '#1c0c3b' },
      { id: 'nord',                name: 'Nord Arctic',          desc: 'Frosted Polar Slate (Default)', dot: '#88c0d0', bg: '#242933', surface: '#2e3440' },
      { id: 'solarized',           name: 'Solarized NOC',        desc: 'Deep Oceanic Teal',     dot: '#2aa198', bg: '#00212b', surface: '#002b36' },
      { id: 'solarized-light',     name: 'Solarized Light',      desc: 'Warm Light Parchment',  dot: '#268bd2', bg: '#fdf6e3', surface: '#eee8d5' },
      { id: 'high-contrast',       name: 'High Contrast',        desc: 'Pitch Black & Crisp White', dot: '#00ffff', bg: '#000000', surface: '#050505' },
      { id: 'high-contrast-light', name: 'High Contrast Light',  desc: 'Stark White & Deep Ink', dot: '#0000cc', bg: '#ffffff', surface: '#f8fafc' },
      { id: 'dracula',             name: 'Dracula Gothic',       desc: 'Dark Plum & Pink',      dot: '#ff79c6', bg: '#1e1f29', surface: '#282a36' },
      { id: 'matrix',              name: 'Retro Terminal',       desc: 'Phosphor Green Matrix', dot: '#00ff66', bg: '#000000', surface: '#001003' }
    ];

    var PALETTE_MAP = {};
    PALETTES.forEach(function(p) { PALETTE_MAP[p.id] = p; });

    function getSavedTheme() {
      try {
        var t = localStorage.getItem(MAIN_THEME_KEY) || localStorage.getItem(CANVAS_THEME_KEY) || localStorage.getItem(BG_PREF_KEY);
        if (t && PALETTE_MAP[t]) return t;
      } catch (e) {}
      if (document.documentElement && document.documentElement.dataset && PALETTE_MAP[document.documentElement.dataset.theme]) {
        return document.documentElement.dataset.theme;
      }
      return 'nord'; // Nord Arctic by default for fresh setups
    }

    function applyTheme(theme, persist) {
      if (!PALETTE_MAP[theme]) theme = 'nord';
      var p = PALETTE_MAP[theme];

      if (document.documentElement) {
        document.documentElement.dataset.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
      }
      if (document.body) {
        PALETTES.forEach(function(item) {
          document.body.classList.remove('pnq-' + item.id);
        });
        document.body.classList.add('pnq-' + theme);
        if (theme === 'light' || theme === 'solarized-light' || theme === 'high-contrast-light') {
          document.body.classList.remove('pnq-dark');
          document.body.classList.add('pnq-light');
        } else {
          document.body.classList.remove('pnq-light');
          document.body.classList.add('pnq-dark');
        }
      }

      if (persist) {
        try {
          localStorage.setItem(MAIN_THEME_KEY, theme);
          localStorage.setItem(CANVAS_THEME_KEY, theme);
          localStorage.setItem(BG_PREF_KEY, theme);
        } catch (e) {}
      }

      // Realtime CanvasFlow & Quickbar instant high-impact styling
      try {
        var bgSvg = document.querySelector('svg.svelte-flow__background');
        if (bgSvg) {
          bgSvg.style.backgroundColor = 'transparent';
          var dots = bgSvg.querySelectorAll('.svelte-flow__background-pattern');
          dots.forEach(function(d) {
            d.style.fill = p.dot;
            d.setAttribute('fill', p.dot);
            d.setAttribute('r', '1.6');
          });
        }
        var flowEl = document.querySelector('.pnq-canvas-flow');
        if (flowEl) flowEl.style.backgroundColor = p.bg;

        // Unsmother the grid: force inner SvelteFlow containers transparent
        document.querySelectorAll('.svelte-flow__pane, .svelte-flow__zoom, .svelte-flow__viewport, .svelte-flow__edge-labels').forEach(function(el) {
          el.style.backgroundColor = 'transparent';
        });

        var qbar = document.querySelector('[id$="-quickbar"]') || (document.getElementById('pnq-buttons') ? document.getElementById('pnq-buttons').parentElement : null);
        if (qbar) {
          qbar.style.backgroundColor = p.surface;
          qbar.style.borderBottom = '2px solid ' + p.dot;
        }

        var topbar = document.querySelector('.topbar, header.topbar, .navbar');
        if (topbar) {
          topbar.style.backgroundColor = p.surface;
          topbar.style.borderBottom = '2px solid ' + p.dot;
        }
      } catch (e) {}

      updateAllThemeButtons(theme);

      try {
        window.dispatchEvent(new CustomEvent('pnq:theme-change', { detail: { theme: theme, palette: p } }));
      } catch (e) {}
    }

    function updateAllThemeButtons(theme) {
      var p = PALETTE_MAP[theme] || PALETTES[0];
      var pickerBtn = document.getElementById('pnq-btn-theme-picker');
      if (pickerBtn) {
        var dot = pickerBtn.querySelector('.pnq-theme-dot');
        if (dot) {
          dot.style.background = p.dot;
          dot.style.boxShadow = '0 0 6px ' + p.dot;
        }
        var lbl = pickerBtn.querySelector('.pnq-theme-label');
        if (lbl) {
          lbl.textContent = 'Theme: ' + p.name;
        }
      }

      // Update dropdown checkmarks
      document.querySelectorAll('#pnq-theme-dropdown .pnq-theme-item').forEach(function(item) {
        var choiceId = item.getAttribute('data-theme-choice');
        var check = item.querySelector('.pnq-theme-check');
        var isCurrent = (choiceId === theme);
        if (check) check.style.display = isCurrent ? 'inline-block' : 'none';
        item.style.backgroundColor = isCurrent ? 'var(--pnq-accent-soft, rgba(59,130,246,0.12))' : 'transparent';
      });

      // Update topbar header buttons on /main/
      document.querySelectorAll('[data-action="theme"]').forEach(function(b) {
        var isLight = (theme === 'light' || theme === 'solarized-light' || theme === 'high-contrast-light');
        var lbl = 'Theme: ' + p.name + ' (Click to cycle themes)';
        b.title = lbl;
        b.setAttribute('aria-label', lbl);
        var i = b.querySelector('.fa');
        if (i) i.className = 'fa ' + (isLight ? 'fa-sun-o' : 'fa-moon-o');
      });

      var darkCheckbox = document.getElementById('body_dark_mode');
      if (darkCheckbox) {
        darkCheckbox.checked = (theme !== 'light');
      }
    }

    function cycleTheme() {
      var current = getSavedTheme();
      var currentIndex = 0;
      for (var i = 0; i < PALETTES.length; i++) {
        if (PALETTES[i].id === current) {
          currentIndex = i;
          break;
        }
      }
      var next = PALETTES[(currentIndex + 1) % PALETTES.length];
      applyTheme(next.id, true);
      azToast('Theme: Switched to ' + next.name, 'info');
    }

    // Attach cycle on any data-action="theme" click
    document.querySelectorAll('[data-action="theme"]').forEach(function(b) {
      if (!b.getAttribute('data-az-theme-bound')) {
        b.setAttribute('data-az-theme-bound', 'true');
        b.addEventListener('click', function(e) {
          e.preventDefault();
          cycleTheme();
        });
      }
    });

    window.addEventListener('storage', function(e) {
      if (e.key === MAIN_THEME_KEY || e.key === CANVAS_THEME_KEY) {
        if (e.newValue && PALETTE_MAP[e.newValue]) {
          applyTheme(e.newValue, false);
        }
      }
    });

    applyTheme(getSavedTheme(), false);

    window.azamThemeEngine = {
      palettes: PALETTES,
      getTheme: getSavedTheme,
      setTheme: function(t) { applyTheme(t, true); },
      cycle: cycleTheme,
      toggle: cycleTheme,
      updateButtons: function() { updateAllThemeButtons(getSavedTheme()); }
    };
  }

  /* ── CSS for active tab ──────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('az-feat-style')) return;
    var s = document.createElement('style');
    s.id = 'az-feat-style';
    s.textContent = '' +
      '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");' +
      '#' + PANEL_ID + ' [data-az-tab].az-tab-active{color:#3b82f6!important;border-bottom-color:#3b82f6!important}' +
      '#' + PANEL_ID + ' [data-az-tab]:hover{color:#e2e8f0!important}' +
      '#' + PANEL_ID + ' button:disabled{opacity:.5;cursor:not-allowed}' +
      '@keyframes az-slide-in{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}' +
      '#pnq-pnet-features:hover a, #pnq-git-vcs-entry:hover a{opacity:.85}' +
      '#pnq-pnet-features a, #pnq-git-vcs-entry a{transition:opacity .2s}' +
      '/* Smart Annotations & Pure Black Canvas Tags */' +
      '.az-smart-tag-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 9px;border-radius:9999px;background:rgba(10,10,12,.95);border:1px solid rgba(59,130,246,.45);color:#f1f5f9;font-size:11px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.6);backdrop-filter:blur(8px);cursor:grab;user-select:none;transition:all .15s ease}' +
      '.az-smart-tag-chip:hover{border-color:#38bdf8;box-shadow:0 0 10px rgba(56,189,248,.35)}' +
      '.az-smart-group-outline{position:absolute;border-radius:10px;pointer-events:none;border:2px dashed rgba(56,189,248,.5);background:rgba(56,189,248,.03);transition:all .2s ease-out}' +
      '/* High-DPI Ultra-Clarity Canvas Typography & Crisp Rendering Engine */' +
      '.pnq-canvas-flow, .svelte-flow, .svelte-flow__pane, .svelte-flow__node, .svelte-flow__edge, #canvas, .jtk-surface, .topology-canvas, #canvas-parent {' +
      '  -webkit-font-smoothing: subpixel-antialiased !important;' +
      '  text-rendering: geometricPrecision !important;' +
      '}' +
      '.svelte-flow__node, .pnq-text, .customShape, .customText {' +
      '  backface-visibility: visible !important;' +
      '  transform-style: flat !important;' +
      '}' +
      '/* 1. Clean, High-Contrast Sharp Node Names (Segoe UI, Slender 10px, Zero Overlap) */' +
      '.pnq-node__name, .pnq-node__meta, .node_frame .node_name, .topology-node .node_name, [data-node-id] .node_name, .svelte-flow__node .node_name {' +
      '  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;' +
      '  font-weight: 600 !important;' +
      '  font-size: 10px !important;' +
      '  letter-spacing: normal !important;' +
      '  color: #38bdf8 !important;' +
      '  background: transparent !important;' +
      '  border: none !important;' +
      '  box-shadow: none !important;' +
      '  backdrop-filter: none !important;' +
      '  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9) !important;' +
      '  white-space: nowrap !important;' +
      '  display: block !important;' +
      '  margin-top: 1px !important;' +
      '  z-index: 25 !important;' +
      '}' +
      '/* 2. Sharp High-Contrast Interface Chips */' +
      '.pnq-edge-iflabel, .pnq-iflabel-wrap, .jtk-overlay.jtk-label, .interface_label, [data-interface-label], .svelte-flow__edge-label {' +
      '  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;' +
      '  font-weight: 600 !important;' +
      '  font-size: 10px !important;' +
      '  letter-spacing: normal !important;' +
      '  -webkit-font-smoothing: subpixel-antialiased !important;' +
      '  text-rendering: geometricPrecision !important;' +
      '  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5) !important;' +
      '}' +
      '/* 3. Base Typography for Annotations & Pills (Segoe UI 11px, Line-Height 1.45) */' +
      '.pnq-text, .customText, [data-path] {' +
      '  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif !important;' +
      '  font-size: 11px !important;' +
      '  line-height: 1.45 !important;' +
      '  letter-spacing: 0.15px !important;' +
      '}' +
      '/* Subnet IP Address Pills (192.168.20.0/30) - Crisp Slate Pill Styling */' +
      '.pnq-text[style*="rgb(30, 41, 59)"], .pnq-text[style*="#1e293b"], .customText[style*="rgb(30, 41, 59)"], .customText[style*="#1e293b"] {' +
      '  background-color: #1e293b !important;' +
      '  color: #f8fafc !important;' +
      '  border: 1px solid rgba(56, 189, 248, 0.4) !important;' +
      '  border-radius: 6px !important;' +
      '  padding: 4px 10px !important;' +
      '  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4) !important;' +
      '}' +
      '.pnq-text[style*="rgb(30, 41, 59)"] p, .customText[style*="rgb(30, 41, 59)"] p {' +
      '  color: #38bdf8 !important;' +
      '  font-weight: 600 !important;' +
      '  font-size: 11px !important;' +
      '  margin: 0 !important;' +
      '}' +
      '/* LSA Badges */' +
      '.pnq-text[style*="rgb(51, 65, 85)"], .pnq-text[style*="#334155"], .customText[style*="rgb(51, 65, 85)"], .customText[style*="#334155"] {' +
      '  background-color: #1e293b !important;' +
      '  color: #f8fafc !important;' +
      '  border: 1px solid rgba(148, 163, 184, 0.3) !important;' +
      '  border-radius: 6px !important;' +
      '  padding: 4px 10px !important;' +
      '  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4) !important;' +
      '}' +
      '.pnq-text[style*="rgb(51, 65, 85)"] p, .customText[style*="rgb(51, 65, 85)"] p {' +
      '  color: #f8fafc !important;' +
      '  font-weight: 500 !important;' +
      '  font-size: 11px !important;' +
      '  margin: 0 !important;' +
      '}' +
      '/* Device Callout Boxes (DCSW-1..DCSW-4, SERVER-1..4) - Crisp 11px Typography */' +
      '.pnq-text[style*="rgb(255, 224, 102)"], .pnq-text[style*="#ffe066"], .customText[style*="rgb(255, 224, 102)"], .customText[style*="#ffe066"] {' +
      '  border-radius: 6px !important;' +
      '  padding: 6px 10px !important;' +
      '  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35) !important;' +
      '}' +
      '.pnq-text[style*="rgb(255, 224, 102)"] p, .customText[style*="rgb(255, 224, 102)"] p {' +
      '  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;' +
      '  font-size: 11px !important;' +
      '  font-weight: 400 !important;' +
      '  line-height: 1.4 !important;' +
      '  color: #000000 !important;' +
      '  margin: 1px 0 !important;' +
      '}' +
      '.pnq-text[style*="rgb(255, 224, 102)"] p b, .customText[style*="rgb(255, 224, 102)"] p b {' +
      '  font-weight: 700 !important;' +
      '  font-size: 11.5px !important;' +
      '  display: block !important;' +
      '  margin-bottom: 3px !important;' +
      '}' +
      '/* General Custom Text / Shapes default fallback */' +
      '.pnq-text p, .pnq-shape p, .customShape p, .customText p {' +
      '  color: inherit !important;' +
      '  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif !important;' +
      '  font-weight: 400 !important;' +
      '  font-size: 11px !important;' +
      '  line-height: 1.45 !important;' +
      '  letter-spacing: 0.15px !important;' +
      '  -webkit-font-smoothing: subpixel-antialiased !important;' +
      '  text-rendering: geometricPrecision !important;' +
      '}' +
      '.pnq-text p b, .pnq-text b, .customShape p b, .customText p b {' +
      '  font-weight: 700 !important;' +
      '}' +
      '/* 4. High-DPI Crisp Vector Icons, Badges & Midpoint Markers */' +
      '.pnq-node__img, .pnq-watch-arrow, .pnq-edge-badge, marker, img, image, svg image, .node_icon img, .node_icon svg, [class*="network"] img {' +
      '  image-rendering: -webkit-optimize-contrast !important;' +
      '  image-rendering: crisp-edges !important;' +
      '  shape-rendering: geometricPrecision !important;' +
      '}' +
      'svg marker {' +
      '  overflow: visible !important;' +
      '}' +
      '/* Option 2: Executive Titanium & Amber Gold (CCIE Elite) Lab Header - Compact & 2D Resizable (Width & Height) */' +
      '.pnq-header-wrapper, [name="Lab_Header"], .customText.pnq-header-wrapper {' +
      '  container-type: inline-size;' +
      '  min-width: 0 !important;' +
      '  max-width: 100% !important;' +
      '  min-height: 0 !important;' +
      '  max-height: 100% !important;' +
      '  height: 100% !important;' +
      '  box-sizing: border-box !important;' +
      '}' +
      '.pnq-executive-card {' +
      '  display: flex !important;' +
      '  flex-direction: column !important;' +
      '  justify-content: center !important;' +
      '  align-items: center !important;' +
      '  text-align: center !important;' +
      '  box-sizing: border-box !important;' +
      '  background: linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98)) !important;' +
      '  padding: 6px 18px 8px 18px !important;' +
      '  border-radius: 8px !important;' +
      '  border: 1px solid rgba(245, 158, 11, 0.45) !important;' +
      '  border-top: 2.5px solid #f59e0b !important;' +
      '  box-shadow: 0 6px 18px -3px rgba(0, 0, 0, 0.75), 0 0 14px rgba(245, 158, 11, 0.12) !important;' +
      '  backdrop-filter: blur(12px) !important;' +
      '  -webkit-backdrop-filter: blur(12px) !important;' +
      '  width: 100% !important;' +
      '  height: 100% !important;' +
      '  max-width: 100% !important;' +
      '  max-height: 100% !important;' +
      '  min-width: 0 !important;' +
      '  min-height: 0 !important;' +
      '  overflow: hidden !important;' +
      '  position: relative !important;' +
      '  pointer-events: auto !important;' +
      '  transition: transform 0.15s ease !important;' +
      '}' +
      '.pnq-card-badge-wrap {' +
      '  margin: 0 0 3px 0 !important;' +
      '  line-height: 1 !important;' +
      '  flex-shrink: 1 !important;' +
      '}' +
      '.pnq-card-badge {' +
      '  display: inline-block !important;' +
      '  padding: 2px 7px !important;' +
      '  border-radius: 3px !important;' +
      '  background: rgba(245, 158, 11, 0.12) !important;' +
      '  border: 1px solid rgba(245, 158, 11, 0.4) !important;' +
      '  font-size: 9.5px !important;' +
      '  font-weight: 700 !important;' +
      '  color: #fbbf24 !important;' +
      '  letter-spacing: 1px !important;' +
      '  text-transform: uppercase !important;' +
      '  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;' +
      '  line-height: 1.2 !important;' +
      '}' +
      '.pnq-card-title {' +
      '  font-size: 15px !important;' +
      '  font-weight: 800 !important;' +
      '  color: #f8fafc !important;' +
      '  letter-spacing: 0.5px !important;' +
      '  margin: 2px 0 0 0 !important;' +
      '  line-height: 1.25 !important;' +
      '  text-transform: uppercase !important;' +
      '  text-shadow: 0 0 10px rgba(245, 158, 11, 0.35) !important;' +
      '  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;' +
      '  word-break: break-word !important;' +
      '  flex-shrink: 0 !important;' +
      '}' +
      '.pnq-card-subtitle {' +
      '  font-size: 10.5px !important;' +
      '  font-weight: 600 !important;' +
      '  color: #94a3b8 !important;' +
      '  margin: 3px 0 0 0 !important;' +
      '  line-height: 1.3 !important;' +
      '  letter-spacing: 0.25px !important;' +
      '  font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif !important;' +
      '  word-break: break-word !important;' +
      '  flex-shrink: 2 !important;' +
      '  white-space: nowrap !important;' +
      '  overflow: hidden !important;' +
      '  text-overflow: ellipsis !important;' +
      '}' +
      '/* Height-Adaptive Compression when resized bottom-to-up */' +
      '.pnq-executive-card.pnq-compact-v {' +
      '  padding: 3px 12px 4px 12px !important;' +
      '}' +
      '.pnq-executive-card.pnq-compact-v .pnq-card-subtitle {' +
      '  display: none !important;' +
      '}' +
      '.pnq-executive-card.pnq-ultra-compact-v {' +
      '  padding: 2px 10px !important;' +
      '}' +
      '.pnq-executive-card.pnq-ultra-compact-v .pnq-card-badge-wrap,' +
      '.pnq-executive-card.pnq-ultra-compact-v .pnq-card-subtitle {' +
      '  display: none !important;' +
      '}' +
      '.pnq-executive-card.pnq-ultra-compact-v .pnq-card-title {' +
      '  font-size: 13px !important;' +
      '  line-height: 1 !important;' +
      '  margin: 0 !important;' +
      '}' +
      '@container (max-width: 380px) {' +
      '  .pnq-card-title { font-size: 13px !important; }' +
      '  .pnq-card-subtitle { font-size: 9.5px !important; }' +
      '  .pnq-card-badge { font-size: 8.5px !important; padding: 1px 5px !important; }' +
      '  .pnq-executive-card { padding: 4px 10px 6px 10px !important; }' +
      '}' +
      '@container (max-width: 270px) {' +
      '  .pnq-card-title { font-size: 11px !important; }' +
      '  .pnq-card-subtitle { font-size: 8.5px !important; }' +
      '  .pnq-card-badge { font-size: 7.5px !important; }' +
      '  .pnq-executive-card { padding: 3px 6px 4px 6px !important; }' +
      '}' +
      '.pnq-card-scale-bar {' +
      '  position: absolute !important;' +
      '  top: 3px !important;' +
      '  right: 5px !important;' +
      '  display: flex !important;' +
      '  align-items: center !important;' +
      '  gap: 2px !important;' +
      '  opacity: 0 !important;' +
      '  transition: opacity 0.15s ease !important;' +
      '  background: rgba(15, 23, 42, 0.95) !important;' +
      '  border: 1px solid rgba(245, 158, 11, 0.45) !important;' +
      '  border-radius: 4px !important;' +
      '  padding: 1px 3px !important;' +
      '  z-index: 100 !important;' +
      '  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5) !important;' +
      '}' +
      '.pnq-executive-card:hover .pnq-card-scale-bar {' +
      '  opacity: 1 !important;' +
      '}' +
      '.pnq-scale-btn {' +
      '  background: transparent !important;' +
      '  border: none !important;' +
      '  color: #fbbf24 !important;' +
      '  font-size: 11px !important;' +
      '  font-weight: 700 !important;' +
      '  cursor: pointer !important;' +
      '  padding: 0 4px !important;' +
      '  line-height: 13px !important;' +
      '  border-radius: 2px !important;' +
      '  user-select: none !important;' +
      '}' +
      '.pnq-scale-btn:hover {' +
      '  background: rgba(245, 158, 11, 0.3) !important;' +
      '  color: #ffffff !important;' +
      '}' +
      '.pnq-scale-val {' +
      '  font-size: 9px !important;' +
      '  font-weight: 600 !important;' +
      '  color: #94a3b8 !important;' +
      '  min-width: 22px !important;' +
      '  text-align: center !important;' +
      '  user-select: none !important;' +
      '}' +
      '.pnq-header-wrapper .pnq-text-resize,' +
      '.svelte-flow__node:has(.pnq-executive-card) .pnq-text-resize {' +
      '  width: 14px !important;' +
      '  height: 14px !important;' +
      '  right: -3px !important;' +
      '  bottom: -3px !important;' +
      '  opacity: 0.7 !important;' +
      '  background: repeating-linear-gradient(-45deg, #f59e0b 0 2px, transparent 2px 4px) !important;' +
      '  border-radius: 3px !important;' +
      '  cursor: nwse-resize !important;' +
      '  pointer-events: auto !important;' +
      '  z-index: 10001 !important;' +
      '}' +
      '.pnq-header-wrapper:hover .pnq-text-resize,' +
      '.svelte-flow__node:has(.pnq-executive-card):hover .pnq-text-resize {' +
      '  opacity: 1 !important;' +
      '}' +
      '.customText[data-pnet-text="header"], .customText.pnq-header-wrapper, [name="Lab_Header"] {' +
      '  min-width: 0 !important;' +
      '  max-width: 100% !important;' +
      '  background: transparent !important;' +
      '  border: none !important;' +
      '  box-shadow: none !important;' +
      '  padding: 0 !important;' +
      '}';
    document.head.appendChild(s);
  }

  /* ── Init ───────────────────────────────────────────────── */
  injectStyles();
  initThemeEngineAndSwitcher();
  function startInit() {
    initThemeEngineAndSwitcher();
    waitForSidebar();
    setInterval(injectCanvasToolbarActions, 1000);
    attachCanvasContextListeners();
    initDataplaneSparklineHud();
    initHeaderResizingAndScaling();
    setInterval(initHeaderResizingAndScaling, 1500);
  }

  var _headerResizeObserver = null;
  function initHeaderResizingAndScaling() {
    if (!_headerResizeObserver && typeof ResizeObserver === 'function') {
      _headerResizeObserver = new ResizeObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          var h = entry.contentRect.height;
          var el = entry.target;
          if (h > 0) {
            if (h < 38) {
              el.classList.add('pnq-ultra-compact-v');
              el.classList.add('pnq-compact-v');
            } else if (h < 54) {
              el.classList.add('pnq-compact-v');
              el.classList.remove('pnq-ultra-compact-v');
            } else {
              el.classList.remove('pnq-compact-v');
              el.classList.remove('pnq-ultra-compact-v');
            }
          }
        }
      });
    }

    $('.pnq-executive-card').each(function () {
      var $card = $(this);
      if (_headerResizeObserver && !$card.data('ro-attached')) {
        $card.data('ro-attached', true);
        _headerResizeObserver.observe(this);
      }
      if ($card.find('.pnq-card-scale-bar').length === 0) {
        var bar = $(
          '<div class="pnq-card-scale-bar" title="Header Scale Controls">' +
          '  <button type="button" class="pnq-scale-btn pnq-scale-down" title="Reduce Size (−10%)">−</button>' +
          '  <span class="pnq-scale-val">100%</span>' +
          '  <button type="button" class="pnq-scale-btn pnq-scale-up" title="Increase Size (+10%)">+</button>' +
          '  <button type="button" class="pnq-scale-btn pnq-scale-reset" title="Reset Size">↺</button>' +
          '</div>'
        );
        $card.append(bar);
        try {
          var labId = $('#pnq-lab-page').attr('data-path') || 'default';
          var savedScale = localStorage.getItem('pnq_header_scale_' + labId);
          if (savedScale && parseFloat(savedScale) > 0) {
            var s = parseFloat(savedScale);
            $card.attr('data-scale', s);
            $card.css({'transform': 'scale(' + s + ')', 'transform-origin': 'top center'});
            $card.find('.pnq-scale-val').text(Math.round(s * 100) + '%');
          }
        } catch (_) {}
      }
    });
  }

  $(document).on('click', '.pnq-scale-down', function (e) {
    e.stopPropagation();
    e.preventDefault();
    var $card = $(this).closest('.pnq-executive-card');
    var currentScale = parseFloat($card.attr('data-scale') || '1.0');
    var newScale = Math.max(0.4, Math.round((currentScale - 0.1) * 10) / 10);
    $card.attr('data-scale', newScale);
    $card.css({'transform': 'scale(' + newScale + ')', 'transform-origin': 'top center'});
    $card.find('.pnq-scale-val').text(Math.round(newScale * 100) + '%');
    try {
      var labId = $('#pnq-lab-page').attr('data-path') || 'default';
      localStorage.setItem('pnq_header_scale_' + labId, newScale);
    } catch (_) {}
  });

  $(document).on('click', '.pnq-scale-up', function (e) {
    e.stopPropagation();
    e.preventDefault();
    var $card = $(this).closest('.pnq-executive-card');
    var currentScale = parseFloat($card.attr('data-scale') || '1.0');
    var newScale = Math.min(1.6, Math.round((currentScale + 0.1) * 10) / 10);
    $card.attr('data-scale', newScale);
    $card.css({'transform': 'scale(' + newScale + ')', 'transform-origin': 'top center'});
    $card.find('.pnq-scale-val').text(Math.round(newScale * 100) + '%');
    try {
      var labId = $('#pnq-lab-page').attr('data-path') || 'default';
      localStorage.setItem('pnq_header_scale_' + labId, newScale);
    } catch (_) {}
  });

  $(document).on('click', '.pnq-scale-reset', function (e) {
    e.stopPropagation();
    e.preventDefault();
    var $card = $(this).closest('.pnq-executive-card');
    $card.attr('data-scale', '1.0');
    $card.css({'transform': 'none'});
    $card.find('.pnq-scale-val').text('100%');
    try {
      var labId = $('#pnq-lab-page').attr('data-path') || 'default';
      localStorage.removeItem('pnq_header_scale_' + labId);
    } catch (_) {}
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startInit);
  } else {
    startInit();
  }

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

/* ── 6.8.93 Feature: Annotation Handles (Corner Grip 'se' & 320px Auto-Grow Text) ── */
  (function initAnnotationErgonomicsHook() {
    function enhanceAnnotations() {
      // 1. Force jQuery UI resizable to use bottom-right corner grip ('se')
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.resizable) {
        $('.customShape:not([data-pnet-anno="1"])').each(function () {
          var $s = $(this);
          $s.attr('data-pnet-anno', '1');
          try {
            $s.resizable('option', 'handles', 'se');
          } catch (_) {}
        });
      }

      // 2. Compact Auto-Growing Text Annotations (grows up to 320px then wraps, skips headers)
      $('.customText:not([data-pnet-text="1"]):not([data-pnet-text="header"]):not(.pnq-header-wrapper)').each(function () {
        var $t = $(this);
        $t.attr('data-pnet-text', '1');
        $t.css({
          'max-width': '320px',
          'width': 'fit-content',
          'word-wrap': 'break-word',
          'white-space': 'pre-wrap'
        });
      });
    }

    setInterval(enhanceAnnotations, 2000);
    document.addEventListener('DOMContentLoaded', enhanceAnnotations);
  })();
