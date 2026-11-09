/* ============================================================================
   PNetLab dashboard — Logs view (admin-only)
   Talks to the router endpoint added in html/api.php:
	 GET /api/admin/activity?categories=lab,node&limit=10&offset=0&q=text
	   -> {data:{data:[{id,created_at,pod,username,ip,category,action,lab_path,
		  lab_name,node_name,node_template,detail,duration_seconds}],total}}
   categories is a comma-separated subset of lab|node|session (server ignores
   anything else and falls back to all three if none match). Two cards: lab/
   node activity (create/delete/destroy/join/duplicate/wipe/rename, with which
   node/template) and user sessions (login/logout, source IP, session length
   from duration_seconds). 10 rows per page, with page tabs to browse older
   rows. The search box filters both cards on the server (q), so it reaches
   every page of the log, not just the rows on screen.
   ============================================================================ */
(function () {
	'use strict';
	var App = window.PnqApp, el = App.el;
	var PAGE_SIZE = 10;

	function viewTitle(text, icon) {
		var t = el('div', 'view-title');
		t.appendChild(el('i', 'fa ' + icon));
		t.appendChild(document.createTextNode(' ' + text));
		return t;
	}

	function fmtTs(ts) {
		if (!ts) return '—';
		var d = new Date(ts * 1000);
		return d.toLocaleString();
	}

	function fmtDuration(seconds) {
		if (seconds === null || seconds === undefined) return '—';
		seconds = Math.max(0, parseInt(seconds, 10) || 0);
		var h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
		return h + 'h ' + m + 'm ' + s + 's';
	}

	var SEARCH_DELAY_MS = 300;
	var state = { activity: 1, sessions: 1, search: '', activitySeq: 0, sessionSeq: 0 };

	function searchParam() {
		return state.search ? '&q=' + encodeURIComponent(state.search) : '';
	}

	function searchBox() {
		var input = el('input', 'input logs-search');
		input.type = 'search';
		input.placeholder = 'Search logs';
		input.setAttribute('aria-label', 'Search logs by user, IP, event, lab or node');
		input.maxLength = 200;
		var timer = null;
		input.addEventListener('input', function () {
			clearTimeout(timer);
			timer = setTimeout(function () {
				var next = input.value.trim();
				if (next === state.search) return;
				state.search = next;
				state.activity = 1;
				state.sessions = 1;
				loadActivity();
				loadSessions();
			}, SEARCH_DELAY_MS);
		});
		return input;
	}

	function render(view) {
		var head = el('div', 'view-head vh-ruled');
		head.appendChild(viewTitle('Logs', 'fa-history'));
		var refresh = el('button', 'btn btn-ghost'); refresh.type = 'button';
		refresh.appendChild(el('i', 'fa fa-refresh'));
		refresh.appendChild(document.createTextNode(' Refresh'));
		refresh.addEventListener('click', function () { loadActivity(); loadSessions(); });
		var tools = el('div', 'logs-tools');
		tools.appendChild(searchBox());
		tools.appendChild(refresh);
		head.appendChild(tools);
		view.appendChild(head);

		state.activity = 1;
		state.sessions = 1;
		state.search = '';

		var activityCard = el('div', 'card'); activityCard.id = 'logs-activity-card';
		activityCard.appendChild(el('div', 'card-title', 'Lab & node activity'));
		activityCard.appendChild(el('p', 'muted', 'Loading…'));
		view.appendChild(activityCard);

		var sessionCard = el('div', 'card'); sessionCard.id = 'logs-session-card';
		sessionCard.appendChild(el('div', 'card-title', 'User sessions'));
		sessionCard.appendChild(el('p', 'muted', 'Loading…'));
		view.appendChild(sessionCard);

		loadActivity();
		loadSessions();
	}

	var ACTIVITY_LABELS = {
		'lab:create': { icon: 'fa-plus-circle', text: 'Lab created' },
		'lab:delete': { icon: 'fa-trash', text: 'Lab deleted' },
		'lab:destroy': { icon: 'fa-bomb', text: 'Lab destroyed' },
		'lab:join': { icon: 'fa-sign-in', text: 'Joined lab' },
		'node:create': { icon: 'fa-plus-circle', text: 'Node created' },
		'node:delete': { icon: 'fa-trash', text: 'Node deleted' },
		'node:duplicate': { icon: 'fa-clone', text: 'Node duplicated' },
		'node:wipe': { icon: 'fa-eraser', text: 'Node wiped' },
		'node:rename': { icon: 'fa-pencil', text: 'Node renamed' }
	};

	function renderPager(container, page, total, onPick) {
		var pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
		if (pageCount <= 1) return;

		var bar = el('div', 'pnq-pager');
		bar.style.cssText = 'display:flex;gap:4px;margin-top:10px;flex-wrap:wrap;align-items:center';

		function btn(label, targetPage, disabled, active) {
			var b = el('button', 'btn btn-sm ' + (active ? 'btn-primary' : 'btn-ghost'));
			b.type = 'button';
			b.textContent = label;
			b.disabled = !!disabled;
			if (!disabled && !active) b.addEventListener('click', function () { onPick(targetPage); });
			return b;
		}

		bar.appendChild(btn('Previous', page - 1, page <= 1, false));

		var pages = [];
		var start = Math.max(1, page - 2), end = Math.min(pageCount, page + 2);
		if (start > 1) { pages.push(1); if (start > 2) pages.push('...'); }
		for (var p = start; p <= end; p++) pages.push(p);
		if (end < pageCount) { if (end < pageCount - 1) pages.push('...'); pages.push(pageCount); }

		pages.forEach(function (p) {
			if (p === '...') { var s = el('span', 'muted'); s.style.padding = '0 4px'; s.textContent = '...'; bar.appendChild(s); return; }
			bar.appendChild(btn(String(p), p, false, p === page));
		});

		bar.appendChild(btn('Next', page + 1, page >= pageCount, false));
		container.appendChild(bar);
	}

	function loadActivity() {
		var offset = (state.activity - 1) * PAGE_SIZE;
		var seq = ++state.activitySeq;
		App.api('/api/admin/activity?categories=lab,node&limit=' + PAGE_SIZE + '&offset=' + offset + searchParam()).then(function (res) {
			if (seq !== state.activitySeq) return;
			var c = document.getElementById('logs-activity-card'); if (!c) return;
			c.innerHTML = '';
			c.appendChild(el('div', 'card-title', 'Lab & node activity'));
			if (res.status !== 200 || !res.body || !res.body.data) {
				c.appendChild(el('p', 'muted', (res.body && res.body.message) || 'Could not load activity log.'));
				return;
			}
			var rows = res.body.data.data || [];
			var total = res.body.data.total || rows.length;
			if (!rows.length) { c.appendChild(el('p', 'muted', state.search ? 'No matching activity.' : 'No activity recorded yet.')); return; }

			var table = el('table', 'fm-table');
			var thead = el('thead');
			var hr = el('tr');
			hr.appendChild(el('th', null, 'When'));
			hr.appendChild(el('th', null, 'User'));
			hr.appendChild(el('th', null, 'Event'));
			hr.appendChild(el('th', null, 'Lab'));
			hr.appendChild(el('th', null, 'Node'));
			thead.appendChild(hr);
			table.appendChild(thead);
			var tbody = el('tbody');
			rows.forEach(function (r) {
				var tr = el('tr');
				tr.appendChild(el('td', null, fmtTs(r.created_at)));
				tr.appendChild(el('td', null, r.username || '—'));

				var key = r.category + ':' + r.action;
				var label = ACTIVITY_LABELS[key] || { icon: 'fa-circle', text: key };
				var evTd = el('td');
				var evIcon = el('i', 'fa ' + label.icon); evIcon.style.marginRight = '6px';
				evTd.appendChild(evIcon);
				evTd.appendChild(document.createTextNode(label.text));
				tr.appendChild(evTd);

				tr.appendChild(el('td', null, r.lab_name || '—'));

				var nodeTd = el('td');
				if (r.node_name) {
					nodeTd.appendChild(document.createTextNode(r.node_name + (r.node_template ? ' (' + r.node_template + ')' : '')));
				} else {
					nodeTd.appendChild(document.createTextNode('—'));
				}
				tr.appendChild(nodeTd);

				tbody.appendChild(tr);
			});
			table.appendChild(tbody);
			var tableWrap = el('div'); tableWrap.style.overflowX = 'auto'; tableWrap.appendChild(table); c.appendChild(tableWrap);

			renderPager(c, state.activity, total, function (p) {
				state.activity = p;
				loadActivity();
			});
		}).catch(function () {
			if (seq !== state.activitySeq) return;
			var c = document.getElementById('logs-activity-card'); if (!c) return;
			c.innerHTML = '';
			c.appendChild(el('div', 'card-title', 'Lab & node activity'));
			c.appendChild(el('p', 'muted', 'Could not load activity log.'));
		});
	}

	function loadSessions() {
		var offset = (state.sessions - 1) * PAGE_SIZE;
		var seq = ++state.sessionSeq;
		App.api('/api/admin/activity?categories=session&limit=' + PAGE_SIZE + '&offset=' + offset + searchParam()).then(function (res) {
			if (seq !== state.sessionSeq) return;
			var c = document.getElementById('logs-session-card'); if (!c) return;
			c.innerHTML = '';
			c.appendChild(el('div', 'card-title', 'User sessions'));
			if (res.status !== 200 || !res.body || !res.body.data) {
				c.appendChild(el('p', 'muted', (res.body && res.body.message) || 'Could not load session log.'));
				return;
			}
			var rows = res.body.data.data || [];
			var total = res.body.data.total || rows.length;
			if (!rows.length) { c.appendChild(el('p', 'muted', state.search ? 'No matching sessions.' : 'No login activity recorded yet.')); return; }

			var table = el('table', 'fm-table');
			var thead = el('thead');
			var hr = el('tr');
			hr.appendChild(el('th', null, 'When'));
			hr.appendChild(el('th', null, 'User'));
			hr.appendChild(el('th', null, 'IP'));
			hr.appendChild(el('th', null, 'Event'));
			hr.appendChild(el('th', null, 'Session length'));
			thead.appendChild(hr);
			table.appendChild(thead);
			var tbody = el('tbody');
			rows.forEach(function (r) {
				var tr = el('tr');
				tr.appendChild(el('td', null, fmtTs(r.created_at)));
				tr.appendChild(el('td', null, r.username || '—'));
				tr.appendChild(el('td', null, r.ip || '—'));

				var evTd = el('td');
				var evIcon = el('i', 'fa ' + (r.action === 'login' ? 'fa-sign-in' : 'fa-sign-out'));
				evIcon.style.marginRight = '6px';
				evTd.appendChild(evIcon);
				var evLabel = 'Logged out';
				if (r.action === 'login') {
					evLabel = 'Logged in';
				} else if (r.action === 'idle_logout' || r.detail === 'idle_timeout' || (r.action === 'logout' && (r.detail && r.detail.indexOf('idle') !== -1))) {
					evLabel = 'Logged out (idle timeout)';
				}
				evTd.appendChild(document.createTextNode(evLabel));
				tr.appendChild(evTd);

				var isLogout = (r.action === 'logout' || r.action === 'idle_logout');
				tr.appendChild(el('td', null, isLogout ? fmtDuration(r.duration_seconds) : '—'));

				tbody.appendChild(tr);
			});
			table.appendChild(tbody);
			var tableWrap = el('div'); tableWrap.style.overflowX = 'auto'; tableWrap.appendChild(table); c.appendChild(tableWrap);

			renderPager(c, state.sessions, total, function (p) {
				state.sessions = p;
				loadSessions();
			});
		}).catch(function () {
			if (seq !== state.sessionSeq) return;
			var c = document.getElementById('logs-session-card'); if (!c) return;
			c.innerHTML = '';
			c.appendChild(el('div', 'card-title', 'User sessions'));
			c.appendChild(el('p', 'muted', 'Could not load session log.'));
		});
	}

	App.register('logs', { title: 'Logs', icon: 'fa-history', admin: true, render: render });
})();
