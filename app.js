// At the very top of app.js:
const MAPBOX_TOKEN = 'pk.eyJ1Ijoicm9yeTRzeXRoZWxkZXIiLCJhIjoiY205MXV2eXh1MDUxejJqb2VyOXlqcHduMSJ9.jayP103_JPGAKudstFC6Zw';

// ...rest of your code...

// Replace your existing countBtn click handler with this (find lines starting with "countBtn.addEventListener('click', ...)" and replace the whole block):

countBtn.addEventListener('click', async () => {
  if (!countiesGeo) return alert('Load a counties GeoJSON first.');
  if (coords.length < 2) return alert('Add at least 2 waypoints for a route.');

  // Request Mapbox driving route via Directions API
  const waypointsStr = coords.map(c => `${c[0]},${c[1]}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypointsStr}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
  let geoRoute;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    if (!data.routes || !data.routes[0]) throw new Error('No route found');
    geoRoute = data.routes[0].geometry; // GeoJSON LineString
  } catch (err) {
    return alert('Failed to fetch route from Mapbox.');
  }

  // Check each county for intersection with driven route
  const routeLine = turf.lineString(geoRoute.coordinates);
  const found = new Set();
  for (const feat of countiesGeo.features || []) {
    try {
      if (turf.booleanIntersects(routeLine, feat)) {
        const name = feat.properties?.NAME || feat.properties?.name || feat.properties?.COUNTY || feat.properties?.GEOID || 'unknown';
        found.add(name);
      }
    } catch (e) { }
  }
  const arr = Array.from(found);
  updateInfo(`Visited ${arr.length} county(ies): ${arr.slice(0,10).join(', ')}${arr.length>10 ? ' ...' : ''}`);
});
