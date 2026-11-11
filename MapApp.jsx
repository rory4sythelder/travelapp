import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import axios from 'axios';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

export default function MapApp({ countyGeoJSON }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  
  const [waypoints, setWaypoints] = useState([]);
  const [addressInput, setAddressInput] = useState('');
  const [visitedCounties, setVisitedCounties] = useState([]);
  const [tripHistory, setTripHistory] = useState([]);
  const [tripName, setTripName] = useState('');

  // Initialize Map
  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [-98.5795, 39.8283],
      zoom: 3
    });

    map.current.on('load', () => {
      map.current.addSource('route', { type: 'geojson', data: turf.featureCollection([]) });
      map.current.addLayer({
        id: 'route-layer',
        type: 'line',
        source: 'route',
        paint: { 'line-color': '#3887be', 'line-width': 5 }
      });
    });
    
    // Load history from browser storage instead of a database
    const savedHistory = JSON.parse(localStorage.getItem('mapTrips')) || [];
    setTripHistory(savedHistory);
  }, []);

  // 1. Geocoding: Convert Address to Coordinates
  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!addressInput) return;

    const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressInput)}.json?access_token=${mapboxgl.accessToken}`;
    
    try {
      const response = await axios.get(endpoint);
      const features = response.data.features;
      if (features.length > 0) {
        const coords = features[0].center; // [lng, lat]
        const newWaypoints = [...waypoints, coords];
        setWaypoints(newWaypoints);
        setAddressInput('');
        
        if (newWaypoints.length > 1) {
          calculateRoute(newWaypoints);
        }
      }
    } catch (error) {
      console.error("Geocoding failed", error);
    }
  };

  // 2. Multi-Destination Routing & Turf.js Calculation
  const calculateRoute = async (points) => {
    const coordString = points.map(p => `${p[0]},${p[1]}`).join(';');
    const routingUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    try {
      const response = await axios.get(routingUrl);
      const routeGeoJSON = response.data.routes[0].geometry;
      
      map.current.getSource('route').setData(routeGeoJSON);

      const line = turf.lineString(routeGeoJSON.coordinates);
      const intersected = [];

      turf.featureEach(countyGeoJSON, (currentCounty) => {
        if (turf.booleanIntersects(line, currentCounty)) {
          intersected.push({
            geoid: currentCounty.properties.GEOID,
            name: currentCounty.properties.NAME
          });
        }
      });

      setVisitedCounties(intersected);
    } catch (error) {
      console.error("Routing calculation failed", error);
    }
  };

  // 3. Save History to Local Storage
  const saveTrip = () => {
    if (!tripName || visitedCounties.length === 0) return;
    
    const newTrip = {
      id: Date.now(),
      name: tripName,
      counties: visitedCounties,
      created_at: new Date().toISOString()
    };

    const updatedHistory = [newTrip, ...tripHistory];
    
    // Save to browser
    localStorage.setItem('mapTrips', JSON.stringify(updatedHistory));
    
    setTripHistory(updatedHistory);
    setTripName('');
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <div id="sidebar" style={{ width: '350px', padding: '20px', background: '#f8f9fa', overflowY: 'auto' }}>
        
        <h3>Add Destination</h3>
        <form onSubmit={handleAddAddress} style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            value={addressInput} 
            onChange={(e) => setAddressInput(e.target.value)} 
            placeholder="Enter address or city" 
            style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
          />
          <button type="submit" style={{ width: '100%', padding: '8px' }}>Add Stop</button>
        </form>

        {visitedCounties.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h3>Current Trip</h3>
            <p>Counties Visited: {visitedCounties.length}</p>
            <input 
              type="text" 
              value={tripName} 
              onChange={(e) => setTripName(e.target.value)} 
              placeholder="Name this trip" 
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <button onClick={saveTrip} style={{ width: '100%', padding: '8px', background: '#28a745', color: 'white' }}>
              Save Trip
            </button>
          </div>
        )}

        <h3>Trip History (Local)</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tripHistory.map(trip => (
            <li key={trip.id} style={{ borderBottom: '1px solid #ddd', padding: '10px 0' }}>
              <strong>{trip.name}</strong><br/>
              <small>{new Date(trip.created_at).toLocaleDateString()}</small><br/>
              <small>{trip.counties.length} counties</small>
            </li>
          ))}
        </ul>
      </div>

      {/* Map Container */}
      <div ref={mapContainer} style={{ flexGrow: 1 }} />
    </div>
  );
}
