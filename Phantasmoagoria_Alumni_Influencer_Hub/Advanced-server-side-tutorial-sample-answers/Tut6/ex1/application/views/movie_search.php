<?php
defined('BASEPATH') OR exit('No direct script access allowed');

?><!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>Movie Search – OMDB API</title>
	<style>
		body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 900px; }
		h1 { color: #333; margin-bottom: 0.5rem; }
		.subtitle { color: #666; font-size: 0.95rem; margin-bottom: 1.5rem; }
		.form-row { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
		.form-row input[type="text"] { flex: 1; padding: 0.5rem 0.75rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; }
		.form-row button { padding: 0.5rem 1.25rem; font-size: 1rem; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
		.form-row button:hover { background: #1d4ed8; }
		.form-row button:disabled { background: #94a3b8; cursor: not-allowed; }
		#message { margin-bottom: 1rem; padding: 0.75rem; border-radius: 4px; }
		#message.error { background: #fef2f2; color: #b91c1c; }
		#message.info { background: #f0f9ff; color: #0369a1; }
		#results { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1.25rem; }
		.movie-card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fafafa; }
		.movie-card .poster { width: 100%; aspect-ratio: 2/3; object-fit: cover; background: #e5e7eb; }
		.movie-card .title { padding: 0.5rem 0.6rem; font-weight: 600; font-size: 0.9rem; line-height: 1.3; }
		.movie-card .year { padding: 0 0.6rem 0.5rem; font-size: 0.8rem; color: #6b7280; }
	</style>
</head>
<body>
	<h1>Movie Search</h1>
	<p class="subtitle">Search by title using the <a href="https://www.omdbapi.com/" target="_blank" rel="noopener">OMDB API</a>. Results show title and poster.</p>

	<form id="searchForm" action="#" method="get">
		<div class="form-row">
			<input type="text" id="query" name="q" placeholder="Enter movie title..." required autofocus>
			<button type="submit" id="submitBtn">Search</button>
		</div>
	</form>

	<div id="message" role="alert" aria-live="polite" style="display: none;"></div>
	<div id="results"></div>

	<script>
	(function () {

		var API_KEY = <?php echo json_encode($api_key); ?>;

		var form = document.getElementById('searchForm');
		var queryInput = document.getElementById('query');
		var submitBtn = document.getElementById('submitBtn');
		var messageEl = document.getElementById('message');
		var resultsEl = document.getElementById('results');

		function showMessage(text, type) {
			messageEl.textContent = text;
			messageEl.className = type || 'info';
			messageEl.style.display = text ? 'block' : 'none';
		}

		function setLoading(loading) {
			submitBtn.disabled = loading;
			submitBtn.textContent = loading ? 'Searching…' : 'Search';
		}

		form.addEventListener('submit', function (e) {
			e.preventDefault();
			var q = queryInput.value.trim();
			if (!q) return;

			setLoading(true);
			showMessage('');
			resultsEl.innerHTML = '';

			// Build search URL: apikey and s=search term (OMDB docs)
			var url = 'https://www.omdbapi.com/?apikey=' + encodeURIComponent(API_KEY) + '&s=' + encodeURIComponent(q);

			fetch(url)
				.then(function (res) { return res.json(); })
				.then(function (data) {
					setLoading(false);
					if (data.Response === 'False') {
						// OMDB returns "Too many results." when the query is very broad.
						// Explain this clearly to the user so they can refine the search.
						if (data.Error === 'Too many results.') {
							showMessage('Too many results. Please type a more specific movie title (e.g. include more words or the year).', 'error');
						} else {
							showMessage(data.Error || 'No results found.', 'error');
						}
						return;
					}
					var search = data.Search || [];
					if (search.length === 0) {
						showMessage('No movies found.', 'info');
						return;
					}
					showMessage('Found ' + search.length + ' result(s).', 'info');
					// Extract title and poster URL from each item; Poster may be "N/A"
					search.forEach(function (movie) {
						var card = document.createElement('div');
						card.className = 'movie-card';
						var title = movie.Title || 'Unknown';
						var year = movie.Year || '';
						var posterUrl = (movie.Poster && movie.Poster !== 'N/A') ? movie.Poster : '';
						card.innerHTML =
							'<img class="poster" src="' + (posterUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'300\'%3E%3Crect fill=\'%23e5e7eb\' width=\'200\' height=\'300\'/%3E%3Ctext fill=\'%239ca3af\' x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\'%3ENo image%3C/text%3E%3C/svg%3E') + '" alt="Poster for ' + escapeHtml(title) + '">' +
							'<div class="title">' + escapeHtml(title) + '</div>' +
							'<div class="year">' + escapeHtml(year) + '</div>';
						resultsEl.appendChild(card);
					});
				})
				.catch(function (err) {
					setLoading(false);
					showMessage('Request failed: ' + err.message, 'error');
				});
		});

		function escapeHtml(s) {
			var div = document.createElement('div');
			div.textContent = s;
			return div.innerHTML;
		}
	})();
	</script>
</body>
</html>
