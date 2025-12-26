const BASE_URL = "https://api.citybik.es/v2";

// Helper: country code -> flag emoji
function codeToFlag(cc){
	if(!cc || typeof cc !== 'string') return '';
	try{
		return cc.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));
	}catch(e){ return cc; }
}

// Helper: full country name (Intl.DisplayNames), fallback to code
const _regionNames = (typeof Intl !== 'undefined' && Intl.DisplayNames) ? new Intl.DisplayNames(['en'], {type: 'region'}) : null;
function countryName(cc){
	if(!cc) return '';
	try{ return (_regionNames && _regionNames.of(cc.toUpperCase())) || cc; }catch(e){ return cc; }
}

// UI helper: show info/error messages
function showMessage(text, type='info'){
	const el = document.getElementById('message');
	if(!el) return;
	el.textContent = text || '';
	el.style.display = text ? 'block' : 'none';
	if(type === 'error') el.style.background = 'rgba(220,38,38,0.08)';
	else el.style.background = 'rgba(255,255,255,0.03)';
}

async function fetchData(endpoint) {
	try {
		const res = await fetch(`${BASE_URL}${endpoint}`);
		if (!res.ok) throw new Error('Network response was not ok');
		return await res.json();
	} catch (error) {
		alert("API Error");
		console.error(error);
	}
}

async function loadNetworks(q = '') {
	showMessage('Loading networks...');
	const data = await fetchData('/networks');
	const container = document.getElementById('networks');
	// Clear stations view when returning to networks/home so back button is removed
	const stationsEl = document.getElementById('stations');
	if (stationsEl) stationsEl.innerHTML = '';
	const summaryEl = document.getElementById('countrySummary');
	container.innerHTML = '';
	if (summaryEl) summaryEl.innerHTML = '';
	if (!data || !data.networks) { showMessage('No network data available.', 'error'); return; }

	// store last networks for country aggregated actions
	window._lastNetworks = data.networks || [];

	// dedupe networks by id
	const seen = new Set();
	const deduped = data.networks.filter(n => {
		if(!n || !n.id) return false; // ignore malformed
		if(seen.has(n.id)) return false; seen.add(n.id); return true;
	});

	const filtered = deduped.filter(n => {
		const qLower = (q || '').toLowerCase();
		const name = (n.name || '').toLowerCase();
		const city = (n.location && n.location.city || '').toLowerCase();
		const ccRaw = (n.location && n.location.country || '');
		const cc = ccRaw.toLowerCase();
		const cname = (countryName(ccRaw) || '').toLowerCase();
		// match by network name, city, exact country code, or country name substring
		return name.includes(qLower) || city.includes(qLower) || cc === qLower || cname.includes(qLower);
	});

	// Render country summary (counts)
	if (summaryEl) {
		const counts = filtered.reduce((acc, n) => {
			const cc = (n.location && n.location.country) || '';
			if(!cc) return acc;
			acc[cc] = (acc[cc] || 0) + 1;
			return acc;
		}, {});

		const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
		summaryEl.innerHTML = entries.map(([cc, cnt]) => {
			const flag = codeToFlag(cc);
			const name = countryName(cc);
			return `<span class="country-pill" data-cc="${cc}" title="${name}">${flag} ${name} (${cnt})</span>`;
		}).join(' ');

		// clicking a country pill filters to that country's networks (shows places)
		summaryEl.addEventListener('click', (e) => {
			const pill = e.target.closest('.country-pill');
			if(!pill) return;
			const cc = pill.dataset.cc;
			if(!cc) return;
			const searchInput = document.getElementById('search');
			const displayName = countryName(cc) || cc;
			if(searchInput) searchInput.value = displayName;
			// call loadNetworks to show networks in that country (user can click "See stations" per place)
			loadNetworks(displayName);
			// scroll to networks section for clarity
			const networksEl = document.getElementById('networks');
			if(networksEl) networksEl.scrollIntoView({behavior: 'smooth', block: 'start'});
		});
	}
	// show a reasonable number of results to avoid huge pages
	const DISPLAY_LIMIT = 60;
	filtered.slice(0, DISPLAY_LIMIT).forEach(net => {
		const cc = (net.location && net.location.country) || '';
		const flag = codeToFlag(cc);
		const cname = countryName(cc);
		container.innerHTML += `
			<div class="card">
				<h3>${net.name || 'Unnamed network'}</h3>
				<p>${flag} ${net.location && net.location.city ? net.location.city + ',' : ''} ${cname || cc}</p>
				<button type="button" data-id="${net.id}" class="viewStations" aria-label="See stations for ${net.name}">See stations</button>
			</div>
		`;
	});

	if(filtered.length === 0){
		showMessage('No networks match your search. Try a different city or country.');
	} else if(filtered.length > DISPLAY_LIMIT){
		showMessage(`Showing ${DISPLAY_LIMIT} of ${filtered.length} matching networks. Narrow the search to see more.`);
	} else {
		showMessage('');
	}

	// fallback: attach click listeners directly to any generated buttons (robustness)
	setTimeout(()=>{
		container.querySelectorAll('button.viewStations').forEach(btn => {
			if(!btn._listenerAttached){
				btn.addEventListener('click', (e)=>{
					const id = btn.dataset.id;
					if(!id) return showMessage('Network id missing', 'error');
					loadStations(id);
				});
				btn._listenerAttached = true;
			}
		});
	}, 0);

	// Note: country searches now filter networks by country (above). We do NOT auto-open
	// stations for the entire country here — users click "See stations" on a specific place.

	// event delegation: handled by networks container click listener (more robust)
}

