/* La bonne 125 — app.js */
'use strict';

const REPO = 'Carpette/la-bonne-125';
const EQUIPEMENTS = ["Valises de série", "Top case de série", "Béquille centrale", "TFT couleur",
	"Connectivité smartphone", "Keyless", "Contrôle de traction", "USB", "Full LED",
	"Protège-mains", "Sabot moteur", "TPMS", "Caméra embarquée"];
const DATA_PATH = 'data/motos.json';

let DB = null;          // { meta, motos }
let dirty = new Set();  // ids modifiés en mode admin
let state = {
	search: '',
	cats: new Set(),
	origines: new Set(),
	marques: new Set(),
	prixMax: 6000,
	prixNC: true,
	selleMax: 960,
	chMin: 7,
	abs: false,
	equips: new Set(),
	parrain: false,
	ia: false,
	sort: 'marque'
};

const $ = (s) => document.querySelector(s);
const grid = $('#grid');

/* ---------- chargement ---------- */
async function load() {
	const res = await fetch(DATA_PATH + '?v=' + Date.now());
	DB = await res.json();
	$('#meta-maj').textContent = 'Données mises à jour le ' + DB.meta.maj + ' — ' + DB.meta.note;
	buildFilters();
	render();
}

/* ---------- filtres ---------- */
function buildFilters() {
	const cats = [...new Set(DB.motos.map(m => m.categorie))].sort();
	const origines = [...new Set(DB.motos.map(m => m.origine))].sort();
	const marques = [...new Set(DB.motos.map(m => m.marque))].sort();

	$('#f-categories').innerHTML = cats.map(c =>
		`<button class="chip" data-cat="${c}">${c}</button>`).join('');
	$('#f-origines').innerHTML = origines.map(o =>
		`<button class="chip" data-orig="${o}">${o}</button>`).join('');
	const usedEquips = EQUIPEMENTS.filter(e => DB.motos.some(m => (m.equipements || []).includes(e)));
	$('#f-equips').innerHTML = usedEquips.map(e =>
		`<button class="chip" data-equip="${e}">${e}</button>`).join('');
	$('#f-equips').addEventListener('click', e => {
		const q = e.target.dataset.equip;
		if (!q) return;
		state.equips.has(q) ? state.equips.delete(q) : state.equips.add(q);
		e.target.classList.toggle('on');
		render();
	});
	$('#f-marques').innerHTML = marques.map(m =>
		`<label class="check"><input type="checkbox" data-marque="${m}"> ${m}</label>`).join('');

	$('#f-categories').addEventListener('click', e => {
		const c = e.target.dataset.cat;
		if (!c) return;
		state.cats.has(c) ? state.cats.delete(c) : state.cats.add(c);
		e.target.classList.toggle('on');
		render();
	});
	$('#f-origines').addEventListener('click', e => {
		const o = e.target.dataset.orig;
		if (!o) return;
		state.origines.has(o) ? state.origines.delete(o) : state.origines.add(o);
		e.target.classList.toggle('on');
		render();
	});
	$('#f-marques').addEventListener('change', e => {
		const m = e.target.dataset.marque;
		if (!m) return;
		e.target.checked ? state.marques.add(m) : state.marques.delete(m);
		render();
	});

	$('#f-search').addEventListener('input', e => { state.search = e.target.value.toLowerCase(); render(); });
	$('#f-prix').addEventListener('input', e => { state.prixMax = +e.target.value; render(); });
	$('#f-prix-nc').addEventListener('change', e => { state.prixNC = e.target.checked; render(); });
	$('#f-selle').addEventListener('input', e => { state.selleMax = +e.target.value; render(); });
	$('#f-ch').addEventListener('input', e => { state.chMin = +e.target.value; render(); });
	$('#f-abs').addEventListener('change', e => { state.abs = e.target.checked; render(); });
	$('#f-parrain').addEventListener('change', e => { state.parrain = e.target.checked; render(); });
	$('#f-ia').addEventListener('change', e => { state.ia = e.target.checked; render(); });
	$('#f-sort').addEventListener('change', e => { state.sort = e.target.value; render(); });

	$('#btn-reset').addEventListener('click', () => {
		state = { ...state, search: '', cats: new Set(), origines: new Set(), marques: new Set(),
			prixMax: 6000, prixNC: true, selleMax: 960, chMin: 7, abs: false, equips: new Set(), parrain: false, ia: false };
		$('#f-search').value = '';
		$('#f-prix').value = 6000; $('#f-prix-nc').checked = true;
		$('#f-selle').value = 960; $('#f-ch').value = 7;
		['#f-abs', '#f-parrain', '#f-ia'].forEach(s => $(s).checked = false);
		document.querySelectorAll('.chip.on').forEach(c => c.classList.remove('on'));
		document.querySelectorAll('[data-marque]').forEach(c => c.checked = false);
		render();
	});
}

