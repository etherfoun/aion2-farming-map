/**
 * Aion 2 Altgard — Pure Pet Farm Optimizer
 * High-performance spatial clustering and interactive farming map for Pets only.
 * Supports hiding collected pets, individual spawn points, and full RU / EN localization.
 */

// 1. Custom Leaflet CRS matching Aion 2 Altgard tile layout
const AltgardCRS = L.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(1, 0, 1, 0),
  scale: function(zoom) {
    return Math.pow(2, zoom) / 16;
  },
  zoom: function(scale) {
    return Math.log(scale * 16) / Math.LN2;
  },
  projection: {
    project: function(latlng) {
      return new L.Point(latlng.lng, latlng.lat);
    },
    unproject: function(point) {
      return new L.LatLng(point.y, point.x);
    }
  },
  infinite: true
});

// 2. Global State
const state = {
  selectedGenre: 'all', // 'all', 'Cogni', 'Fera', 'Natura', 'Varian', 'multi'
  selectedMobs: new Set(), // Set of pet species canonical names
  selectedZone: 'all', // canonical zone name or 'all'
  spotRadius: 80,
  minMobs: 2,
  purePetsOnly: true, // true = 313 dedicated pet spawns; false = including all spawns of pet species (2067)
  hideCollected: true, // whether to exclude collected pets from map & spot calculation
  collectedSpecies: new Set(), // hidden / collected pet species canonical names
  collectedPins: new Set(), // hidden / collected individual spawn point IDs
  showMobMarkers: true,
  showZones: true,
  showCircles: true,
  activeSpotIndex: null,
  spots: []
};

// Genre Color Palette
const GENRE_COLORS = {
  Cogni: '#38bdf8',
  Fera: '#fb923c',
  Natura: '#34d399',
  Varian: '#c084fc',
  multi: '#facc15'
};

// 3. Map Initialization
const map = L.map('map', {
  crs: AltgardCRS,
  minZoom: 1,
  maxZoom: 6,
  attributionControl: false,
  zoomControl: true
}).setView([1800, 2100], 2);

// Altgard Tile Layer from CDN
const tileLayer = L.tileLayer('https://interactivemap.app/aion2/maps/imapp/uploads/tiles/altgard_img14_20261002_webp/{z}_{x}_{y}.webp', {
  tms: false,
  noWrap: true,
  maxNativeZoom: 5,
  minNativeZoom: 0,
  bounds: [[0, 0], [4096, 4096]]
});

// Explicitly force no-referrer on tile images to bypass hotlink protection
const originalCreateTile = tileLayer.createTile;
tileLayer.createTile = function(coords, done) {
  const tile = originalCreateTile.call(this, coords, done);
  tile.referrerPolicy = 'no-referrer';
  return tile;
};

tileLayer.addTo(map);

// Layer Groups
const zoneLayerGroup = L.layerGroup().addTo(map);
const mobMarkersLayerGroup = L.layerGroup().addTo(map);
const spotLayerGroup = L.layerGroup().addTo(map);

// DOM Elements
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const genrePills = document.querySelectorAll('.genre-pill');
const togglePurePets = document.getElementById('togglePurePets');
const modeDesc = document.getElementById('modeDesc');
const mobSearchInput = document.getElementById('mobSearchInput');
const mobSearchClear = document.getElementById('mobSearchClear');
const mobListScroll = document.getElementById('mobListScroll');
const btnSelectAllMobs = document.getElementById('btnSelectAllMobs');
const btnClearMobs = document.getElementById('btnClearMobs');
const btnHideSelectedMobs = document.getElementById('btnHideSelectedMobs');
const toggleHideCollected = document.getElementById('toggleHideCollected');
const selectedMobsCountBadge = document.getElementById('selectedMobsCount');
const zoneSelect = document.getElementById('zoneSelect');
const radiusSlider = document.getElementById('radiusSlider');
const radiusIndicator = document.getElementById('radiusIndicator');
const radiusPresetBtns = document.querySelectorAll('.radius-preset-btn');
const minMobsSlider = document.getElementById('minMobsSlider');
const minMobsIndicator = document.getElementById('minMobsIndicator');
const toggleMobMarkers = document.getElementById('toggleMobMarkers');
const toggleZones = document.getElementById('toggleZones');
const toggleCircles = document.getElementById('toggleCircles');
const spotsListContainer = document.getElementById('spotsList');
const spotsCountBadge = document.getElementById('spotsCountBadge');
const coordsHUD = document.getElementById('coordsHUD');
const btnFitMap = document.getElementById('btnFitMap');
const toastMsg = document.getElementById('toastMsg');

// Collection Modal Elements
const btnOpenCollected = document.getElementById('btnOpenCollected');
const btnOpenCollectedText = document.getElementById('btnOpenCollectedText');
const collectedCountBadge = document.getElementById('collectedCountBadge');
const collectedModal = document.getElementById('collectedModal');
const btnCloseCollectedModal = document.getElementById('btnCloseCollectedModal');
const btnCloseModalBtn = document.getElementById('btnCloseModalBtn');
const btnResetAllCollected = document.getElementById('btnResetAllCollected');
const collectedItemsList = document.getElementById('collectedItemsList');

// Counts Badges
const countAllBadge = document.getElementById('countAll');
const countCogniBadge = document.getElementById('countCogni');
const countFeraBadge = document.getElementById('countFera');
const countNaturaBadge = document.getElementById('countNatura');
const countVarianBadge = document.getElementById('countVarian');

// 4. Persistence for Collected Pets
function loadCollectedFromStorage() {
  try {
    const s = JSON.parse(localStorage.getItem('aion2_collected_species') || '[]');
    const p = JSON.parse(localStorage.getItem('aion2_collected_pins') || '[]');
    state.collectedSpecies = new Set(s);
    state.collectedPins = new Set(p);
  } catch (e) {
    state.collectedSpecies = new Set();
    state.collectedPins = new Set();
  }
  updateCollectedCounter();
}

