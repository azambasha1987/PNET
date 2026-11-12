/* ============================================================================
   pnq-branding.js — shared client helper for GUI-configurable branding.
   Loaded by the login page, the /main/ dashboard and the lab page; each one
   paints the same three things (product name, logo, login header) from the
   PUBLIC endpoint /branding/api.php?action=config.

   Classic script, no ESM, no strict-only syntax (the engine loads it alongside
   sloppy-mode legacy code). CSP-safe: external file, textContent only, never
   innerHTML — the name and header are admin-supplied strings and must never be
   parsed as markup.
   ============================================================================ */
(function () {
	'use strict';

	var DEFAULTS = { name: 'PNetLab', login_header: '', footer: '', hide_default_creds: false, hide_version_nonadmin: false, theme_profile: 'nord', logo: false, token: '' };
	var pending = null;
	var lastSuccessful = null;
	var requestSequence = 0;
	var appliedSequence = 0;

	function validTheme(value) {
		return [
			'nord', 'light', 'dark', 'ocean-teal', 'mint-teal', 'macos-26-dark',
			'solarized-light', 'high-contrast', 'high-contrast-light',
			'dracula', 'cyberpunk', 'matrix', 'solarized'
		].indexOf(value) !== -1;
	}
	function sanitize(d) {
		if (!d || typeof d !== 'object') d = {};
		var prof = d.theme_profile;
		if (prof === 'ocean-teal') prof = 'nord';
		return {
			name: (typeof d.name === 'string' && d.name) ? d.name : DEFAULTS.name,
			login_header: (typeof d.login_header === 'string') ? d.login_header : '',
			footer: (typeof d.footer === 'string') ? d.footer : '',
			hide_default_creds: !!d.hide_default_creds,
			hide_version_nonadmin: !!d.hide_version_nonadmin,
			theme_profile: validTheme(prof) ? prof : DEFAULTS.theme_profile,
			logo: !!d.logo,
			token: (typeof d.token === 'string') ? d.token : ''
		};
	}

	/* Anti-flash. The pages ship stock text ("PNetLab", the
	   admin/pnet line, the stock footer) and the config arrives a beat after the
	   first paint, so a refresh flashed the stock values. Two guards:
	   1. the last good config is cached in localStorage and painted at
	      DOMContentLoaded, so a refresh shows the custom values immediately;
	   2. until a config has been painted, the brandable text is kept invisible
	      (visibility, so the layout never shifts). A safety timer releases it
	      should no page ever call apply(). */
	var CACHE_KEY = 'pnq.branding.cache';
	var PENDING_CLASS = 'pnq-brand-pending';
	function readCache() {
		try {
			var raw = window.localStorage.getItem(CACHE_KEY);
			return raw ? sanitize(JSON.parse(raw)) : null;
		} catch (e) { return null; }
	}
	function writeCache(cfg) {
		try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch (e) {}
	}
	var cached = readCache();
	var docEl = document.documentElement;
	docEl.classList.add(PENDING_CLASS);
	var guard = document.createElement('style');
	guard.textContent = '.' + PENDING_CLASS + ' [data-brand-name],.' + PENDING_CLASS + ' [data-brand-footer-default],.'
		+ PENDING_CLASS + ' [data-brand-creds],.' + PENDING_CLASS + ' [data-brand-login-header]{visibility:hidden!important}';
	(document.head || docEl).appendChild(guard);
	function release() { docEl.classList.remove(PENDING_CLASS); }
	setTimeout(release, 3000);

	/* Fetch the branding config. NEVER rejects: a failed/garbled fetch resolves
	   to stock defaults, because every caller paints chrome that must render
	   even when this endpoint is unreachable. */
	function loadResult(force) {
		if (pending && !force) return pending;
		var requestId = ++requestSequence;
		var request = fetch('/branding/api.php?action=config', { credentials: 'same-origin', cache: 'no-store' })
			.then(function (r) {
				if (!r.ok) throw new Error('branding config unavailable');
				return r.json();
			})
			.then(function (d) {
				var clean = sanitize(d);
				if (requestId >= appliedSequence) {
					appliedSequence = requestId;
					lastSuccessful = clean;
					writeCache(clean);
				}
				return { ok: true, config: clean };
			})
			.catch(function () {
				return { ok: false, config: lastSuccessful || cached || DEFAULTS };
			});
		var tracked = request.then(function (result) {
			if (pending === tracked) pending = null;
			return result;
		});
		pending = tracked;
		return pending;
	}
	function load(force) {
		return loadResult(force).then(function (result) { return result.config; });
	}

	/* Logo URL for a given config. The ?v= token changes only when the image
	   actually changes, so browsers keep their cache entry across reloads but
	   pick up a new logo immediately. */
	function logoUrl(cfg) {
		var t = (cfg && cfg.token) ? cfg.token : '';
		return '/branding/api.php?action=logo' + (t ? '&v=' + encodeURIComponent(t) : '');
	}

	/* Point every branded <img> at the endpoint and swap every wordmark node.
	   Selectors are opt-in (data-brand-logo / data-brand-name) so a page only
	   rebrands what it marked, and untouched markup keeps working. */
	function apply(cfg) {
		var url = logoUrl(cfg);
		document.querySelectorAll('[data-brand-logo]').forEach(function (img) {
			img.src = url;
			if (img.tagName === 'IMG') img.alt = cfg.name;
		});
		document.querySelectorAll('[data-brand-name]').forEach(function (n) {
			n.textContent = cfg.name;
		});
		document.querySelectorAll('link[rel~="icon"]').forEach(function (l) { l.href = url; });
		/* Footer: a page marks its stock footer with
		   data-brand-footer-default and an empty sibling with data-brand-footer.
		   A custom footer shows the sibling and hides the stock one; clearing it
		   swaps back, so the stock footer (e.g. the live version number) is never
		   overwritten. display, not [hidden]: page CSS sets display on these. */
		var footer = (cfg && typeof cfg.footer === 'string') ? cfg.footer : '';
		document.querySelectorAll('[data-brand-footer]').forEach(function (n) {
			n.textContent = footer;
			n.style.display = footer ? '' : 'none';
		});
		document.querySelectorAll('[data-brand-footer-default]').forEach(function (n) {
			n.style.display = footer ? 'none' : '';
		});
		/* Login page extras, marked opt-in like the rest: the admin-supplied
		   header line (textContent, never markup) and the "Default account" line.
		   The latter is hidden with visibility, not [hidden]: its bottom margin is
		   the gap between the version line and the login form, so its box stays. */
		document.querySelectorAll('[data-brand-login-header]').forEach(function (n) {
			n.textContent = cfg.login_header || '';
			n.hidden = !cfg.login_header;
		});
		document.querySelectorAll('[data-brand-creds]').forEach(function (n) {
			n.style.visibility = cfg.hide_default_creds ? 'hidden' : '';
			if (cfg.hide_default_creds) n.setAttribute('aria-hidden', 'true');
			else n.removeAttribute('aria-hidden');
		});
		var tpl = document.documentElement.getAttribute('data-brand-title');
		if (tpl) document.title = tpl.replace('%s', cfg.name);
		release();
	}

	/* Repaint from the cache before the first paint on every page that loads
	   this helper; the live fetch then confirms or corrects it. */
	if (cached) {
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', function () { apply(cached); });
		} else {
			apply(cached);
		}
	}

	window.PnqBranding = { load: load, loadResult: loadResult, apply: apply, logoUrl: logoUrl, defaults: DEFAULTS, sanitize: sanitize,
		cached: function () { return cached; } };
})();
