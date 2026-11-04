/**
 * pnet-docked-console.js
 * ==============================================================================
 * PNetLab Quantum In-Canvas Docked Terminal Console
 *
 * Replaces disconnected browser pop-up windows with an integrated, resizable,
 * multi-pane terminal dock inside the lab canvas:
 *  1. Multi-Pane Layouts: 1x (Single Focus), 2x (Side-by-Side Dual Split), 4x (Quad Grid).
 *  2. Real-Time Network CLI Syntax Highlighting: Auto-colorizes IPv4/v6, interfaces,
 *     BGP/OSPF states (up/down/Established), and error tokens.
 *  3. Dynamic Drag Resizing: Smooth vertical height adjustment with persistent storage.
 *  4. Session Management: Add tab, close tab, duplicate, pop-out to external window.
 *  5. Compact Minimization: Collapses to a slim 34px status strip with active pips.
 * ==============================================================================
 */
(function() {
  'use strict';

  if (window.pnetDockedConsole) return; // Prevent double registration

  var AzamDockedConsole = {
    dockEl: null,
    resizerEl: null,
    headerEl: null,
    tabsEl: null,
    bodyEl: null,
    panes: [],
    sessions: [], // { id, name, url, paneIdx: 0 }
    activeTabId: null,
    currentLayout: '1x', // '1x', '2x', '4x'
    isMinimized: false,
    syntaxEnabled: true,
    height: 380,

    init: function() {
      var self = this;
      this.syntaxEnabled = localStorage.getItem('az_cli_syntax') !== 'false';
      this.currentLayout = localStorage.getItem('az_dock_layout') || '1x';
      this.height = parseInt(localStorage.getItem('az_dock_height'), 10) || 380;

      this.injectStyles();
      this.buildDOM();
      this.bindResizer();

      // Listen for window resize
      window.addEventListener('resize', function() {
        if (!self.isMinimized && self.dockEl && self.dockEl.style.display !== 'none') {
          self.clampHeight();
        }
      });

      console.log('[PNetLab] Quantum In-Canvas Docked Console initialized.');
    },

    isEnabled: function() {
      return localStorage.getItem('az_console_mode') !== 'popup';
    },

    isVisible: function() {
      if (!this.dockEl) return false;
      return this.dockEl.style.display === 'flex' || 
             (this.dockEl.style.display !== 'none' && window.getComputedStyle(this.dockEl).display !== 'none');
    },

    injectStyles: function() {
      if (document.getElementById('az-dock-styles')) return;
      var style = document.createElement('style');
      style.id = 'az-dock-styles';
      style.textContent = [
        '#az-docked-console {',
        '  position: fixed;',
        '  bottom: 0;',
        '  left: 0;',
        '  right: 0;',
        '  background: rgba(10, 14, 23, 0.96);',
        '  border-top: 2px solid rgba(56, 189, 248, 0.45);',
        '  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.75);',
        '  z-index: 99990;',
        '  display: none;',
        '  flex-direction: column;',
        '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", monospace;',
        '  backdrop-filter: blur(12px);',
        '  transition: height 0.15s ease-out, transform 0.2s ease-out;',
        '}',
        '#az-dock-resizer {',
        '  height: 6px;',
        '  background: transparent;',
        '  cursor: ns-resize;',
        '  position: relative;',
        '  width: 100%;',
        '  transition: background 0.2s;',
        '}',
        '#az-dock-resizer:hover, #az-dock-resizer.dragging {',
        '  background: rgba(56, 189, 248, 0.6);',
        '}',
        '#az-dock-resizer::after {',
        '  content: "";',
        '  position: absolute;',
        '  top: 1px;',
        '  left: 50%;',
        '  transform: translateX(-50%);',
        '  width: 48px;',
        '  height: 4px;',
        '  border-radius: 2px;',
        '  background: rgba(56, 189, 248, 0.35);',
        '}',
        '#az-dock-header {',
        '  height: 36px;',
        '  background: rgba(15, 23, 42, 0.95);',
        '  border-bottom: 1px solid rgba(255, 255, 255, 0.08);',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  padding: 0 10px;',
        '  user-select: none;',
        '}',
        '#az-dock-tabs {',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 4px;',
        '  overflow-x: auto;',
        '  max-width: 60%;',
        '  scrollbar-width: none;',
        '}',
        '#az-dock-tabs::-webkit-scrollbar { display: none; }',
        '.az-dock-tab {',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 6px;',
        '  padding: 4px 10px;',
        '  background: rgba(255, 255, 255, 0.05);',
        '  border: 1px solid rgba(255, 255, 255, 0.08);',
        '  border-radius: 6px 6px 0 0;',
        '  color: #94a3b8;',
        '  font-size: 11.5px;',
        '  font-weight: 500;',
        '  cursor: pointer;',
        '  white-space: nowrap;',
        '  transition: all 0.15s;',
        '}',
        '.az-dock-tab:hover {',
        '  background: rgba(255, 255, 255, 0.1);',
        '  color: #f1f5f9;',
        '}',
        '.az-dock-tab.active {',
        '  background: rgba(56, 189, 248, 0.15);',
        '  border-color: rgba(56, 189, 248, 0.5);',
        '  border-bottom-color: transparent;',
        '  color: #38bdf8;',
        '  font-weight: 600;',
        '}',
        '.az-dock-tab-pip {',
        '  width: 7px;',
        '  height: 7px;',
        '  border-radius: 50%;',
        '  background: #22c55e;',
        '  box-shadow: 0 0 6px #22c55e;',
        '}',
        '.az-dock-tab-close {',
        '  width: 14px;',
        '  height: 14px;',
        '  border-radius: 50%;',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  font-size: 11px;',
        '  color: #64748b;',
        '  margin-left: 2px;',
        '}',
        '.az-dock-tab-close:hover {',
        '  background: rgba(239, 68, 68, 0.2);',
        '  color: #ef4444;',
        '}',
        '#az-dock-actions {',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 6px;',
        '}',
        '.az-dock-btn {',
        '  padding: 3px 8px;',
        '  background: rgba(255, 255, 255, 0.06);',
        '  border: 1px solid rgba(255, 255, 255, 0.1);',
        '  border-radius: 5px;',
        '  color: #cbd5e1;',
        '  font-size: 11px;',
        '  cursor: pointer;',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 4px;',
        '  transition: all 0.15s;',
        '}',
        '.az-dock-btn:hover {',
        '  background: rgba(56, 189, 248, 0.2);',
        '  border-color: rgba(56, 189, 248, 0.4);',
        '  color: #f8fafc;',
        '}',
        '.az-dock-btn.active {',
        '  background: rgba(56, 189, 248, 0.25);',
        '  border-color: #38bdf8;',
        '  color: #38bdf8;',
        '}',
        '#az-dock-body {',
        '  flex: 1;',
        '  display: grid;',
        '  background: #000000;',
        '  overflow: hidden;',
        '}',
        '#az-dock-body.layout-1x { grid-template-columns: 1fr; grid-template-rows: 1fr; }',
        '#az-dock-body.layout-2x { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr; gap: 2px; background: rgba(56, 189, 248, 0.2); }',
        '#az-dock-body.layout-4x { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 2px; background: rgba(56, 189, 248, 0.2); }',
        '.az-dock-pane {',
        '  position: relative;',
        '  width: 100%;',
        '  height: 100%;',
        '  background: #050811;',
        '  overflow: hidden;',
        '}',
        '.az-dock-pane {',
        '  display: flex;',
        '  flex-direction: column;',
        '  height: 100%;',
        '  background: #060913;',
        '  border-right: 1px solid rgba(255, 255, 255, 0.08);',
        '  overflow: hidden;',
        '}',
        '.az-dock-pane.maximized {',
        '  grid-column: 1 / -1 !important;',
        '  grid-row: 1 / -1 !important;',
        '  z-index: 10;',
        '}',
        '.az-pane-header {',
        '  height: 30px;',
        '  background: #0c101a;',
        '  border-bottom: 1px solid rgba(255, 255, 255, 0.08);',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: space-between;',
        '  padding: 0 8px;',
        '  user-select: none;',
        '  flex-shrink: 0;',
        '}',
        '.az-pane-tabs {',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 4px;',
        '  overflow-x: auto;',
        '  scrollbar-width: none;',
        '}',
        '.az-pane-tabs::-webkit-scrollbar { display: none; }',
        '.az-pane-tab {',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 6px;',
        '  padding: 3px 9px;',
        '  background: #1e293b;',
        '  border: 1px solid rgba(56, 189, 248, 0.35);',
        '  border-radius: 4px 4px 0 0;',
        '  font-size: 11px;',
        '  font-weight: 600;',
        '  color: #f8fafc;',
        '  cursor: pointer;',
        '  transition: all 0.15s ease;',
        '}',
        '.az-pane-tab:hover {',
        '  background: #334155;',
        '  border-color: #38bdf8;',
        '}',
        '.az-pane-tab.active {',
        '  background: rgba(56, 189, 248, 0.2);',
        '  border-color: #38bdf8;',
        '  color: #38bdf8;',
        '}',
        '.az-pane-tab-pip {',
        '  width: 6px;',
        '  height: 6px;',
        '  border-radius: 50%;',
        '  background: #10b981;',
        '  box-shadow: 0 0 6px #10b981;',
        '}',
        '.az-pane-tab-close {',
        '  font-size: 10px;',
        '  color: #94a3b8;',
        '  cursor: pointer;',
        '  padding: 0 2px;',
        '  border-radius: 2px;',
        '}',
        '.az-pane-tab-close:hover {',
        '  color: #ef4444;',
        '  background: rgba(239, 68, 68, 0.2);',
        '}',
        '.az-pane-add-btn {',
        '  background: transparent;',
        '  border: none;',
        '  color: #64748b;',
        '  font-size: 14px;',
        '  font-weight: 700;',
        '  cursor: pointer;',
        '  padding: 2px 6px;',
        '  border-radius: 3px;',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  line-height: 1;',
        '}',
        '.az-pane-add-btn:hover {',
        '  color: #38bdf8;',
        '  background: rgba(56, 189, 248, 0.15);',
        '}',
        '.az-pane-actions {',
        '  display: flex;',
        '  align-items: center;',
        '  gap: 6px;',
        '}',
        '.az-pane-max-btn {',
        '  background: transparent;',
        '  border: none;',
        '  color: #64748b;',
        '  font-size: 11px;',
        '  cursor: pointer;',
        '  padding: 2px;',
        '}',
        '.az-pane-max-btn:hover {',
        '  color: #38bdf8;',
        '}',
        '.az-pane-content {',
        '  flex: 1;',
        '  position: relative;',
        '  width: 100%;',
        '  height: calc(100% - 30px);',
        '  background: #000000;',
        '  overflow: hidden;',
        '}',
        '.az-pane-content iframe {',
        '  width: 100%;',
        '  height: 100%;',
        '  border: none;',
        '  display: block;',
        '}',
        '.az-dock-pane-empty {',
        '  display: flex;',
        '  align-items: center;',
        '  justify-content: center;',
        '  flex-direction: column;',
        '  height: 100%;',
        '  color: #475569;',
        '  font-size: 12px;',
        '  gap: 8px;',
        '}'
      ].join('\n');
      document.head.appendChild(style);
    },

    buildDOM: function() {
      var self = this;
      if (document.getElementById('az-docked-console')) return;

      var dock = document.createElement('div');
      dock.id = 'az-docked-console';
      dock.style.display = 'none';
      dock.style.height = this.height + 'px';

      dock.innerHTML = [
        '<div id="az-dock-resizer" title="Drag up/down to resize terminal dock"></div>',
        '<div id="az-dock-header">',
        '  <div style="display:flex;align-items:center;gap:10px;">',
        '    <span style="font-size:12px;font-weight:700;color:#38bdf8;letter-spacing:0.5px;display:flex;align-items:center;gap:6px;"><i class="fa fa-terminal"></i> QUANTUM DOCKED CONSOLE</span>',
        '    <div style="display:flex;align-items:center;background:rgba(0,0,0,0.3);border-radius:5px;padding:1px;border:1px solid rgba(255,255,255,0.08);">',
        '      <button class="az-dock-btn" data-layout="1x" title="Single Focused Terminal">1x</button>',
        '      <button class="az-dock-btn" data-layout="2x" title="Dual Split View (50/50)">2x Split</button>',
        '      <button class="az-dock-btn" data-layout="4x" title="Quad Grid (2x2)">4x Grid</button>',
        '    </div>',
        '    <button id="az-btn-syntax" class="az-dock-btn ' + (this.syntaxEnabled ? 'active' : '') + '" title="Toggle Network CLI Syntax Highlighting">🎨 Syntax</button>',
        '  </div>',
        '  <div id="az-dock-actions" style="display:flex;align-items:center;gap:8px;">',
        '    <button id="az-dock-btn-filters" class="az-dock-btn" style="background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.35);color:#38bdf8;font-weight:600;" title="Toggle Traffic Filters & Path Glow"><i class="fa fa-filter"></i> Filters ▾</button>',
        '    <button id="az-btn-reload-all" class="az-dock-btn" title="Reload Terminal Sessions"><i class="fa fa-refresh"></i></button>',
        '    <button id="az-btn-min" class="az-dock-btn" title="Minimize/Expand Dock"><i class="fa fa-minus"></i></button>',
        '    <button id="az-btn-max-height" class="az-dock-btn" title="Maximize Dock Height"><i class="fa fa-expand"></i></button>',
        '    <button id="az-btn-close-all" class="az-dock-btn" style="color:#ef4444;" title="Close All Docked Sessions"><i class="fa fa-times"></i></button>',
        '  </div>',
        '</div>',
        '<div id="az-dock-body" class="layout-' + this.currentLayout + '"></div>'
      ].join('\n');

      document.body.appendChild(dock);

      this.dockEl = dock;
      this.resizerEl = dock.querySelector('#az-dock-resizer');
      this.headerEl = dock.querySelector('#az-dock-header');
      this.tabsEl = dock.querySelector('#az-dock-tabs');
      this.bodyEl = dock.querySelector('#az-dock-body');

      // Bind header button actions
      dock.querySelectorAll('[data-layout]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          self.setLayout(btn.getAttribute('data-layout'));
        });
      });

      dock.querySelector('#az-btn-syntax').addEventListener('click', function() {
        self.toggleSyntax();
      });

      var fltBtn = dock.querySelector('#az-dock-btn-filters');
      if (fltBtn) {
        fltBtn.addEventListener('click', function() {
          if (window.azamTrafficFilters && typeof window.azamTrafficFilters.toggle === 'function') {
            window.azamTrafficFilters.toggle();
          }
        });
      }

      var relBtn = dock.querySelector('#az-btn-reload-all');
      if (relBtn) {
        relBtn.addEventListener('click', function() {
          var iframes = self.dockEl.querySelectorAll('iframe');
          for (var i = 0; i < iframes.length; i++) {
            try { iframes[i].src = iframes[i].src; } catch (e) {}
          }
          if (typeof azToast === 'function') azToast('Reloading active console sessions…', 'info');
        });
      }

      dock.querySelector('#az-btn-min').addEventListener('click', function() {
        self.toggleMinimize();
      });

      var maxHBtn = dock.querySelector('#az-btn-max-height');
      if (maxHBtn) {
        maxHBtn.addEventListener('click', function() {
          self.toggleMaxHeight();
        });
      }

      dock.querySelector('#az-btn-close-all').addEventListener('click', function() {
        self.closeAll();
      });

      this.updateLayoutButtons();
      this.renderPanes();
    },

    bindResizer: function() {
      var self = this;
      var startY = 0;
      var startH = 0;
      var isDragging = false;

      function onMouseMove(e) {
        if (!isDragging) return;
        var delta = startY - e.clientY;
        var newH = Math.max(160, Math.min(window.innerHeight * 0.85, startH + delta));
        self.height = newH;
        self.dockEl.style.height = newH + 'px';
      }

      function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        self.resizerEl.classList.remove('dragging');
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        localStorage.setItem('az_dock_height', String(Math.round(self.height)));
      }

      this.resizerEl.addEventListener('mousedown', function(e) {
        if (self.isMinimized) return;
        isDragging = true;
        startY = e.clientY;
        startH = self.height;
        self.resizerEl.classList.add('dragging');
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      });
    },

    clampHeight: function() {
      var maxH = window.innerHeight * 0.85;
      if (this.height > maxH) {
        this.height = maxH;
        this.dockEl.style.height = maxH + 'px';
      }
    },

    toggleMaxHeight: function() {
      if (!this.dockEl) return;
      if (this.isMaxHeight) {
        this.isMaxHeight = false;
        this.dockEl.style.height = this.height + 'px';
      } else {
        this.isMaxHeight = true;
        this.dockEl.style.height = '85vh';
      }
    },

    toggleMinimize: function() {
      if (!this.dockEl) return;
      var btn = this.dockEl.querySelector('#az-btn-min');
      if (this.isMinimized) {
        this.isMinimized = false;
        this.dockEl.style.display = 'flex';
        this.dockEl.style.height = this.height + 'px';
        if (this.bodyEl) this.bodyEl.style.display = 'grid';
        if (btn) btn.textContent = '▾';
      } else {
        this.isMinimized = true;
        this.dockEl.style.display = 'flex';
        this.dockEl.style.height = '38px';
        if (this.bodyEl) this.bodyEl.style.display = 'none';
        if (btn) btn.textContent = '▴';
      }
    },

    setLayout: function(mode) {
      if (!['1x', '2x', '4x'].includes(mode)) mode = '1x';
      this.currentLayout = mode;
      localStorage.setItem('az_dock_layout', mode);
      this.bodyEl.className = 'layout-' + mode;
      this.updateLayoutButtons();
      this.renderPanes();
    },

    updateLayoutButtons: function() {
      var self = this;
      this.dockEl.querySelectorAll('[data-layout]').forEach(function(btn) {
        if (btn.getAttribute('data-layout') === self.currentLayout) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    },

    toggleSyntax: function() {
      this.syntaxEnabled = !this.syntaxEnabled;
      localStorage.setItem('az_cli_syntax', this.syntaxEnabled ? 'true' : 'false');
      localStorage.setItem('pnq_wc_highlight', this.syntaxEnabled ? '1' : '0');
      var btn = this.dockEl.querySelector('#az-btn-syntax');
      if (btn) {
        if (this.syntaxEnabled) btn.classList.add('active');
        else btn.classList.remove('active');
      }
      if (window.azamCliSyntax) {
        window.azamCliSyntax.setEnabled(this.syntaxEnabled);
      }
      // Broadcast to all embedded terminal iframes
      var iframes = this.dockEl.querySelectorAll('iframe');
      for (var i = 0; i < iframes.length; i++) {
        try {
          iframes[i].contentWindow.postMessage({ type: 'az_syntax_toggle', enabled: this.syntaxEnabled }, '*');
        } catch (e) {}
      }
    },

    renderPanes: function() {
      var self = this;
      var maxPanes = this.currentLayout === '1x' ? 1 : (this.currentLayout === '2x' ? 2 : 4);
      this.bodyEl.innerHTML = '';
      this.panes = [];

      for (var i = 0; i < maxPanes; i++) {
        (function(paneIdx) {
          var pane = document.createElement('div');
          pane.className = 'az-dock-pane';
          pane.setAttribute('data-pane-idx', paneIdx);

          // Get all sessions assigned to this specific pane
          var paneSessions = self.sessions.filter(function(s) { return s.paneIdx === paneIdx; });

          // Active session for this pane
          var activeSession = paneSessions.find(function(s) { return s.id === self.activeTabId; }) || paneSessions[0];

          // 1. Build Pane Header with Per-Pane Tabs & Inline '+' Button
          var paneHeader = document.createElement('div');
          paneHeader.className = 'az-pane-header';

          var tabsWrap = document.createElement('div');
          tabsWrap.className = 'az-pane-tabs';

          paneSessions.forEach(function(s) {
            var tab = document.createElement('div');
            tab.className = 'az-pane-tab' + (activeSession && activeSession.id === s.id ? ' active' : '');
            tab.innerHTML = [
              '<span class="az-pane-tab-pip"></span>',
              '<span>' + s.name + '</span>',
              '<span class="az-pane-tab-close" title="Close Session">✕</span>'
            ].join('');

            tab.addEventListener('click', function(e) {
              if (e.target.classList.contains('az-pane-tab-close')) {
                e.stopPropagation();
                self.closeSession(s.id);
              } else {
                self.activeTabId = s.id;
                self.renderPanes();
              }
            });

            tabsWrap.appendChild(tab);
          });

          // Add inline '+' button to open/dock another node into this pane
          var addBtn = document.createElement('button');
          addBtn.className = 'az-pane-add-btn';
          addBtn.title = 'Add terminal tab to this pane';
          addBtn.textContent = '+';
          addBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            self.showAddNodeDropdown(addBtn, paneIdx);
          });
          tabsWrap.appendChild(addBtn);

          // Pane Actions (Maximize / Restore Pane)
          var actionsWrap = document.createElement('div');
          actionsWrap.className = 'az-pane-actions';
          actionsWrap.innerHTML = '<button class="az-pane-max-btn" title="Maximize/Restore Pane"><i class="fa fa-expand"></i></button>';
          actionsWrap.querySelector('.az-pane-max-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            pane.classList.toggle('maximized');
            var icon = actionsWrap.querySelector('i');
            if (icon) {
              icon.className = pane.classList.contains('maximized') ? 'fa fa-compress' : 'fa fa-expand';
            }
          });

          paneHeader.appendChild(tabsWrap);
          paneHeader.appendChild(actionsWrap);
          pane.appendChild(paneHeader);

          // 2. Build Pane Content (Active Iframe or Empty State)
          var paneContent = document.createElement('div');
          paneContent.className = 'az-pane-content';

          if (activeSession) {
            var ifr = document.createElement('iframe');
            ifr.src = activeSession.url;
            ifr.setAttribute('allow', 'clipboard-read; clipboard-write');
            ifr.addEventListener('load', function() {
              try {
                var doc = this.contentDocument || (this.contentWindow && this.contentWindow.document);
                if (doc) {
                  doc.addEventListener('mouseup', function() {
                    var sel = (doc.getSelection ? doc.getSelection().toString() : '');
                    if (sel && sel.trim().length > 0) {
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(sel).catch(function() {});
                      }
                    }
                  });
                }
              } catch (e) {
                // Cross-origin or sandbox boundary fallback
              }
            });
            paneContent.appendChild(ifr);
          } else {
            var quickBtns = '';
            try {
              var rawNodes = window.nodes || (window.PNQStore && window.PNQStore.state && window.PNQStore.state.nodes) || {};
              var nodeKeys = Object.keys(rawNodes);
              if (nodeKeys.length > 0) {
                quickBtns = '<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:440px;">' +
                  nodeKeys.map(function(k) {
                    var nd = rawNodes[k];
                    if (!nd || !nd.name) return '';
                    var isRunning = (nd.status == 2 || nd.status == 3);
                    var dotColor = isRunning ? '#10b981' : '#64748b';
                    return '<button type="button" class="az-quick-dock-btn" data-nid="' + k + '" style="background:rgba(255,255,255,0.06);border:1px solid ' + (isRunning ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.12)') + ';color:#f8fafc;padding:4px 10px;border-radius:5px;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">' +
                      '<span style="width:7px;height:7px;border-radius:50%;background:' + dotColor + ';display:inline-block;"></span>' +
                      nd.name +
                    '</button>';
                  }).join('') +
                '</div>';
              }
            } catch (err) {}

            paneContent.innerHTML = [
              '<div class="az-dock-pane-empty">',
              '  <div style="font-size:26px;opacity:0.6;margin-bottom:4px;">🖥️</div>',
              '  <div style="font-weight:600;font-size:13px;color:#e2e8f0;">Pane ' + (paneIdx + 1) + ' Ready</div>',
              '  <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Click a device on canvas or choose below to dock here:</div>',
              quickBtns,
              '</div>'
            ].join('\n');

            paneContent.querySelectorAll('.az-quick-dock-btn').forEach(function(btn) {
              btn.onclick = function() {
                var nid = btn.getAttribute('data-nid');
                if (nid) {
                  var rawNodes = window.nodes || {};
                  var n = rawNodes[nid] || { id: nid, name: 'Node-' + nid };
                  var u = '/console/console.html?node=' + encodeURIComponent(nid) + '&type=telnet';
                  self.openSessionInPane(n, u, n.name, paneIdx);
                }
              };
            });
          }

          pane.appendChild(paneContent);
          self.bodyEl.appendChild(pane);
          self.panes.push(pane);
        })(i);
      }
    },

    showAddNodeDropdown: function(btn, targetPaneIdx) {
      var self = this;
      var existing = document.getElementById('az-pane-add-menu');
      if (existing) existing.remove();

      var rawNodes = window.nodes || {};
      var keys = Object.keys(rawNodes);
      if (keys.length === 0) {
        if (typeof azToast === 'function') azToast('No nodes available in topology', 'warning');
        return;
      }

      var menu = document.createElement('div');
      menu.id = 'az-pane-add-menu';
      menu.style.cssText = 'position:fixed;background:#0f172a;border:1px solid rgba(56,189,248,0.4);border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.8);z-index:999999;max-height:220px;overflow-y:auto;padding:4px;min-width:160px;';

      var rect = btn.getBoundingClientRect();
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.left = rect.left + 'px';

      keys.forEach(function(k) {
        var nd = rawNodes[k];
        if (!nd || !nd.name) return;
        var item = document.createElement('div');
        item.style.cssText = 'padding:5px 8px;font-size:11px;color:#f8fafc;cursor:pointer;border-radius:4px;display:flex;align-items:center;gap:6px;';
        var isRunning = (nd.status == 2 || nd.status == 3);
        item.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:' + (isRunning ? '#10b981' : '#64748b') + '"></span> ' + nd.name;
        item.onmouseenter = function() { this.style.background = 'rgba(56,189,248,0.2)'; };
        item.onmouseleave = function() { this.style.background = 'transparent'; };
        item.onclick = function(e) {
          e.stopPropagation();
          menu.remove();
          var u = '/console/console.html?node=' + encodeURIComponent(k) + '&type=telnet';
          self.openSessionInPane(nd, u, nd.name, targetPaneIdx);
        };
        menu.appendChild(item);
      });

      document.body.appendChild(menu);

      function closeMenu(e) {
        if (!menu.contains(e.target) && e.target !== btn) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      }
      setTimeout(function() { document.addEventListener('click', closeMenu); }, 50);
    },

    openSessionInPane: function(node, url, name, paneIdx) {
      var id = String(node.id || (node && node.node) || name);
      name = name || (node.name || 'Node-' + id);

      var existing = this.sessions.find(function(s) { return s.id === id; });
      if (existing) {
        existing.paneIdx = paneIdx;
        this.activeTabId = id;
        this.renderPanes();
        this.showDock();
        return;
      }

      var session = {
        id: id,
        name: name,
        url: url,
        paneIdx: paneIdx
      };

      this.sessions.push(session);
      this.activeTabId = id;
      this.renderPanes();
      this.showDock();
    },
    openSession: function(node, url, name) {
      var id = String(node.id || (node && node.node) || name);
      name = name || (node.name || 'Node-' + id);

      // Check if session already open
      var existing = this.sessions.find(function(s) { return s.id === id; });
      if (existing) {
        this.activeTabId = id;
        this.renderTabs();
        this.showDock();
        return;
      }

      // Assign to available pane index or 0
      var maxPanes = this.currentLayout === '1x' ? 1 : (this.currentLayout === '2x' ? 2 : 4);
      var usedIndices = this.sessions.map(function(s) { return s.paneIdx; });
      var targetIdx = 0;
      for (var p = 0; p < maxPanes; p++) {
        if (!usedIndices.includes(p)) {
          targetIdx = p;
          break;
        }
      }

      var session = {
        id: id,
        name: name,
        url: url,
        paneIdx: targetIdx
      };

      this.sessions.push(session);
      this.activeTabId = id;

      this.renderTabs();
      this.renderPanes();
      this.showDock();
    },

    open: function() {
      this.showDock();
    },

    close: function() {
      if (this.dockEl) this.dockEl.style.display = 'none';
    },

    showDock: function() {
      if (!this.dockEl) return;
      this.dockEl.style.display = 'flex';
      this.isMinimized = false;
      this.dockEl.style.height = this.height + 'px';
      if (this.bodyEl) this.bodyEl.style.display = 'grid';
      var minBtn = this.dockEl.querySelector('#az-btn-min');
      if (minBtn) minBtn.textContent = '▾';
      if (!this.panes || this.panes.length === 0) {
        this.renderPanes();
      }
    },

    renderTabs: function() {
      if (!this.tabsEl) return;
      var self = this;
      this.tabsEl.innerHTML = '';

      this.sessions.forEach(function(s) {
        var tab = document.createElement('div');
        tab.className = 'az-dock-tab' + (s.id === self.activeTabId ? ' active' : '');
        tab.innerHTML = [
          '<span class="az-dock-tab-pip"></span>',
          '<span>' + s.name + '</span>',
          '<span class="az-dock-tab-close" title="Close Session">✕</span>'
        ].join('');

        tab.addEventListener('click', function(e) {
          if (e.target.classList.contains('az-dock-tab-close')) {
            e.stopPropagation();
            self.closeSession(s.id);
          } else {
            self.activeTabId = s.id;
            // In 1x mode, assign active tab to pane 0
            if (self.currentLayout === '1x') {
              s.paneIdx = 0;
            }
            self.renderTabs();
            self.renderPanes();
          }
        });

        self.tabsEl.appendChild(tab);
      });
    },

    closeSession: function(id) {
      var idx = this.sessions.findIndex(function(s) { return s.id === id; });
      if (idx !== -1) {
        this.sessions.splice(idx, 1);
      }

      if (this.sessions.length === 0) {
        this.closeAll();
        return;
      }

      if (this.activeTabId === id) {
        this.activeTabId = this.sessions[Math.max(0, idx - 1)].id;
      }

      this.renderTabs();
      this.renderPanes();
    },

    detachSession: function(id) {
      var s = this.sessions.find(function(item) { return item.id === id; });
      if (s) {
        this.closeSession(id);
        window.open(s.url, '_blank');
      }
    },

    closeAll: function() {
      this.sessions = [];
      this.activeTabId = null;
      if (this.dockEl) {
        this.dockEl.style.display = 'none';
      }
    }
  };

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { AzamDockedConsole.init(); });
  } else {
    AzamDockedConsole.init();
  }

  window.pnetDockedConsole = AzamDockedConsole;
})();

