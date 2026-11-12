/* Appliance-wide appearance profiles. The server is authoritative; the local
 * cache is only an anti-flash hint. Lab canvas light/dark is intentionally not
 * owned here and remains in pnq.canvasflow.theme. */
(function (root) {
	'use strict';

	var CACHE_KEY = 'pnq.appearance.theme';
	var PROFILES = {
		nord: { id: 'nord', label: 'Nord Arctic (Default)', mode: 'dark', description: 'Frosted polar slate surfaces with calm cyan accents.' },
		'ocean-teal': { id: 'nord', label: 'Nord Arctic', mode: 'dark', description: 'Frosted polar slate surfaces with calm cyan accents.' },
		dark: { id: 'dark', label: 'Obsidian Slate', mode: 'dark', description: 'Neutral charcoal dark surfaces with blue chrome.' },
		light: { id: 'light', label: 'Crisp Daylight', mode: 'light', description: 'Clean high-contrast daylight surfaces.' },
		dracula: { id: 'dracula', label: 'Dracula Gothic', mode: 'dark', description: 'Dark plum surfaces with neon pink accents.' },
		cyberpunk: { id: 'cyberpunk', label: 'Cyberpunk Neon', mode: 'dark', description: 'Synthwave violet with vibrant cyan.' },
		matrix: { id: 'matrix', label: 'Retro Terminal', mode: 'dark', description: 'Pitch black with phosphor green matrix.' },
		solarized: { id: 'solarized', label: 'Solarized NOC', mode: 'dark', description: 'Deep oceanic teal surfaces.' },
		'solarized-light': { id: 'solarized-light', label: 'Solarized Light', mode: 'light', description: 'Warm light parchment surfaces.' },
		'high-contrast': { id: 'high-contrast', label: 'High Contrast', mode: 'dark', description: 'OLED black surfaces with bright outlines.' },
		'high-contrast-light': { id: 'high-contrast-light', label: 'High Contrast Light', mode: 'light', description: 'Stark white surfaces with pure black text.' },
		'mint-teal': { id: 'mint-teal', label: 'Catppuccin Frappe', mode: 'dark', description: 'Soft charcoal surfaces with a calm periwinkle-blue accent.' },
		'macos-26-dark': { id: 'macos-26-dark', label: 'macOS Dark', mode: 'dark', description: 'Graphite surfaces, luminous blue, and glass chrome.' }
	};
	var current = 'nord';
	var confirmed = false;
	var readGeneration = 0;
	var writeGeneration = 0;
	var savesInFlight = 0;
	var refreshQueued = false;

	function valid(value) { return typeof value === 'string' && (!!PROFILES[value] || value === 'ocean-teal'); }
	function normalize(value) {
		if (value === 'ocean-teal') return 'nord';
		return valid(value) ? value : null;
	}
	function mode(value) { return PROFILES[normalize(value) || 'nord'].mode; }
	function profile(value) { return PROFILES[normalize(value) || 'nord']; }
	function cached() {
		try {
			var val = root.localStorage.getItem(CACHE_KEY) ||
			          root.localStorage.getItem('pnq.main.theme') ||
			          root.localStorage.getItem('pnq_active_palette');
			return normalize(val);
		} catch (e) { return null; }
	}
	function read() { return current; }
	function apply(value, isConfirmed) {
		var next = normalize(value) || 'nord';
		current = next;
		var m = mode(next);
		if (isConfirmed) {
			confirmed = true;
			try {
				root.localStorage.setItem(CACHE_KEY, next);
				root.localStorage.setItem('pnq.main.theme', next);
				root.localStorage.setItem('pnq_active_palette', next);
				root.localStorage.setItem('pnq.canvasflow.theme', next);
			} catch (e) {}
		}
		var doc = root.document;
		if (doc && doc.documentElement) {
			doc.documentElement.dataset.theme = m;
			doc.documentElement.dataset.themeProfile = next;
			doc.documentElement.setAttribute('data-theme', m);
			doc.documentElement.setAttribute('data-theme-profile', next);
			if (doc.body) {
				doc.body.dataset.theme = m;
				doc.body.dataset.themeProfile = next;
				doc.body.setAttribute('data-theme', m);
				doc.body.setAttribute('data-theme-profile', next);
				doc.body.className = doc.body.className.replace(/\bpnq-[a-z0-9_-]+\b/g, '').trim() + ' pnq-' + next + ' pnq-' + m;
			}
		}
		return next;
	}
	function announce(value, source) {
		var next = apply(value, true);
		try {
			root.dispatchEvent(new CustomEvent('pnq:theme-change', { detail: { profile: next, mode: mode(next), source: source || 'server' } }));
		} catch (e) {}
		return next;
	}
	function refresh(force) {
		if (!root.PnqBranding || !root.PnqBranding.loadResult) return Promise.resolve({ ok: false, profile: current });
		if (savesInFlight > 0) {
			refreshQueued = true;
			return Promise.resolve({ ok: false, profile: current });
		}
		var requestedAt = ++readGeneration;
		return root.PnqBranding.loadResult(!!force).then(function (result) {
			if (!result.ok || requestedAt !== readGeneration) return { ok: false, profile: current };
			var srvTheme = result.config.theme_profile;
			if (srvTheme === 'ocean-teal') srvTheme = 'nord';
			return { ok: true, profile: announce(srvTheme, 'server') };
		});
	}
	function save(value) {
		var next = normalize(value);
		if (!next) return Promise.reject(new Error('Invalid theme profile.'));
		var writeId = ++writeGeneration;
		readGeneration += 1;
		savesInFlight += 1;
		var request = fetch('/branding/api.php?action=save_theme', {
			method: 'POST', credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json', 'X-PNetLab-Request': 'theme-settings' },
			body: JSON.stringify({ theme_profile: next })
		}).then(function (response) {
			return response.text().then(function (text) {
				var body = {};
				try { body = text ? JSON.parse(text) : {}; } catch (e) {}
				if (!response.ok || !valid(body.theme_profile)) throw new Error(body.error || 'Could not save the appliance theme.');
				if (writeId !== writeGeneration) return current;
				var savedTheme = body.theme_profile;
				if (savedTheme === 'ocean-teal') savedTheme = 'nord';
				return announce(savedTheme, 'save');
			});
		});
		return request.then(function (result) {
			savesInFlight -= 1;
			if (savesInFlight === 0 && refreshQueued) { refreshQueued = false; refresh(true); }
			return result;
		}, function (error) {
			savesInFlight -= 1;
			if (savesInFlight === 0 && refreshQueued) { refreshQueued = false; refresh(true); }
			throw error;
		});
	}
	function isConfirmed() { return confirmed; }

	root.PnqTheme = {
		key: CACHE_KEY,
		profiles: PROFILES,
		list: Object.keys(PROFILES).filter(function (id) { return id !== 'ocean-teal'; }).map(function (id) { return PROFILES[id]; }),
		valid: valid, normalize: normalize, read: read, mode: mode, profile: profile,
		apply: apply, confirm: announce, refresh: refresh, save: save, isConfirmed: isConfirmed
	};

	apply(cached() || 'nord', false);
	if (root.document && !root.document.body) {
		root.document.addEventListener('DOMContentLoaded', function () { apply(current, false); });
	}
	refresh(false);
	root.addEventListener('focus', function () { refresh(true); });
	root.addEventListener('storage', function (event) {
		if (event.key === CACHE_KEY || event.key === 'pnq.main.theme') refresh(true);
	});
})(window);

