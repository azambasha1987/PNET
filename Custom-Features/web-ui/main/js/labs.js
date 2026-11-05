/* Route bridge only: Labs UI and state rendering are owned by the Svelte island. */
(function () {
	'use strict';
	var App = window.PnqApp;
	var destroyLabs = null;

	function tryMount(view) {
		if (window.PnqLabsWorkspace && typeof window.PnqLabsWorkspace.mount === 'function') {
			view.innerHTML = '';
			destroyLabs = window.PnqLabsWorkspace.mount(view);
			return true;
		}
		return false;
	}

	App.register('labs', {
		title: 'Labs', icon: 'fa-sitemap',
		render: function (view) {
			if (tryMount(view)) return;

			var candidates = [
				'/themes/default/islands/js/labs-workspace.js',
				'/themes/default/islands/js/labs-workspace.DrKrg-M6.js'
			];

			function tryLoad(idx) {
				if (idx >= candidates.length) {
					if (!tryMount(view)) {
						var message = document.createElement('p');
						message.className = 'pnq-labs__boot-error';
						message.textContent = 'The Labs workspace is unavailable. Refresh the page to try again.';
						view.appendChild(message);
					}
					return;
				}
				import(candidates[idx])
					.then(function () {
						if (!tryMount(view)) {
							tryLoad(idx + 1);
						}
					})
					.catch(function () {
						tryLoad(idx + 1);
					});
			}

			tryLoad(0);
		},
		destroy: function () {
			if (destroyLabs) destroyLabs();
			destroyLabs = null;
		}
	});
})();