function saveCollectedToStorage() {
  localStorage.setItem('aion2_collected_species', JSON.stringify([...state.collectedSpecies]));
  localStorage.setItem('aion2_collected_pins', JSON.stringify([...state.collectedPins]));
  updateCollectedCounter();
}

function updateCollectedCounter() {
  const total = state.collectedSpecies.size + state.collectedPins.size;
  if (collectedCountBadge) {
    collectedCountBadge.textContent = total;
  }
  if (btnOpenCollectedText) {
    btnOpenCollectedText.textContent = I18N.t('btnCollectedLabel');
  }
}

// Get full dataset (both pure pet spawns and all spawns of pet species)
function getFullDataset() {
  const pure = (typeof PURE_PET_DATA !== 'undefined') ? PURE_PET_DATA : [];
  const ext = (typeof EXTENDED_PET_DATA !== 'undefined') ? EXTENDED_PET_DATA : [];
  return pure.concat(ext);
}

// Get active dataset based on mode
function getActiveDataset() {
  if (state.purePetsOnly) {
    return (typeof PURE_PET_DATA !== 'undefined') ? PURE_PET_DATA : [];
  } else {
    return getFullDataset();
  }
}

// Update Genre Badges Counters
function updateGenreCounters() {
  const data = getActiveDataset();
  let total = 0, cogni = 0, fera = 0, natura = 0, varian = 0;

  for (let i = 0; i < data.length; i++) {
    const m = data[i];
    // Exclude collected if toggle is on
    if (state.hideCollected) {
      if (state.collectedSpecies.has(m.name) || state.collectedPins.has(m.id)) {
        continue;
      }
    }
    total++;
    const g = m.genre;
    if (g === 'Cogni') cogni++;
    else if (g === 'Fera') fera++;
    else if (g === 'Natura') natura++;
    else if (g === 'Varian') varian++;
  }

  countAllBadge.textContent = total;
  countCogniBadge.textContent = cogni;
  countFeraBadge.textContent = fera;
  countNaturaBadge.textContent = natura;
  countVarianBadge.textContent = varian;

  if (state.purePetsOnly) {
    modeDesc.textContent = I18N.t('purePetsCount', { count: total });
  } else {
    modeDesc.textContent = I18N.t('allPetsCount', { count: total });
  }
}

// 5. Render Map Zones (Polygons)
const zonePolygonMap = new Map();
function initZones() {
  zoneLayerGroup.clearLayers();
  zonePolygonMap.clear();
  if (typeof MAP_AREAS === 'undefined') return;

  const sortedAreas = [...MAP_AREAS].sort((a, b) => {
    const nameA = I18N.getZoneName(a.name);
    const nameB = I18N.getZoneName(b.name);
    return nameA.localeCompare(nameB);
  });

  zoneSelect.innerHTML = `<option value="all">${I18N.t('zoneAll')}</option>`;

  sortedAreas.forEach(area => {
    const opt = document.createElement('option');
    opt.value = area.name; // canonical English name stored in value
    opt.textContent = I18N.getZoneName(area.name);
    if (state.selectedZone === area.name) {
      opt.selected = true;
    }
    zoneSelect.appendChild(opt);

    if (area.poly && area.poly.length > 2) {
      const poly = L.polygon(area.poly, {
        color: area.color || '#6366f1',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: area.color || '#6366f1',
        fillOpacity: 0.04
      });

      poly.bindTooltip(`<b>${I18N.getZoneName(area.name)}</b>`, {
        sticky: true,
        direction: 'top',
        className: 'zone-tooltip'
      });

      zoneLayerGroup.addLayer(poly);
      zonePolygonMap.set(area.name, poly);
    }
  });

  zoneSelect.value = state.selectedZone;
}

// 6. Populate Pet Species Multi-Select List
function populateMobList() {
  mobListScroll.innerHTML = '';
  if (typeof PET_GENRES_SUMMARY === 'undefined') return;

  const filterText = mobSearchInput.value.trim().toLowerCase();
  
  let petEntries = [];
  if (state.selectedGenre === 'all' || state.selectedGenre === 'multi') {
    Object.keys(PET_GENRES_SUMMARY).forEach(g => {
      PET_GENRES_SUMMARY[g].forEach(item => {
        petEntries.push({ ...item, genre: g });
      });
    });
  } else if (PET_GENRES_SUMMARY[state.selectedGenre]) {
    PET_GENRES_SUMMARY[state.selectedGenre].forEach(item => {
      petEntries.push({ ...item, genre: state.selectedGenre });
    });
  }

  // Sort by count
  petEntries.sort((a, b) => {
    const countA = state.purePetsOnly ? a.pure_count : a.total_count;
    const countB = state.purePetsOnly ? b.pure_count : b.total_count;
    return countB - countA;
  });

  let visibleCount = 0;
  petEntries.forEach(item => {
    const locName = I18N.getSpeciesName(item.name).toLowerCase();
    const rawName = item.name.toLowerCase();
    // Bilingual search matching: user can search by Russian or English name
    if (filterText && !locName.includes(filterText) && !rawName.includes(filterText)) {
      return;
    }
    visibleCount++;

    const isCollected = state.collectedSpecies.has(item.name);
    const isChecked = state.selectedMobs.has(item.name);
    const color = GENRE_COLORS[item.genre] || '#fff';
    const displayCount = state.purePetsOnly ? item.pure_count : item.total_count;

    const imgTag = item.icon ? `<img src="${item.icon}" referrerpolicy="no-referrer" class="mob-pet-thumb" alt="" onerror="this.style.display='none'">` : '';

    const label = document.createElement('label');
    label.className = `mob-item-label ${isCollected ? 'collected' : ''}`;

    const displayName = I18N.getSpeciesName(item.name);
    const titleAttr = (I18N.currentLang === 'ru' && displayName !== item.name) ? `${displayName} (${item.name})` : displayName;
    const restoreTitle = I18N.t('restorePetTitle');
    const collectTitle = I18N.t('collectPetTitle');

    const escapedName = item.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    label.innerHTML = `
      <div style="display:flex;align-items:center;min-width:0;flex:1;">
        <input type="checkbox" value="${item.name}" ${isChecked ? 'checked' : ''}>
        ${imgTag}
        <span class="mob-genre-dot" style="background:${color}"></span>
        <span class="mob-item-name" title="${titleAttr}">${displayName}</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="mob-item-count">${displayCount}</span>
        <button type="button" class="mob-hide-btn" title="${isCollected ? restoreTitle : collectTitle}" onclick="event.stopPropagation(); toggleSpeciesCollected('${escapedName}')">
          ${isCollected ? '↩' : '✓'}
        </button>
      </div>
    `;

    const checkbox = label.querySelector('input');
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.selectedMobs.add(item.name);
      } else {
        state.selectedMobs.delete(item.name);
      }
      updateSelectedMobsIndicator();
      recalculateSpots();
    });

    mobListScroll.appendChild(label);
  });

  if (visibleCount === 0) {
    mobListScroll.innerHTML = `<div style="padding:12px;color:var(--text-dim);text-align:center;">${I18N.t('noMobsFound')}</div>`;
  }
}

