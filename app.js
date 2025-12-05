// app.js

document.addEventListener('DOMContentLoaded', function() {
  // Mapbox access token
  const MAPBOX_TOKEN = 'pk.eyJ1Ijoicm9yeTRzeXRoZWxkZXIiLCJhIjoiY205MXV2eXh1MDUxejJqb2VyOXlqcHduMSJ9.jayP103_JPGAKudstFC6Zw';

  // ----- Map Initialization -----
  mapboxgl.accessToken = MAPBOX_TOKEN;
  const map = new mapboxgl.Map({
    container: 'map', // <-- must match the HTML
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-98.5795, 39.8283], // Center of USA
    zoom: 4
  });

  // ----- State management -----
  let countiesGeo = null; // Assign your loaded counties GeoJSON to this later
  let coords = []; // Array of [lng, lat] pairs as waypoints

  // Add controls
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  // Optionally: function to display info text
  function updateInfo(str) {
    const infoEl = document.getElementById('info');
    if(infoEl) infoEl.textContent = str;
  }

  // ----- Load countiesGeo data -----
  async function loadCountiesGeo(url) {
    try {
      const resp = await fetch(url);
      countiesGeo = await resp.json();
      updateInfo('Counties data loaded.');
    } catch (err) {
      updateInfo('Failed to load counties data.');
      console.error(err);
    }
  }
  // Uncomment to call this and load your counties:
  // loadCountiesGeo('counties.geojson');

  // ----- Add waypoint handling -----
  map.on('click', (e) => {
    const { lng, lat } = e.lngLat;
    coords.push([lng, lat]);
    // Add marker
    new mapboxgl.Marker().setLngLat([lng, lat]).addTo(map);
    updateInfo(`Waypoints: ${coords.length}`);
  });

  // ----- Route & County Intersection -----
  document.getElementById('countBtn').addEventListener('click', async () => {
    if (!countiesGeo) return alert('Load the counties GeoJSON first.');
    if (!coords || coords.length < 2) return alert('Add at least 2 waypoints for a route.');
    if (typeof turf === 'undefined') return alert('Turf.js library is required.');
    if (typeof updateInfo !== 'function') return alert('Missing updateInfo function.');

    // Build Directions API URL
    const waypointsStr = coords.map(c => `${c[0]},${c[1]}`).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypointsStr}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    let geoRoute;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data.routes || !data.routes[0]) throw new Error('No route found');
      geoRoute = data.routes[0].geometry; // GeoJSON LineString

      // Draw the route on the map
      if (map.getSource('route')) {
        map.removeLayer('route');
        map.removeSource('route');
      }
      map.addSource('route', { type: 'geojson', data: geoRoute });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ff6600', 'line-width': 4 }
      });
    } catch (err) {
      alert('Failed to fetch route from Mapbox.');
      console.error(err);
      return;
    }

    // Check intersections
    const routeLine = turf.lineString(geoRoute.coordinates);
    const found = new Set();
    for (const feat of countiesGeo.features || []) {
      try {
        if (turf.booleanIntersects(routeLine, feat)) {
          const name = feat.properties?.NAME || feat.properties?.name || feat.properties?.COUNTY || feat.properties?.GEOID || 'unknown';
          found.add(name);
        }
      } catch (e) {
        console.error('Error in intersection check:', e);
      }
    }
    const arr = Array.from(found);
    updateInfo(`Visited ${arr.length} county(ies): ${arr.slice(0, 10).join(', ')}${arr.length > 10 ? ' ...' : ''}`);
  });

});