async function loadStations(networkId) {
	console.log('loadStations called for networkId:', networkId);
	const data = await fetchData(`/networks/${networkId}`);
	const container = document.getElementById('stations');
	container.innerHTML = '';
	// Back button so user can return to home/networks (clears search)
	const searchInput = document.getElementById('search');
	container.innerHTML += `
		<div class="card">
			<button type="button" id="backBtn" class="backBtn">← Back to home</button>
		</div>
	`;
	// wire back button to clear search and go home
	setTimeout(() => {
		const back = document.getElementById('backBtn');
		if (back) back.addEventListener('click', () => {
			if (searchInput) searchInput.value = '';
			loadNetworks();
			window.scrollTo({top:0, behavior:'smooth'});
		});
	}, 0);
	if (!data || !data.network || !data.network.stations) {
		alert('Failed to load stations for this network.');
		console.error('Stations payload:', data);
		return;
	}

	data.network.stations.slice(0, 50).forEach(st => {
		container.innerHTML += `
			<div class="card">
				<h4>${st.name}</h4>
				<p>Bikes available: ${st.free_bikes || 0} | Docks available: ${st.empty_slots || 'N/A'}</p>
			</div>
		`;
	});
}

// Load stations for an entire country by fetching stations from all networks in that country
async function loadStationsForCountry(countryCode, networksList) {
	const container = document.getElementById('stations');
	const networksContainer = document.getElementById('networks');
	if (networksContainer) networksContainer.innerHTML = '';
	if (!container) return;
	showMessage(`Loading stations for ${countryName(countryCode)} ${codeToFlag(countryCode)} — fetching data from ${networksList.length} networks...`);
	container.innerHTML = `<div class="card"><p>Loading stations for ${countryName(countryCode)} ${codeToFlag(countryCode)} — fetching data from ${networksList.length} networks...</p></div>`;

	// Limit number of networks to fetch to avoid too many requests at once
	const limit = 12;
	const toFetch = networksList.slice(0, limit);

	// Fetch in parallel and attach network name to returned stations
	const fetches = toFetch.map(n => fetchData(`/networks/${n.id}`).then(res => ({ network: n, res })).catch(err => ({ network: n, err })));
	const results = await Promise.all(fetches);

	// Aggregate stations
	let allStations = [];
	results.forEach(r => {
		if (r && r.res && r.res.network && Array.isArray(r.res.network.stations)) {
			const mapped = r.res.network.stations.map(s => ({ ...s, networkName: r.network.name }));
			allStations = allStations.concat(mapped);
		} else {
			console.error('Failed to load stations for network', r.network && r.network.id, r.err || r.res);
		}
	});

	// Render aggregated station list (limit to first 200 entries for performance)
	container.innerHTML = '';
	if (allStations.length === 0) {
		container.innerHTML = `<div class="card"><p>No station data available for ${countryName(countryCode)}.</p></div>`;
		showMessage(`No station data available for ${countryName(countryCode)}.`, 'error');
		return;
	}

	allStations.slice(0, 200).forEach(st => {
		container.innerHTML += `
			<div class="card">
				<h4>${st.name}</h4>
				<p>${st.networkName} — Bikes available: ${st.free_bikes || 0} | Docks available: ${st.empty_slots || 'N/A'}</p>
			</div>
		`;
	});

	showMessage(`Showing ${Math.min(allStations.length,200)} stations from ${Math.min(networksList.length,12)} networks in ${countryName(countryCode)}.`);

	// If there are more networks we didn't fetch, note that to the user
	if (networksList.length > limit) {
		container.innerHTML += `<div class="card"><p>Showing stations from ${limit} of ${networksList.length} networks in ${countryName(countryCode)}. Narrow your search or request a specific network to see more.</p></div>`;
	}
}

// Wire UI
document.addEventListener('DOMContentLoaded', () => {
	const loadBtn = document.getElementById('loadBtn');
	const search = document.getElementById('search');

	loadBtn.addEventListener('click', () => loadNetworks(search.value));
	search.addEventListener('keyup', (e) => {
		if (e.key === 'Enter') loadNetworks(search.value);
	});

	const networksContainer = document.getElementById('networks');
	networksContainer.addEventListener('click', (e) => {
		// Robust click handling: find the nearest button with data-id
		const btn = e.target.closest('button[data-id]');
		if (!btn) return;
		console.log('Network card button clicked:', btn, 'dataset:', btn.dataset);
		const id = btn.dataset.id;
		if (!id) {
			alert('Network id missing');
			console.error('Clicked button missing data-id:', btn);
			return;
		}
		loadStations(id);
	});

	// initial load
	loadNetworks();
});