function updateSelectedMobsIndicator() {
  if (state.selectedMobs.size === 0) {
    selectedMobsCountBadge.textContent = I18N.t('mobsAllIndicator');
  } else {
    selectedMobsCountBadge.textContent = I18N.t('mobsSelectedIndicator', { count: state.selectedMobs.size });
  }
}

// Global function to toggle collection of a whole species
window.toggleSpeciesCollected = function(name) {
  const dispName = I18N.getSpeciesName(name);
  if (state.collectedSpecies.has(name)) {
    state.collectedSpecies.delete(name);
    showToast(I18N.t('toastSpeciesRestored', { name: dispName }));
  } else {
    state.collectedSpecies.add(name);
    showToast(I18N.t('toastSpeciesHidden', { name: dispName }));
  }
  saveCollectedToStorage();
  populateMobList();
  recalculateSpots();
};

// Global function to collect / hide single pin
window.collectPin = function(id, name) {
  state.collectedPins.add(id);
  saveCollectedToStorage();
  map.closePopup();
  recalculateSpots();
  const dispName = I18N.getSpeciesName(name);
  showToast(I18N.t('toastPinHidden', { name: dispName }));
};

// 7. Fast Spatial Clustering Algorithm for Pets
function findOptimalSpots(filteredMobs, R, minMobsThreshold) {
  if (!filteredMobs || filteredMobs.length === 0) return [];

  const R2 = R * R;
  const isMultiMode = (state.selectedGenre === 'multi');

  // Build Spatial Hash Grid
  const grid = new Map();
  for (let i = 0; i < filteredMobs.length; i++) {
    const m = filteredMobs[i];
    const gx = Math.floor(m.lat / R);
    const gy = Math.floor(m.lng / R);
    const key = `${gx}_${gy}`;
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(i);
  }

  // Calculate density and score for each candidate mob point
  const candidates = [];
  for (let i = 0; i < filteredMobs.length; i++) {
    const m = filteredMobs[i];
    const gx = Math.floor(m.lat / R);
    const gy = Math.floor(m.lng / R);
    const neighbors = [];
    const genreSet = new Set();

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const neighborCell = grid.get(`${gx + dx}_${gy + dy}`);
        if (!neighborCell) continue;
        for (let k = 0; k < neighborCell.length; k++) {
          const nIdx = neighborCell[k];
          const nm = filteredMobs[nIdx];
          const d2 = (nm.lat - m.lat) * (nm.lat - m.lat) + (nm.lng - m.lng) * (nm.lng - m.lng);
          if (d2 <= R2) {
            neighbors.push(nIdx);
            genreSet.add(nm.genre);
          }
        }
      }
    }

    let score = neighbors.length;
    if (isMultiMode) {
      if (genreSet.size < 2) continue; // Multi mode requires at least 2 distinct genres
      score = neighbors.length * (genreSet.size * genreSet.size);
    }

    if (neighbors.length >= minMobsThreshold) {
      candidates.push({
        centerIndex: i,
        score: score,
        genreCount: genreSet.size,
        neighbors: neighbors
      });
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Non-Maximum Suppression (NMS)
  const usedMobIndices = new Set();
  const selectedSpots = [];
  const suppressionDist2 = (R * 1.0) * (R * 1.0);

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    if (usedMobIndices.has(cand.centerIndex)) continue;

    // Available mobs in this cluster
    const clusterMobs = [];
    for (let j = 0; j < cand.neighbors.length; j++) {
      const idx = cand.neighbors[j];
      if (!usedMobIndices.has(idx)) {
        clusterMobs.push(filteredMobs[idx]);
      }
    }

    if (clusterMobs.length < minMobsThreshold) continue;

    const genresInCluster = new Set(clusterMobs.map(m => m.genre));
    if (isMultiMode && genresInCluster.size < 2) continue;

    // Centroid
    let sumLat = 0, sumLng = 0;
    const mobCounts = {};
    const genreCounts = {};
    const zoneCounts = {};
    const mobIcons = {};

    for (let j = 0; j < clusterMobs.length; j++) {
      const m = clusterMobs[j];
      sumLat += m.lat;
      sumLng += m.lng;
      mobCounts[m.name] = (mobCounts[m.name] || 0) + 1;
      genreCounts[m.genre] = (genreCounts[m.genre] || 0) + 1;
      zoneCounts[m.area] = (zoneCounts[m.area] || 0) + 1;
      if (m.icon) mobIcons[m.name] = m.icon;
    }

    const cLat = sumLat / clusterMobs.length;
    const cLng = sumLng / clusterMobs.length;

    // Avoid overlaps with existing spots
    let tooClose = false;
    for (let s = 0; s < selectedSpots.length; s++) {
      const ex = selectedSpots[s];
      const d2 = (ex.lat - cLat) * (ex.lat - cLat) + (ex.lng - cLng) * (ex.lng - cLng);
      if (d2 < suppressionDist2) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    // Primary zone
    let topZone = 'Altgard';
    let maxZoneCount = -1;
    Object.keys(zoneCounts).forEach(z => {
      if (zoneCounts[z] > maxZoneCount) {
        maxZoneCount = zoneCounts[z];
        topZone = z;
      }
    });

    // Dominant genre
    let domGenre = 'Cogni';
    let maxGenreCount = -1;
    Object.keys(genreCounts).forEach(g => {
      if (genreCounts[g] > maxGenreCount) {
        maxGenreCount = genreCounts[g];
        domGenre = g;
      }
    });

    selectedSpots.push({
      rank: selectedSpots.length + 1,
      lat: Math.round(cLat * 10) / 10,
      lng: Math.round(cLng * 10) / 10,
      radius: R,
      totalMobs: clusterMobs.length,
      zone: topZone,
      dominantGenre: isMultiMode && genresInCluster.size >= 2 ? 'multi' : domGenre,
      mobCounts: mobCounts,
      genreCounts: genreCounts,
      mobIcons: mobIcons,
      isMulti: genresInCluster.size > 1
    });

    for (let j = 0; j < cand.neighbors.length; j++) {
      usedMobIndices.add(cand.neighbors[j]);
    }

    if (selectedSpots.length >= 25) break;
  }

  return selectedSpots;
}

