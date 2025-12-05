const map = L.map('map').setView([39.5, -98.5], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '© OpenStreetMap'
}).addTo(map);

let adding = false;
let coords = []; // stored as [lng, lat]
let markers = L.layerGroup().addTo(map);
let polyline = null;

// ...existing code...
let routes = loadRoutes();
let countiesGeo = null;
let countiesLayer = null;
let countiesVisible = true;

// auto-load counties.geojson from project folder (works when served over HTTP)
fetch('counties.geojson')
  .then(res => { if (!res.ok) throw new Error('not found'); return res.json(); })
  .then(geo => {
    countiesGeo = geo;
    if (countiesLayer) map.removeLayer(countiesLayer);
    countiesLayer = L.geoJSON(countiesGeo, { style: { color:'#444', weight:1, fill:false } }).addTo(map);
    countiesVisible = true;
    try { if (countiesLayer.getBounds && !countiesLayer.getBounds().isEmpty()) map.fitBounds(countiesLayer.getBounds()); } catch (e) {}
    updateInfo('Counties loaded from counties.geojson');
  })
  .catch(err => console.warn('Could not auto-load counties.geojson:', err));
// ...existing code...

const toggleAddBtn = document.getElementById('toggleAdd');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const routeNameInput = document.getElementById('routeName');
const routesSelect = document.getElementById('routesSelect');
const loadBtn = document.getElementById('loadBtn');
const deleteBtn = document.getElementById('deleteBtn');
const infoDiv = document.getElementById('info');
const countiesFile = document.getElementById('countiesFile');
const toggleCountiesBtn = document.getElementById('toggleCountiesBtn');
const countBtn = document.getElementById('countBtn');

map.on('click', e => {
  if (!adding) return;
  addWaypoint(e.latlng);
});

toggleAddBtn.addEventListener('click', () => {
  adding = !adding;
  toggleAddBtn.textContent = adding ? 'Stop adding' : 'Start adding (click map)';
});

undoBtn.addEventListener('click', () => {
  coords.pop();
  removeLastMarker();
  redraw();
});

clearBtn.addEventListener('click', () => {
  coords = [];
  markers.clearLayers();
  if (polyline) { map.removeLayer(polyline); polyline = null; }
  updateInfo('');
});

saveBtn.addEventListener('click', () => {
  const name = (routeNameInput.value || '').trim();
  if (coords.length < 2) return alert('Add at least 2 waypoints before saving.');
  const id = Date.now().toString();
  routes.push({ id, name: name || `Route ${new Date().toLocaleString()}`, coords, created: Date.now() });
  saveRoutes();
  populateRoutesList();
  updateInfo('Route saved.');
});

loadBtn.addEventListener('click', () => {
  const id = routesSelect.value;
  if (!id) return;
  const r = routes.find(x => x.id === id);
  if (!r) return;
  coords = JSON.parse(JSON.stringify(r.coords)); // copy
  markers.clearLayers();
  redraw();
  updateInfo(`Loaded \"${r.name}\"`);
});

deleteBtn.addEventListener('click', () => {
  const id = routesSelect.value;
  if (!id) return;
  routes = routes.filter(r => r.id !== id);
  saveRoutes();
  populateRoutesList();
  updateInfo('Route deleted.');
});

countiesFile.addEventListener('change', (ev) => {
  const f = ev.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      countiesGeo = JSON.parse(reader.result);
      if (countiesLayer) map.removeLayer(countiesLayer);
      countiesLayer = L.geoJSON(countiesGeo, { style: { color:'#444', weight:1, fill:false } }).addTo(map);
      countiesVisible = true;
      map.fitBounds(countiesLayer.getBounds());
      updateInfo('Counties file loaded.');
    } catch (e) {
      alert('Invalid GeoJSON file.');
    }
  };
  reader.readAsText(f);
});

toggleCountiesBtn.addEventListener('click', () => {
  if (!countiesLayer) return alert('Load a counties GeoJSON first.');
  if (countiesVisible) map.removeLayer(countiesLayer);
  else countiesLayer.addTo(map);
  countiesVisible = !countiesVisible;
});

countBtn.addEventListener('click', () => {
  if (!countiesGeo) return alert('Load a counties GeoJSON first.');
  if (coords.length < 2) return alert('Add at least 2 waypoints for a route.');
  const line = turf.lineString(coords);
  const found = new Set();
  for (const feat of countiesGeo.features || []) {
    try {
      if (turf.booleanIntersects(line, feat)) {
        const name = feat.properties?.NAME || feat.properties?.name || feat.properties?.COUNTY || feat.properties?.GEOID || 'unknown';
        found.add(name);
      }
    } catch (e) {
      // skip invalid geometries
    }
  }
  const arr = Array.from(found);
  updateInfo(`Visited ${arr.length} county(ies): ${arr.slice(0,10).join(', ')}${arr.length>10 ? ' ...' : ''}`);
});

// helper functions
function addWaypoint(latlng) {
  const lnglat = [parseFloat(latlng.lng.toFixed(6)), parseFloat(latlng.lat.toFixed(6))];
  coords.push(lnglat);
  const m = L.marker([lnglat[1], lnglat[0]]).addTo(markers);
  m.bindPopup(`#${coords.length}`).openPopup();
  redraw();
}

function removeLastMarker() {
  const children = markers.getLayers();
  if (children.length) {
    markers.removeLayer(children[children.length - 1]);
  }
}

function redraw() {
  if (polyline) { map.removeLayer(polyline); polyline = null; }
  if (coords.length >= 2) {
    const latlngs = coords.map(c => [c[1], c[0]]);
    polyline = L.polyline(latlngs, { color: '#d00' }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [40,40] });
  }
}

function updateInfo(text) { infoDiv.textContent = text || ''; }

function saveRoutes() {
  localStorage.setItem('driving_routes', JSON.stringify(routes));
}

function loadRoutes() {
  try {
    return JSON.parse(localStorage.getItem('driving_routes') || '[]');
  } catch (e) { return []; }
}

function populateRoutesList() {
  routesSelect.innerHTML = '';
  for (const r of routes) {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = `${r.name} (${new Date(r.created).toLocaleString()})`;
    routesSelect.appendChild(opt);
  }
}
populateRoutesList();

// if you saved a route previously, show a small hint
if (routes.length) updateInfo(`Loaded ${routes.length} saved route(s). Select and press Load to edit.`);