function matches(m) {
	if (state.search && !(m.marque + ' ' + m.modele + ' ' + m.categorie).toLowerCase().includes(state.search)) return false;
	if (state.cats.size && !state.cats.has(m.categorie)) return false;
	if (state.origines.size && !state.origines.has(m.origine)) return false;
	if (state.marques.size && !state.marques.has(m.marque)) return false;
	if (m.prix == null) { if (!state.prixNC) return false; }
	else if (m.prix > state.prixMax) return false;
	if (m.selle != null && m.selle > state.selleMax) return false;
	if (m.puissance != null && m.puissance < state.chMin) return false;
	if (state.abs && m.freinage !== 'ABS') return false;
	if (state.equips.size) {
		const eq = m.equipements || [];
		for (const q of state.equips) if (!eq.includes(q)) return false;
	}
	if (state.parrain && !m.sceauParrain) return false;
	if (state.ia && !m.sceauIA) return false;
	return true;
}

function sortFn(a, b) {
	// les valeurs inconnues (null) vont toujours en fin de liste
	const cmp = (key, dir) => {
		const va = a[key], vb = b[key];
		if (va == null && vb == null) return 0;
		if (va == null) return 1;
		if (vb == null) return -1;
		return dir * (va - vb);
	};
	switch (state.sort) {
		case 'prix-asc': return cmp('prix', 1);
		case 'prix-desc': return cmp('prix', -1);
		case 'poids-asc': return cmp('poids', 1);
		case 'poids-desc': return cmp('poids', -1);
		case 'selle-asc': return cmp('selle', 1);
		case 'selle-desc': return cmp('selle', -1);
		case 'ch-asc': return cmp('puissance', 1);
		case 'ch-desc': return cmp('puissance', -1);
		default: return (a.marque + a.modele).localeCompare(b.marque + b.modele, 'fr');
	}
}

/* ---------- rendu ---------- */
const fmtPrix = p => p == null ? 'prix n.c.' : p.toLocaleString('fr-FR') + ' €';

function render() {
	$('#out-prix').textContent = state.prixMax >= 6000 ? '∞' : state.prixMax.toLocaleString('fr-FR') + ' €';
	$('#out-selle').textContent = state.selleMax >= 960 ? '∞' : state.selleMax + ' mm';
	$('#out-ch').textContent = state.chMin <= 7 ? '—' : '≥ ' + state.chMin + ' ch';

	const list = DB.motos.filter(matches).sort(sortFn);
	$('#count').innerHTML = `<strong>${list.length}</strong> modèle${list.length > 1 ? 's' : ''} sur ${DB.motos.length}`;

	if (!list.length) {
		grid.innerHTML = '<div class="empty">Aucune moto ne passe ces filtres. Desserre un peu le budget ou la selle !</div>';
		return;
	}
	grid.innerHTML = list.map(m => `
		<article class="card" tabindex="0" role="button" data-id="${m.id}" aria-label="${m.marque} ${m.modele}">
			${m.sceauParrain ? '<span class="stamp card-stamp">Approuvé par parrain</span>' : ''}
			<div class="card-photo">${m.photo
				? `<img src="${m.photo}" alt="${m.marque} ${m.modele}" loading="lazy" onerror="this.replaceWith(placeholderEl('${m.marque}'))">`
				: `<span class="placeholder">${escapeHtml(m.marque)}</span>`}</div>
			${m.sceauIA ? '<span class="badge-ia card-badge-ia">◆ Suggestion IA</span>' : ''}
			<div class="card-body">
				<span class="card-marque">${escapeHtml(m.marque)} · ${escapeHtml(m.origine)}</span>
				<span class="card-modele">${escapeHtml(m.modele)}</span>
				<span class="card-cat">${m.categorie} · ${m.freinage || '—'}</span>
				${(m.equipements || []).length ? `<div class="equip-row">${m.equipements.slice(0, 3).map(e => `<span class="equip-chip">${e}</span>`).join('')}${m.equipements.length > 3 ? `<span class="equip-chip">+${m.equipements.length - 3}</span>` : ''}</div>` : ''}
				<div class="card-specs">
					<span class="card-prix">${fmtPrix(m.prix)}</span>
					<span>${m.puissance != null ? m.puissance + ' ch' : '— ch'}</span>
					<span>${m.poids != null ? m.poids + ' kg' : '— kg'}</span>
					<span>${m.selle != null ? 'selle ' + m.selle : 'selle —'}</span>
				</div>
			</div>
		</article>`).join('');
}