// 8. Recalculate Spots & Update Interface
function recalculateSpots() {
  const dataset = getActiveDataset();
  updateGenreCounters();

  const isMultiMode = (state.selectedGenre === 'multi');
  const hasSpecificMobs = (state.selectedMobs.size > 0);

  const filteredMobs = dataset.filter(mob => {
    // 1. Exclude collected / hidden
    if (state.hideCollected) {
      if (state.collectedSpecies.has(mob.name) || state.collectedPins.has(mob.id)) {
        return false;
      }
    }

    // 2. Genre filter
    if (!isMultiMode && state.selectedGenre !== 'all') {
      if (mob.genre !== state.selectedGenre) return false;
    }

    // 3. Specific mob filter
    if (hasSpecificMobs) {
      if (!state.selectedMobs.has(mob.name)) return false;
    }

    // 4. Zone filter
    if (state.selectedZone !== 'all') {
      if (mob.area !== state.selectedZone) return false;
    }

    return true;
  });

  // Render individual mob spawn markers
  renderMobMarkers(filteredMobs);

  // Find optimal spots
  state.spots = findOptimalSpots(filteredMobs, state.spotRadius, state.minMobs);

  // Render spot circles & badges on map
  renderSpotMarkers(state.spots);

  // Render sidebar leaderboard
  renderLeaderboard(state.spots);
}

