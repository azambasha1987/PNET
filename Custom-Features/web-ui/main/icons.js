/* ============================================================================
   PNetLab Dashboard — Icons View (Resource Library & Node Icon Manager)
   Provides instant search across all 800+ node icons and PNG, JPG, SVG upload.
   ============================================================================ */
(function () {
	'use strict';
	var App = window.PnqApp;
	if (!App) return;

	var el = App.el;

	function viewTitle(t, i) {
		var d = el('div', 'view-title');
		d.appendChild(el('i', 'fa ' + i));
		d.appendChild(document.createTextNode(' ' + t));
		return d;
	}

	function btn(icon, label, cls, fn) {
		var b = el('button', cls);
		b.type = 'button';
		b.appendChild(el('i', 'fa ' + icon));
		if (label) b.appendChild(document.createTextNode(' ' + label));
		b.addEventListener('click', fn);
		return b;
	}

	function render(view) {
		view.innerHTML = '';

		// 1. Header Toolbar
		var head = el('div', 'view-head vh-ruled');
		var left = el('div');
		left.style.cssText = 'display:flex;align-items:center;gap:14px;flex-wrap:wrap';
		left.appendChild(viewTitle('Icons', 'fa-picture-o'));

		var chip = el('span', 'vh-chip');
		chip.id = 'pnet-icons-chip';
		chip.appendChild(el('i', 'fa fa-picture-o'));
		var chipCount = el('span', 'n', '0');
		chip.appendChild(chipCount);
		chip.appendChild(document.createTextNode(' icons'));
		left.appendChild(chip);
		head.appendChild(left);

		var hr = el('div', 'toolbar');
		hr.style.cssText = 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;';

		// Search Box
		var searchWrap = el('div');
		searchWrap.style.cssText = 'display:inline-flex;align-items:center;gap:8px;background:var(--pnq-surface-2, rgba(255,255,255,0.06));border:1px solid var(--pnq-border, rgba(255,255,255,0.15));border-radius:6px;padding:5px 12px;';
		var sIcon = el('i', 'fa fa-search');
		sIcon.style.cssText = 'color:var(--pnq-text-muted, #94a3b8);font-size:12px;';
		searchWrap.appendChild(sIcon);

		var sInput = el('input');
		sInput.id = 'pnet-icons-search-input';
		sInput.type = 'text';
		sInput.placeholder = 'Search 800+ icons by name…';
		sInput.style.cssText = 'background:transparent;border:none;outline:none;color:var(--pnq-text, #f8fafc);font-size:12px;width:240px;';
		searchWrap.appendChild(sInput);
		hr.appendChild(searchWrap);

		var refreshBtn = btn('fa-refresh', 'Refresh', 'btn btn-ghost', function () {
			loadIcons();
		});
		hr.appendChild(refreshBtn);

		var uploadBtn = btn('fa-cloud-upload', 'Upload Icon', 'btn btn-primary', function () {
			var fileIn = document.getElementById('pnet-icon-hidden-file');
			if (fileIn) fileIn.click();
		});
		hr.appendChild(uploadBtn);
		head.appendChild(hr);
		view.appendChild(head);

		// 2. Drag & Drop Upload Zone
		var dropCard = el('div', 'card');
		dropCard.style.cssText = 'margin-bottom:16px;padding:22px;border:2px dashed var(--pnq-border, rgba(255,255,255,0.18));border-radius:8px;background:var(--pnq-surface, rgba(15,23,42,0.4));text-align:center;cursor:pointer;transition:all 0.2s ease;';
		dropCard.innerHTML = '<i class="fa fa-cloud-upload" style="font-size:32px;color:var(--pnq-accent, #38bdf8);margin-bottom:8px;display:block;"></i>' +
			'<div style="font-weight:600;font-size:14px;color:var(--pnq-text, #f8fafc);">Drag & Drop PNG, JPG, or SVG Icons Here</div>' +
			'<div style="font-size:12px;color:var(--pnq-text-muted, #94a3b8);margin-top:4px;">Supports all custom vendor & node images. Click to select files.</div>' +
			'<input type="file" id="pnet-icon-hidden-file" accept=".png,.jpg,.jpeg,.svg" multiple style="display:none;">';
		view.appendChild(dropCard);

		// 3. Grid Container Card
		var gridCard = el('div', 'card');
		gridCard.style.cssText = 'padding:16px;';
		var gridStatus = el('div');
		gridStatus.id = 'pnet-icons-status';
		gridStatus.style.cssText = 'font-size:12px;color:var(--pnq-text-muted, #94a3b8);margin-bottom:12px;';
		gridStatus.textContent = 'Loading icon catalog…';
		gridCard.appendChild(gridStatus);

		var grid = el('div');
		grid.id = 'pnet-icons-catalog-grid';
		grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:12px;max-height:680px;overflow-y:auto;padding-right:6px;';
		gridCard.appendChild(grid);
		view.appendChild(gridCard);

		// File Upload Handlers
		var fileInput = dropCard.querySelector('#pnet-icon-hidden-file');
		dropCard.addEventListener('click', function () { fileInput.click(); });
		dropCard.addEventListener('dragover', function (e) {
			e.preventDefault();
			dropCard.style.borderColor = 'var(--pnq-accent, #38bdf8)';
			dropCard.style.background = 'var(--pnq-surface-2, rgba(56,189,248,0.08))';
		});
		dropCard.addEventListener('dragleave', function () {
			dropCard.style.borderColor = 'var(--pnq-border, rgba(255,255,255,0.18))';
			dropCard.style.background = 'var(--pnq-surface, rgba(15,23,42,0.4))';
		});
		dropCard.addEventListener('drop', function (e) {
			e.preventDefault();
			dropCard.style.borderColor = 'var(--pnq-border, rgba(255,255,255,0.18))';
			dropCard.style.background = 'var(--pnq-surface, rgba(15,23,42,0.4))';
			if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
		});
		fileInput.addEventListener('change', function () {
			if (fileInput.files) handleFiles(fileInput.files);
		});

		function handleFiles(files) {
			if (!files || !files.length) return;
			var queue = Array.from(files);
			var completed = 0;
			var errors = 0;
			dropCard.style.opacity = '0.7';

			queue.forEach(function (f) {
				var fd = new FormData();
				fd.append('file', f);
				fd.append('icon', f); // Compatibility dual-key
				fetch('/api/icons/upload', { credentials: 'same-origin', method: 'POST', body: fd })
					.then(function (r) { return r.json(); })
					.then(function (res) {
						if (res.code === 200 || res.status === 'success') {
							completed++;
						} else {
							errors++;
						}
					})
					.catch(function () { errors++; })
					.then(function () {
						if (completed + errors === queue.length) {
							dropCard.style.opacity = '1';
							if (completed > 0) {
								App.toast('Successfully uploaded ' + completed + ' icon(s)', 'ok');
								loadIcons();
							}
							if (errors > 0) {
								App.toast(errors + ' icon upload(s) failed or invalid extension', 'error');
							}
						}
					});
			});
		}

		function loadIcons() {
			gridStatus.textContent = 'Refreshing icon library…';
			fetch('/api/icons', { credentials: 'same-origin' })
				.then(function (r) { return r.json(); })
				.then(function (icons) {
					grid.innerHTML = '';
					var filenames = Object.keys(icons).sort(function (a, b) {
						return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
					});

					chipCount.textContent = filenames.length;
					gridStatus.textContent = 'Showing ' + filenames.length + ' node icons';

					filenames.forEach(function (filename) {
						var card = el('div', 'pnet-icon-box');
						card.dataset.name = filename.toLowerCase();
						card.style.cssText = 'background:var(--pnq-surface-2, rgba(255,255,255,0.04));border:1px solid var(--pnq-border, rgba(255,255,255,0.08));border-radius:6px;padding:10px 6px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer;transition:all 0.15s;';
						card.innerHTML = '<div style="width:52px;height:52px;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.25);border-radius:4px;padding:4px;">' +
							'<img src="/images/icons/' + encodeURIComponent(filename) + '" style="max-width:44px;max-height:44px;object-fit:contain;" alt="' + filename + '">' +
							'</div>' +
							'<div style="font-size:11px;font-weight:500;color:var(--pnq-text, #f8fafc);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:115px;" title="' + filename + '">' + filename + '</div>' +
							'<button type="button" class="btn btn-ghost btn-xs" style="font-size:10px;padding:2px 8px;opacity:0.8;" title="Copy icon name"><i class="fa fa-clipboard"></i> Copy</button>';

						card.querySelector('button').addEventListener('click', function (e) {
							e.stopPropagation();
							navigator.clipboard.writeText(filename);
							App.toast('Copied: ' + filename, 'info');
						});
						grid.appendChild(card);
					});

					applyFilter();
				})
				.catch(function () {
					gridStatus.textContent = 'Could not load icon catalog.';
				});
		}

		function applyFilter() {
			var q = (sInput.value || '').toLowerCase().trim();
			var visible = 0;
			var total = 0;
			grid.querySelectorAll('.pnet-icon-box').forEach(function (card) {
				total++;
				var match = (!q || card.dataset.name.indexOf(q) !== -1);
				card.style.display = match ? 'flex' : 'none';
				if (match) visible++;
			});
			if (q) {
				gridStatus.textContent = 'Showing ' + visible + ' of ' + total + ' node icons matching "' + q + '"';
			} else {
				gridStatus.textContent = 'Showing ' + total + ' node icons';
			}
		}

		sInput.addEventListener('input', applyFilter);
		loadIcons();
	}

	// Register with App router
	App.register('icons', { title: 'Icons', icon: 'fa-picture-o', admin: true, render: render });

	// Auto-route if navigated directly
	if (window.location.hash === '#/icons') {
		var view = document.getElementById('view');
		if (view) render(view);
	}
})();