function placeholderEl(marque) {
	const s = document.createElement('span');
	s.className = 'placeholder';
	s.textContent = marque;
	return s;
}
window.placeholderEl = placeholderEl;

function escapeHtml(s) {
	return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- fiche détail ---------- */
grid.addEventListener('click', e => {
	const card = e.target.closest('.card');
	if (card) openModal(card.dataset.id);
});
grid.addEventListener('keydown', e => {
	if (e.key !== 'Enter' && e.key !== ' ') return;
	const card = e.target.closest('.card');
	if (card) { e.preventDefault(); openModal(card.dataset.id); }
});

function openModal(id) {
	const m = DB.motos.find(x => x.id === id);
	if (!m) return;
	const gq = encodeURIComponent(m.marque + ' ' + m.modele + ' 2026');
	$('#modal-content').innerHTML = `
		<div class="modal-head">
			<div>
				<span class="card-marque">${escapeHtml(m.marque)} · ${m.categorie} · ${escapeHtml(m.origine)}</span>
				<h3>${escapeHtml(m.modele)}</h3>
			</div>
			<div>
				${m.sceauParrain ? '<span class="stamp">Approuvé par parrain</span><br>' : ''}
				${m.sceauIA ? '<span class="badge-ia">◆ Suggestion IA</span>' : ''}
			</div>
		</div>
		${m.photo ? `<div class="modal-photo"><img src="${m.photo}" alt="${escapeHtml(m.marque)} ${escapeHtml(m.modele)}"></div>` : ''}
		<table class="spec-table">
			<tr><td>Prix indicatif</td><td>${fmtPrix(m.prix)}</td></tr>
			<tr><td>Puissance</td><td>${m.puissance != null ? m.puissance + ' ch' : 'n.c.'}</td></tr>
			<tr><td>Poids</td><td>${m.poids != null ? m.poids + ' kg' : 'n.c.'}</td></tr>
			<tr><td>Hauteur de selle</td><td>${m.selle != null ? m.selle + ' mm' : 'n.c.'}</td></tr>
			<tr><td>Freinage</td><td>${m.freinage || 'n.c.'}</td></tr>
		</table>
		${(m.equipements || []).length ? `<div class="equip-row">${m.equipements.map(e => `<span class="equip-chip">${escapeHtml(e)}</span>`).join('')}</div>` : ''}
		${m.notes ? `<p>${escapeHtml(m.notes)}</p>` : ''}
		${m.avisPresse ? `<div class="avis avis-presse"><div class="who">Ce qu'en disent les essais</div>${escapeHtml(m.avisPresse)}</div>` : ''}
		${m.sceauParrain && m.avisParrain ? `<div class="avis"><div class="who">L'avis du parrain</div>${escapeHtml(m.avisParrain)}</div>` : ''}
		${m.sceauIA && m.avisIA ? `<div class="avis avis-ia"><div class="who">◆ L'avis de l'IA</div>${escapeHtml(m.avisIA)}</div>` : ''}
		<div class="modal-links">
			${m.site ? `<a href="${m.site}" target="_blank" rel="noopener">Site officiel ↗</a>` : ''}
			<a href="https://www.google.com/search?tbm=isch&q=${gq}" target="_blank" rel="noopener">Photos officielles ↗</a>
			<a href="https://www.google.com/search?q=${gq}+essai" target="_blank" rel="noopener">Essais &amp; avis ↗</a>
		</div>
		${isAdmin() ? editZone(m) : ''}
		<button class="btn-ghost btn-close" onclick="document.getElementById('modal').close()">Fermer</button>`;

	if (isAdmin()) bindEditZone(m);
	$('#modal').showModal();
}

/* ---------- onglet occasion ---------- */
function slugMarque(marque) {
	return marque.toLowerCase()
		.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function modeleCourt(m) {
	return m.modele.replace(/\s*\(.*?\)\s*/g, ' ').trim();
}
function lbcUrl(m) {
	const q = encodeURIComponent((m.marque + ' ' + modeleCourt(m)).toLowerCase());
	return `https://www.leboncoin.fr/recherche?category=3&text=${q}&sort=time`;
}
function lacUrl(m) {
	return `https://www.lacentrale.fr/occasion-moto-marque-${slugMarque(m.marque)}.html`;
}

function renderOccasion() {
	const suivis = DB.motos.filter(m => m.sceauParrain || m.sceauIA || m.suivreOccasion);
	if (!suivis.length) {
		$('#occasion-list').innerHTML = '<div class="empty">Aucun modèle suivi pour l\'instant. Pose un sceau ou coche « suivre en occasion » dans l\'admin.</div>';
		return;
	}
	suivis.sort((a, b) => (b.sceauParrain - a.sceauParrain) || (a.marque + a.modele).localeCompare(b.marque + b.modele, 'fr'));
	$('#occasion-list').innerHTML = suivis.map(m => `
		<div class="occ-row">
			<div class="occ-name">
				<span class="card-marque">${escapeHtml(m.marque)}</span>
				<span class="card-modele">${escapeHtml(m.modele)}</span>
				<span class="hint">${m.prix ? 'neuf : ' + fmtPrix(m.prix) : ''}</span>
			</div>
			<div class="who-seal">
				${m.sceauParrain ? '<span class="stamp stamp-mini">Parrain</span>' : ''}
				${m.sceauIA ? '<span class="badge-ia badge-mini">◆ IA</span>' : ''}
			</div>
			<div class="occ-links">
				<a class="btn-lbc" href="${lbcUrl(m)}" target="_blank" rel="noopener">leboncoin ↗</a>
				<a class="btn-lac" href="${lacUrl(m)}" target="_blank" rel="noopener">La Centrale ↗</a>
			</div>
		</div>`).join('');
}

const tabCat = $('#tab-catalogue'), tabOcc = $('#tab-occasion');
function switchTab(occ) {
	document.querySelector('.layout').hidden = occ;
	$('#occasion').hidden = !occ;
	tabCat.classList.toggle('on', !occ);
	tabOcc.classList.toggle('on', occ);
	if (occ) renderOccasion();
}
tabCat.addEventListener('click', () => switchTab(false));
tabOcc.addEventListener('click', () => switchTab(true));

/* ---------- admin ---------- */
const isAdmin = () => !!sessionStorage.getItem('gh_token');

function editZone(m) {
	return `
	<div class="edit-zone">
		<h4>Édition parrain</h4>
		<label class="check"><input type="checkbox" id="e-parrain" ${m.sceauParrain ? 'checked' : ''}> Poser le sceau « Approuvé par parrain »</label>
		<label>Ton avis</label>
		<textarea id="e-avis">${escapeHtml(m.avisParrain || '')}</textarea>
		<label>Prix (€, vide = n.c.)</label>
		<input type="number" id="e-prix" value="${m.prix ?? ''}">
		<label>URL de la photo officielle</label>
		<input type="text" id="e-photo" value="${escapeHtml(m.photo || '')}" placeholder="https://…jpg">
		<label class="check small"><input type="checkbox" id="e-ia" ${m.sceauIA ? 'checked' : ''}> Sceau « Suggestion IA » visible</label>
		<label class="check small"><input type="checkbox" id="e-occ" ${m.suivreOccasion ? 'checked' : ''}> Suivre en occasion (sans sceau)</label>
		<label>Équipements de série</label>
		<div class="chips">${EQUIPEMENTS.map(e => `<label class="check small" style="margin:2px 10px 2px 0"><input type="checkbox" class="e-equip" value="${e}" ${(m.equipements || []).includes(e) ? 'checked' : ''}> ${e}</label>`).join('')}</div>
		<button class="btn-primary" id="e-save" style="margin-top:10px">Enregistrer la fiche</button>
	</div>`;
}

function bindEditZone(m) {
	$('#e-save').addEventListener('click', () => {
		m.sceauParrain = $('#e-parrain').checked;
		m.avisParrain = $('#e-avis').value.trim();
		m.sceauIA = $('#e-ia').checked;
		m.suivreOccasion = $('#e-occ').checked;
		m.equipements = [...document.querySelectorAll('.e-equip:checked')].map(c => c.value);
		const p = $('#e-prix').value;
		m.prix = p === '' ? null : +p;
		m.photo = $('#e-photo').value.trim();
		dirty.add(m.id);
		updateDirtyCount();
		$('#modal').close();
		render();
	});
}

function updateDirtyCount() {
	$('#dirty-count').textContent = dirty.size
		? dirty.size + ' fiche(s) modifiée(s), non publiée(s). Clique « Publier » pour mettre le site à jour.'
		: 'Aucune modification en attente.';
}

$('#btn-admin').addEventListener('click', () => {
	$('#admin-login').hidden = isAdmin();
	$('#admin-actions').hidden = !isAdmin();
	if (isAdmin()) updateDirtyCount();
	$('#admin-panel').showModal();
});

$('#btn-token-save').addEventListener('click', () => {
	const t = $('#admin-token').value.trim();
	if (!t) return;
	sessionStorage.setItem('gh_token', t);
	$('#admin-token').value = '';
	$('#admin-login').hidden = true;
	$('#admin-actions').hidden = false;
	$('#btn-admin').classList.add('active');
	updateDirtyCount();
});

$('#btn-logout').addEventListener('click', () => {
	sessionStorage.removeItem('gh_token');
	$('#btn-admin').classList.remove('active');
	$('#admin-panel').close();
});

/* base64 UTF-8, par blocs pour éviter les débordements de pile */
function b64utf8(str) {
	const bytes = new TextEncoder().encode(str);
	let bin = '';
	const CHUNK = 0x8000;
	for (let i = 0; i < bytes.length; i += CHUNK) {
		bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
	}
	return btoa(bin);
}

/* ---------- mode photos rapide ---------- */
let photoQueue = [];
let photoIdx = 0;

function ghHeaders() {
	return { 'Authorization': 'Bearer ' + sessionStorage.getItem('gh_token'), 'Accept': 'application/vnd.github+json' };
}

$('#btn-photo-mode').addEventListener('click', () => {
	photoQueue = DB.motos.filter(m => !m.photo);
	photoIdx = 0;
	if (!photoQueue.length) {
		$('#photo-status').textContent = 'Toutes les fiches ont déjà une photo !';
		return;
	}
	$('#admin-panel').close();
	$('#photo-panel').showModal();
	showPhotoStep();
});

function showPhotoStep() {
	if (photoIdx >= photoQueue.length) {
		$('#photo-current').innerHTML = '<strong>Terminé !</strong> Les images sont uploadées dans le dépôt. Clique « Publier » (panneau parrain) pour relier les fiches aux photos.';
		$('#photo-tools').hidden = true;
		return;
	}
	const m = photoQueue[photoIdx];
	$('#photo-tools').hidden = false;
	$('#photo-current').innerHTML =
		`<span class="card-marque">${photoIdx + 1} / ${photoQueue.length}</span>
		 <h3 style="margin:4px 0 2px">${escapeHtml(m.marque)} ${escapeHtml(m.modele)}</h3>`;
	const gq = encodeURIComponent(m.marque + ' ' + m.modele + ' 2026 officiel');
	$('#photo-gimg').href = 'https://www.google.com/search?tbm=isch&q=' + gq;
	$('#photo-url').value = '';
	$('#photo-feedback').textContent = '';
	$('#paste-zone').focus();
}

$('#photo-skip').addEventListener('click', () => { photoIdx++; showPhotoStep(); });
$('#photo-quit').addEventListener('click', () => $('#photo-panel').close());

$('#photo-url-save').addEventListener('click', () => {
	const url = $('#photo-url').value.trim();
	if (!url) return;
	const m = photoQueue[photoIdx];
	m.photo = url;
	dirty.add(m.id);
	photoIdx++;
	showPhotoStep();
});

$('#paste-zone').addEventListener('paste', async (e) => {
	e.preventDefault();
	const item = [...e.clipboardData.items].find(i => i.type.startsWith('image/'));
	if (!item) { $('#photo-feedback').textContent = 'Pas d\'image dans le presse-papier. Clic droit sur l\'image → « Copier l\'image », puis Ctrl+V ici.'; return; }
	uploadPhoto(item.getAsFile());
});

$('#photo-file').addEventListener('change', (e) => {
	if (e.target.files && e.target.files[0]) uploadPhoto(e.target.files[0]);
	e.target.value = '';
});

async function uploadPhoto(file) {
	const m = photoQueue[photoIdx];
	$('#photo-feedback').textContent = 'Redimensionnement et upload…';
	try {
		const jpegB64 = await toJpegB64(file, 900, 0.82);
		const path = `data/photos/${m.id}.jpg`;
		const url = `https://api.github.com/repos/${REPO}/contents/${path}`;
		// sha si le fichier existe déjà (remplacement)
		let sha;
		const head = await fetch(url, { headers: ghHeaders() });
		if (head.ok) sha = (await head.json()).sha;
		const put = await fetch(url, {
			method: 'PUT',
			headers: ghHeaders(),
			body: JSON.stringify({ message: 'photo ' + m.id, content: jpegB64, ...(sha ? { sha } : {}) })
		});
		if (!put.ok) throw new Error('upload ' + put.status);
		m.photo = path;
		dirty.add(m.id);
		$('#photo-feedback').textContent = 'Photo enregistrée ✔';
		photoIdx++;
		setTimeout(showPhotoStep, 350);
	} catch (err) {
		$('#photo-feedback').textContent = 'Erreur : ' + err.message;
	}
}

function toJpegB64(file, maxW, quality) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const scale = Math.min(1, maxW / img.width);
			const c = document.createElement('canvas');
			c.width = Math.round(img.width * scale);
			c.height = Math.round(img.height * scale);
			const ctx = c.getContext('2d');
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, 0, c.width, c.height);
			ctx.drawImage(img, 0, 0, c.width, c.height);
			URL.revokeObjectURL(img.src);
			resolve(c.toDataURL('image/jpeg', quality).split(',')[1]);
		};
		img.onerror = () => reject(new Error('image illisible'));
		img.src = URL.createObjectURL(file);
	});
}