// 9. Render Individual Pet Spawn Markers Layer
function renderMobMarkers(mobs) {
  mobMarkersLayerGroup.clearLayers();
  if (!state.showMobMarkers || !mobs || mobs.length === 0) return;

  const R = state.spotRadius;
  const R2 = R * R;
  const fullDataset = getFullDataset();

  // Spatial density pool: uncollected mobs from FULL dataset (PURE_PET_DATA + EXTENDED_PET_DATA)
  // regardless of purePetsOnly mode, so badges and popups reflect true local density
  const densityMobs = fullDataset.filter(mob => {
    if (state.hideCollected) {
      if (state.collectedSpecies.has(mob.name) || state.collectedPins.has(mob.id)) {
        return false;
      }
    }
    return true;
  });

  // Build Spatial Hash Grid for fast O(1) neighbor searches
  const cellSize = Math.max(R, 10);
  const grid = new Map();
  for (let i = 0; i < densityMobs.length; i++) {
    const mob = densityMobs[i];
    const gx = Math.floor(mob.lat / cellSize);
    const gy = Math.floor(mob.lng / cellSize);
    const key = `${gx}_${gy}`;
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(mob);
  }

  mobs.forEach(m => {
    const color = GENRE_COLORS[m.genre] || '#9ca3af';
    const dispName = I18N.getSpeciesName(m.name);
    const dispZone = I18N.getZoneName(m.area);
    const escapedName = m.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    // Find nearby mobs within radius R
    const gx = Math.floor(m.lat / cellSize);
    const gy = Math.floor(m.lng / cellSize);
    let sameCount = 0;
    let totalNearby = 0;
    const otherMap = new Map();

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = grid.get(`${gx + dx}_${gy + dy}`);
        if (!cell) continue;
        for (let k = 0; k < cell.length; k++) {
          const nm = cell[k];
          const d2 = (nm.lat - m.lat) * (nm.lat - m.lat) + (nm.lng - m.lng) * (nm.lng - m.lng);
          if (d2 <= R2) {
            totalNearby++;
            if (nm.name === m.name) {
              sameCount++;
            } else {
              const prev = otherMap.get(nm.name);
              if (prev) {
                prev.count++;
              } else {
                otherMap.set(nm.name, { count: 1, icon: nm.icon, genre: nm.genre });
              }
            }
          }
        }
      }
    }

    // Safety fallback
    if (sameCount === 0) sameCount = 1;
    if (totalNearby === 0) totalNearby = 1;

    // List of other species nearby sorted by count descending
    const otherSpeciesList = Array.from(otherMap.entries())
      .map(([name, data]) => ({ name, count: data.count, icon: data.icon, genre: data.genre }))
      .sort((a, b) => b.count - a.count);

    // Badge styling and text
    const hasOther = (totalNearby > sameCount);
    const badgeClass = `${sameCount > 1 ? 'multi' : 'single'}${hasOther ? ' has-other' : ''}`;
    const badgeTitle = hasOther
      ? I18N.t('badgeTitleMixed', { name: dispName, same: sameCount, total: totalNearby, radius: R })
      : I18N.t('badgeTitleSame', { name: dispName, count: sameCount, radius: R });

    let iconHtml;
    if (m.icon) {
      iconHtml = `
        <div class="pet-spawn-pin-wrapper">
          <div class="pet-spawn-avatar" style="border: 2px solid ${color}; box-shadow: 0 0 8px ${color};">
            <img src="${m.icon}" referrerpolicy="no-referrer" onerror="this.style.display='none'">
          </div>
          <span class="pet-pin-count-badge ${badgeClass}" data-count="${sameCount}" data-total="${totalNearby}" title="${badgeTitle}">${sameCount}</span>
        </div>
      `;
    } else {
      iconHtml = `
        <div class="pet-spawn-pin-wrapper">
          <div class="pet-spawn-avatar" style="border: 2px solid ${color}; background: ${color};"></div>
          <span class="pet-pin-count-badge ${badgeClass}" data-count="${sameCount}" data-total="${totalNearby}" title="${badgeTitle}">${sameCount}</span>
        </div>
      `;
    }

    const icon = L.divIcon({
      html: iconHtml,
      className: 'pet-spawn-pin',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14]
    });

    const marker = L.marker([m.lat, m.lng], { icon: icon });

    // Other species breakdown HTML for popup
    let otherSpeciesHtml = '';
    if (otherSpeciesList.length > 0) {
      otherSpeciesHtml = `
        <div class="pet-popup-other-section">
          <div class="pet-popup-other-title">${I18N.t('popupOtherSpeciesTitle')}</div>
          <div class="pet-popup-other-list">
            ${otherSpeciesList.map(other => {
              const oDispName = I18N.getSpeciesName(other.name);
              const oColor = GENRE_COLORS[other.genre] || '#9ca3af';
              const oIconTag = other.icon ? `<img src="${other.icon}" referrerpolicy="no-referrer" class="pet-popup-other-icon" style="border: 1px solid ${oColor};">` : '';
              return `
                <div class="pet-popup-other-item">
                  <div class="pet-popup-other-left">
                    ${oIconTag}
                    <span class="pet-popup-other-name" title="${oDispName}">${oDispName}</span>
                    <span style="font-size:10px;color:${oColor}">[${other.genre}]</span>
                  </div>
                  <span class="pet-popup-other-count">x${other.count}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Popup with detailed nearby spawn info & collection actions
    const popupHtml = `
      <div class="pet-popup-card">
        <div class="pet-popup-header">
          ${m.icon ? `<img src="${m.icon}" referrerpolicy="no-referrer" class="pet-popup-avatar" style="border: 2px solid ${color};">` : ''}
          <div>
            <div class="pet-popup-title">${dispName}</div>
            <div class="pet-popup-subtitle" style="color:${color}">[${m.genre}] • ${dispZone}${m.mob_name && m.mob_name !== m.name ? ` <span style="opacity:0.85;font-size:11px;">(${m.mob_name})</span>` : ''}</div>
          </div>
        </div>

        <div class="pet-popup-coords">
          ${I18N.t('markerCoords', { lat: m.lat, lng: m.lng })}
        </div>

        <div class="pet-popup-stats-box">
          <div class="pet-popup-stat-row">
            <span class="pet-popup-stat-label">${I18N.t('popupSpeciesInRadius', { radius: R, count: `<span class="pet-popup-stat-value highlight">${sameCount}</span>` })}</span>
          </div>
          <div class="pet-popup-stat-row">
            <span class="pet-popup-stat-label">${I18N.t('popupTotalNearby', { radius: R, count: `<span class="pet-popup-stat-value total">${totalNearby}</span>` })}</span>
          </div>
          ${otherSpeciesHtml}
        </div>

        <div class="marker-popup-actions">
          <button class="marker-action-btn collect-pin" onclick="collectPin('${m.id}', '${escapedName}')">${I18N.t('btnHidePin')}</button>
          <button class="marker-action-btn collect-species" onclick="toggleSpeciesCollected('${escapedName}')">${I18N.t('btnHideSpecies')}</button>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 290 });

    // Tooltip on hover reflecting count
    let tooltipHtml = `<b>${dispName}</b>${m.mob_name && m.mob_name !== m.name ? `<br><span style="font-size:11px;opacity:0.85;">${m.mob_name}</span>` : ''}<br><span style="color:${color}">[${m.genre}]</span> • ${dispZone}`;
    tooltipHtml += `<div style="margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.2);font-size:11px;line-height:1.3;">`;
    tooltipHtml += `<div>${I18N.t('tooltipSpeciesCount', { count: sameCount, radius: R })}</div>`;
    if (hasOther) {
      tooltipHtml += `<div style="color:#facc15;">${I18N.t('tooltipTotalNearby', { count: totalNearby, radius: R })}</div>`;
    }
    tooltipHtml += `</div>`;

    marker.bindTooltip(tooltipHtml, {
      direction: 'top',
      opacity: 0.95
    });

    mobMarkersLayerGroup.addLayer(marker);
  });
}

// 10. Render Spot Hotspots Layer
const spotMarkerMap = new Map();
function renderSpotMarkers(spots) {
  spotLayerGroup.clearLayers();
  spotMarkerMap.clear();

  spotsCountBadge.textContent = I18N.t('spotsCountBadge', { count: spots.length });

  spots.forEach((spot, idx) => {
    const color = GENRE_COLORS[spot.dominantGenre] || '#6366f1';

    // Outer circle
    if (state.showCircles) {
      const circle = L.circle([spot.lat, spot.lng], {
        radius: spot.radius,
        color: color,
        fillColor: color,
        fillOpacity: 0.16,
        weight: 2,
        dashArray: '3, 6'
      });
      spotLayerGroup.addLayer(circle);
    }

    // Center rank marker icon
    const rankHtml = `<div class="spot-marker-icon" style="background:${color};width:28px;height:28px;color:${color === '#facc15' ? '#000' : '#fff'};">#${spot.rank}</div>`;
    const icon = L.divIcon({
      html: rankHtml,
      className: 'custom-spot-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([spot.lat, spot.lng], { icon: icon, zIndexOffset: 500 - idx });

    // Popup Content
    const popupContent = createSpotPopupHtml(spot);
    marker.bindPopup(popupContent, { maxWidth: 330 });

    marker.on('click', () => {
      highlightSpotInSidebar(idx);
    });

    spotLayerGroup.addLayer(marker);
    spotMarkerMap.set(idx, marker);
  });
}

