/* Route bridge only: the Icons page is owned by the Svelte island. */
(function () {
	'use strict';
	var App = window.PnqApp;
	var destroyIcons = null;

	function tryMount(view) {
		if (window.PnqIconsManager && typeof window.PnqIconsManager.mount === 'function') {
			view.innerHTML = '';
			destroyIcons = window.PnqIconsManager.mount(view);
			return true;
		}
		return false;
	}

	App.register('icons', {
		title: 'Icons', icon: 'fa-picture-o', admin: true,
		render: function (view) {
			if (tryMount(view)) return;

			var candidates = [
				'/themes/default/islands/js/icons-manager.js',
				'/themes/default/islands/js/icons-manager.C98G_LsC.js'
			];

			function tryLoad(idx) {
				if (idx >= candidates.length) {
					if (!tryMount(view)) {
						var message = document.createElement('p');
						message.className = 'pnq-icons__boot-error';
						message.textContent = 'The Icons page is unavailable. Refresh the page to try again.';
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
			if (destroyIcons) destroyIcons();
			destroyIcons = null;
		}
	});
})();