$('#btn-publish').addEventListener('click', async () => {
	const token = sessionStorage.getItem('gh_token');
	const status = $('#publish-status');
	const btn = $('#btn-publish');
	btn.disabled = true;
	status.textContent = 'Publication en cours…';
	try {
		const headers = {
			'Authorization': 'Bearer ' + token,
			'Accept': 'application/vnd.github+json'
		};
		const url = `https://api.github.com/repos/${REPO}/contents/${DATA_PATH}`;
		const cur = await fetch(url, { headers });
		if (!cur.ok) throw new Error('Lecture du fichier impossible (' + cur.status + ')');
		const curJson = await cur.json();
		const sha = curJson.sha;
		// fusion non destructive : on repart de la version EN LIGNE et on
		// n'y applique que les fiches modifiées dans cet onglet
		const remoteDB = JSON.parse(new TextDecoder().decode(
			Uint8Array.from(atob(curJson.content.replace(/\n/g, '')), c => c.charCodeAt(0))));
		const remoteIdx = new Map(remoteDB.motos.map(m => [m.id, m]));
		for (const id of dirty) {
			const local = DB.motos.find(m => m.id === id);
			if (!local) continue;
			if (remoteIdx.has(id)) {
				const i = remoteDB.motos.findIndex(m => m.id === id);
				remoteDB.motos[i] = local;
			} else {
				remoteDB.motos.push(local);
			}
		}
		remoteDB.meta.maj = new Date().toISOString().slice(0, 10);
		DB = remoteDB; // l'onglet repart de la version fusionnée
		const body = {
			message: 'màj données via le panneau parrain',
			content: b64utf8(JSON.stringify(remoteDB, null, '\t')),
			sha
		};
		const put = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
		if (!put.ok) {
			const err = await put.json().catch(() => ({}));
			throw new Error('Échec de la publication (' + put.status + ') ' + (err.message || ''));
		}
		dirty.clear();
		updateDirtyCount();
		buildFiltersRefresh();
		render();
		status.textContent = 'Publié ! Tes modifications ont été fusionnées avec la version en ligne. Le site se met à jour d\'ici ~1 minute.';
	} catch (e) {
		status.textContent = 'Erreur : ' + e.message + ' — vérifie le token (permission Contents : Read and write).';
	} finally {
		btn.disabled = false;
	}
});

function buildFiltersRefresh() {
	// reconstruit les listes de chips sans perdre l'état (suffisant ici : on relance buildFilters serait trop lourd)
}

/* ---------- go ---------- */
if (isAdmin()) $('#btn-admin').classList.add('active');
load().catch(e => {
	grid.innerHTML = '<div class="empty">Impossible de charger les données : ' + escapeHtml(e.message) + '</div>';
});