// 11. Generate Spot Popup HTML
function createSpotPopupHtml(spot) {
  const color = GENRE_COLORS[spot.dominantGenre] || '#6366f1';
  const hideTitle = I18N.t('hidePetInPopupTitle');
  
  // Sorted mob breakdown list with collected toggle
  const mobRows = Object.entries(spot.mobCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => {
      const iconUrl = spot.mobIcons && spot.mobIcons[name];
      const imgTag = iconUrl ? `<img src="${iconUrl}" referrerpolicy="no-referrer" style="width:18px;height:18px;border-radius:50%;margin-right:6px;object-fit:cover;background:#111;">` : '';
      const dispName = I18N.getSpeciesName(name);
      const escapedName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `
        <div class="popup-mob-row">
          <span style="display:flex;align-items:center;">
            ${imgTag}
            <span class="popup-mob-name" title="${dispName}">${dispName}</span>
          </span>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="popup-mob-count">x${count}</span>
            <button type="button" class="mob-hide-btn" title="${hideTitle}" onclick="toggleSpeciesCollected('${escapedName}')">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

  const genreTags = Object.entries(spot.genreCounts)
    .map(([g, cnt]) => `<span class="spot-tag ${g.toLowerCase()}">${g}: ${cnt}</span>`)
    .join(' ');

  const dispZone = I18N.getZoneName(spot.zone);

  return `
    <div class="popup-card">
      <div class="popup-title-row">
        <div class="popup-rank-title" style="color:${color}">
          <span>${I18N.t('spotPopupTitle', { rank: spot.rank })}</span>
          <span style="color:#fff;font-size:12px;">${I18N.t('spotPopupMobsCount', { count: spot.totalMobs })}</span>
        </div>
        <div class="popup-zone-badge">${dispZone}</div>
      </div>
      <div class="popup-coords-row">
        <span>${I18N.t('markerCoords', { lat: spot.lat, lng: spot.lng })}</span>
        <button class="copy-loc-btn" onclick="copyCoordinates('${spot.lat}, ${spot.lng}')">${I18N.t('copyBtn')}</button>
      </div>
      <div class="spot-breakdown-tags">
        ${genreTags}
      </div>
      <div style="font-size:10px;text-transform:uppercase;color:var(--text-muted);font-weight:600;margin-top:2px;">
        ${I18N.t('spotPopupComposition', { radius: spot.radius })}
      </div>
      <div class="popup-mobs-table">
        ${mobRows}
      </div>
    </div>
  `;
}

// 12. Render Leaderboard in Sidebar
function renderLeaderboard(spots) {
  spotsListContainer.innerHTML = '';

  if (spots.length === 0) {
    spotsListContainer.innerHTML = `
      <div class="empty-spots-card">
        <div class="empty-spots-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
          </svg>
        </div>
        <div class="empty-spots-title">${I18N.t('emptyStateTitle')}</div>
        <div class="empty-spots-desc">${I18N.t('emptyStateDesc')}</div>
        <ul class="empty-spots-tips">
          <li>${I18N.t('emptyStateTip1')}</li>
          <li>${I18N.t('emptyStateTip2')}</li>
          <li>${I18N.t('emptyStateTip3')}</li>
        </ul>
      </div>
    `;
    return;
  }

  spots.forEach((spot, idx) => {
    const card = document.createElement('div');
    card.className = `spot-card ${state.activeSpotIndex === idx ? 'selected' : ''}`;
    card.id = `spot-card-${idx}`;

    const color = GENRE_COLORS[spot.dominantGenre] || '#6366f1';

    const topMobEntries = Object.entries(spot.mobCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topMobText = topMobEntries.map(([name, count]) => `${count}x ${I18N.getSpeciesName(name)}`).join(' • ');

    const genreTags = Object.entries(spot.genreCounts)
      .map(([g, cnt]) => `<span class="spot-tag ${g.toLowerCase()}">${g}: ${cnt}</span>`)
      .join(' ');

    const dispZone = I18N.getZoneName(spot.zone);
    const mobTotalText = I18N.t('spotCardMobsCount', { count: spot.totalMobs });
    const mapCoordsText = I18N.t('spotCardMapCoords', { lat: spot.lat, lng: spot.lng });
    const copyText = I18N.t('copyBtn');

    card.innerHTML = `
      <div class="spot-card-top">
        <div class="spot-rank-badge">
          <span class="rank-num">#${spot.rank}</span>
          <span class="spot-zone-name">${dispZone}</span>
        </div>
        <div class="spot-mob-total" style="color:${color}">${mobTotalText}</div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${topMobText}">
        ${topMobText}
      </div>
      <div class="spot-breakdown-tags">
        ${genreTags}
      </div>
      <div class="spot-coords-bar">
        <span>${mapCoordsText}</span>
        <button class="copy-loc-btn" onclick="event.stopPropagation(); copyCoordinates('${spot.lat}, ${spot.lng}')">${copyText}</button>
      </div>
    `;

    card.addEventListener('click', () => {
      focusSpotOnMap(idx);
    });

    spotsListContainer.appendChild(card);
  });
}

function focusSpotOnMap(idx) {
  const spot = state.spots[idx];
  if (!spot) return;

  highlightSpotInSidebar(idx);

  map.flyTo([spot.lat, spot.lng], 4, {
    animate: true,
    duration: 0.6
  });

  const marker = spotMarkerMap.get(idx);
  if (marker) {
    setTimeout(() => {
      marker.openPopup();
    }, 400);
  }
}

function highlightSpotInSidebar(idx) {
  state.activeSpotIndex = idx;
  document.querySelectorAll('.spot-card').forEach((c, i) => {
    c.classList.toggle('selected', i === idx);
  });
  const card = document.getElementById(`spot-card-${idx}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// 13. Render & Manage Collected Pets Modal
function openCollectedModal() {
  collectedItemsList.innerHTML = '';

  const hasSpecies = state.collectedSpecies.size > 0;
  const hasPins = state.collectedPins.size > 0;

  if (!hasSpecies && !hasPins) {
    collectedItemsList.innerHTML = `<div style="padding:20px;color:var(--text-dim);text-align:center;">${I18N.t('modalEmpty')}</div>`;
    collectedModal.style.display = 'flex';
    return;
  }

  const restoreBtnText = I18N.t('modalRestoreBtn');

  // List collected species
  if (hasSpecies) {
    const speciesHeader = document.createElement('div');
    speciesHeader.style.cssText = 'font-weight:700;color:#fff;font-size:12px;margin-top:4px;';
    speciesHeader.textContent = I18N.t('modalSpeciesHeader', { count: state.collectedSpecies.size });
    collectedItemsList.appendChild(speciesHeader);

    state.collectedSpecies.forEach(name => {
      const row = document.createElement('div');
      row.className = 'collected-item-row';
      const dispName = I18N.getSpeciesName(name);
      const subInfo = (I18N.currentLang === 'ru' && dispName !== name) ? ` <span style="font-size:11px;color:var(--text-muted);font-weight:normal;">(${name})</span>` : '';
      const escapedName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      row.innerHTML = `
        <span style="font-weight:600;color:#fff;">${dispName}${subInfo}</span>
        <button class="collected-restore-btn" onclick="restoreSpecies('${escapedName}')">${restoreBtnText}</button>
      `;
      collectedItemsList.appendChild(row);
    });
  }

  // List collected pins
  if (hasPins) {
    const pinsHeader = document.createElement('div');
    pinsHeader.style.cssText = 'font-weight:700;color:#fff;font-size:12px;margin-top:10px;';
    pinsHeader.textContent = I18N.t('modalPinsHeader', { count: state.collectedPins.size });
    collectedItemsList.appendChild(pinsHeader);

    state.collectedPins.forEach(pinId => {
      const row = document.createElement('div');
      row.className = 'collected-item-row';
      row.innerHTML = `
        <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);">${I18N.t('modalPinLabel', { pinId })}</span>
        <button class="collected-restore-btn" onclick="restorePin('${pinId}')">${restoreBtnText}</button>
      `;
      collectedItemsList.appendChild(row);
    });
  }

  collectedModal.style.display = 'flex';
}

window.restoreSpecies = function(name) {
  state.collectedSpecies.delete(name);
  saveCollectedToStorage();
  openCollectedModal();
  populateMobList();
  recalculateSpots();
  showToast(I18N.t('toastSpeciesRestored', { name: I18N.getSpeciesName(name) }));
};

window.restorePin = function(pinId) {
  state.collectedPins.delete(pinId);
  saveCollectedToStorage();
  openCollectedModal();
  recalculateSpots();
  showToast(I18N.t('toastPinRestored', { pinId: pinId }));
};

function closeCollectedModal() {
  collectedModal.style.display = 'none';
}

function resetAllCollected() {
  if (state.collectedSpecies.size === 0 && state.collectedPins.size === 0) return;
  state.collectedSpecies.clear();
  state.collectedPins.clear();
  saveCollectedToStorage();
  closeCollectedModal();
  populateMobList();
  recalculateSpots();
  showToast(I18N.t('toastAllRestored'));
}

// 14. Copy Coordinates Function
window.copyCoordinates = function(coordsStr) {
  navigator.clipboard.writeText(coordsStr).then(() => {
    showToast(I18N.t('toastCopiedCoords', { coords: coordsStr }));
  }).catch(() => {
    showToast(`Copied: ${coordsStr}`);
  });
};

function showToast(text) {
  toastMsg.textContent = text;
  toastMsg.classList.add('show');
  setTimeout(() => {
    toastMsg.classList.remove('show');
  }, 2200);
}

// 15. Event Listeners & Controls Binding
function bindEvents() {
  // Sidebar Toggle
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    setTimeout(() => {
      map.invalidateSize();
    }, 320);
  });

  // Language Switcher Buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      I18N.setLanguage(lang);
    });
  });

  // Pure Pets Toggle Switch
  togglePurePets.addEventListener('change', (e) => {
    state.purePetsOnly = e.target.checked;
    populateMobList();
    recalculateSpots();
  });

  // Hide Collected Toggle Switch
  toggleHideCollected.addEventListener('change', (e) => {
    state.hideCollected = e.target.checked;
    recalculateSpots();
  });

  // Hide Selected Button
  btnHideSelectedMobs.addEventListener('click', () => {
    if (state.selectedMobs.size === 0) {
      showToast(I18N.t('toastSelectFirst'));
      return;
    }
    const count = state.selectedMobs.size;
    state.selectedMobs.forEach(name => {
      state.collectedSpecies.add(name);
    });
    state.selectedMobs.clear();
    updateSelectedMobsIndicator();
    saveCollectedToStorage();
    populateMobList();
    recalculateSpots();
    showToast(I18N.t('toastHiddenCount', { count }));
  });

  // Open & Close Collected Modal
  btnOpenCollected.addEventListener('click', openCollectedModal);
  btnCloseCollectedModal.addEventListener('click', closeCollectedModal);
  btnCloseModalBtn.addEventListener('click', closeCollectedModal);
  btnResetAllCollected.addEventListener('click', resetAllCollected);

  // Close modal when clicking on overlay background
  collectedModal.addEventListener('click', (e) => {
    if (e.target === collectedModal) closeCollectedModal();
  });

  // Genre Pills
  genrePills.forEach(pill => {
    pill.addEventListener('click', () => {
      genrePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedGenre = pill.dataset.genre;
      state.selectedMobs.clear();
      updateSelectedMobsIndicator();
      populateMobList();
      recalculateSpots();
    });
  });

  // Radius Preset Helpers
  function updateActiveRadiusPreset(radius) {
    const r = Number(radius);
    if (radiusPresetBtns) {
      radiusPresetBtns.forEach(btn => {
        const btnR = parseInt(btn.dataset.radius, 10);
        btn.classList.toggle('active', btnR === r);
      });
    }
  }

  // Mob Search & Clear Button
  mobSearchInput.addEventListener('input', () => {
    if (mobSearchClear) {
      mobSearchClear.style.display = mobSearchInput.value.trim().length > 0 ? 'flex' : 'none';
    }
    populateMobList();
  });

  if (mobSearchClear) {
    mobSearchClear.addEventListener('click', () => {
      mobSearchInput.value = '';
      mobSearchClear.style.display = 'none';
      mobSearchInput.focus();
      populateMobList();
    });
  }

  // Radius Presets Buttons
  if (radiusPresetBtns) {
    radiusPresetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.radius, 10);
        state.spotRadius = val;
        radiusSlider.value = val;
        radiusIndicator.textContent = I18N.t('radiusMeters', { val });
        updateActiveRadiusPreset(val);
        recalculateSpots();
      });
    });
  }

  // Select All Mobs in List
  btnSelectAllMobs.addEventListener('click', () => {
    const checkboxes = mobListScroll.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = true;
      state.selectedMobs.add(cb.value);
    });
    updateSelectedMobsIndicator();
    recalculateSpots();
  });

  // Clear Mobs Selection
  btnClearMobs.addEventListener('click', () => {
    state.selectedMobs.clear();
    const checkboxes = mobListScroll.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      cb.checked = false;
    });
    updateSelectedMobsIndicator();
    recalculateSpots();
  });

  // Zone Select Dropdown
  zoneSelect.addEventListener('change', (e) => {
    state.selectedZone = e.target.value;
    if (state.selectedZone !== 'all') {
      const poly = zonePolygonMap.get(state.selectedZone);
      if (poly) {
        map.fitBounds(poly.getBounds(), { padding: [40, 40], maxZoom: 4 });
      }
    }
    recalculateSpots();
  });

  // Radius Slider
  radiusSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    state.spotRadius = val;
    radiusIndicator.textContent = I18N.t('radiusMeters', { val });
    updateActiveRadiusPreset(val);
    recalculateSpots();
  });

  // Min Mobs Slider
  minMobsSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    state.minMobs = val;
    minMobsIndicator.textContent = `${val}`;
    recalculateSpots();
  });

  // Layer Toggles
  toggleMobMarkers.addEventListener('change', (e) => {
    state.showMobMarkers = e.target.checked;
    if (state.showMobMarkers) {
      if (!map.hasLayer(mobMarkersLayerGroup)) map.addLayer(mobMarkersLayerGroup);
      recalculateSpots();
    } else {
      mobMarkersLayerGroup.clearLayers();
    }
  });

  toggleZones.addEventListener('change', (e) => {
    state.showZones = e.target.checked;
    if (state.showZones) {
      if (!map.hasLayer(zoneLayerGroup)) map.addLayer(zoneLayerGroup);
    } else {
      if (map.hasLayer(zoneLayerGroup)) map.removeLayer(zoneLayerGroup);
    }
  });

  toggleCircles.addEventListener('change', (e) => {
    state.showCircles = e.target.checked;
    renderSpotMarkers(state.spots);
  });

  // Fit Map Button
  btnFitMap.addEventListener('click', () => {
    map.setView([1800, 2100], 2);
  });

  // Cursor HUD Coordinates
  map.on('mousemove', (e) => {
    const lat = Math.round(e.latlng.lat * 10) / 10;
    const lng = Math.round(e.latlng.lng * 10) / 10;
    coordsHUD.textContent = I18N.t('cursorHUD', { lat, lng });
  });

  // Language Change Reactive Listener
  I18N.onChange(() => {
    document.title = I18N.t('docTitle');
    radiusIndicator.textContent = I18N.t('radiusMeters', { val: state.spotRadius });
    updateActiveRadiusPreset(state.spotRadius);
    updateSelectedMobsIndicator();
    updateGenreCounters();
    initZones();
    populateMobList();
    recalculateSpots();
    updateCollectedCounter();
    if (collectedModal.style.display !== 'none') {
      openCollectedModal();
    }
  });
}

// 16. Initialize App
function initApp() {
  I18N.updateDOM();
  document.title = I18N.t('docTitle');
  radiusIndicator.textContent = I18N.t('radiusMeters', { val: state.spotRadius });
  loadCollectedFromStorage();
  initZones();
  updateGenreCounters();
  populateMobList();
  bindEvents();
  recalculateSpots();
}

// Boot
window.addEventListener('DOMContentLoaded', initApp);
