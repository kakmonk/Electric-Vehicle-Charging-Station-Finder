import { useState, useEffect } from 'react';
import '../styles/ChargingStations.css';

const ChargingStations = ({ startLoc, endLoc, selectedVehicle, preferredCharge, onStationsLoaded }) => {
    const [chargingStations, setChargingStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [preferredLevel, setPreferredLevel] = useState("Level 1");
    const API_BASE = "http://3.85.120.248:5000/api"; // reminder to create .env file and put in there, just did this for declutter
    const userId = localStorage.getItem("user_id");
  
  // The NREL API key I requested
  const NREL_API_KEY = "r0NCZXURTbDJaKTSRwfskmw0ylvQXsVlUbhJFQI4";

    useEffect(() => {
        const fetchUserPreferences = async () => {
            if (!userId) return; // if no user is logged in, keep default

            try {
                const res = await fetch(`${API_BASE}/preferences/${userId}`);
                const data = await res.json();
                const userPreferred = data.preferences?.charging_type || "Level 1";
                console.log("THIS IS THE PREFERRED LEVEL: ", userPreferred);
                setPreferredLevel(userPreferred);
            } catch (err) {
                console.error("Failed to fetch user preferences, defaulting to Level 1", err);
            }
        };

        fetchUserPreferences();
    }, [userId]);

  useEffect(() => {
    if (startLoc && endLoc && preferredLevel) {
      fetchChargingStations();
    }
  }, [startLoc, endLoc, selectedVehicle, preferredLevel]);

  const fetchChargingStations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First, get coordinates for start and end locations
      const startCoords = await geocodeLocation(startLoc);
      const endCoords = await geocodeLocation(endLoc);
      
      if (!startCoords || !endCoords) {
        throw new Error("Could not determine location coordinates");
      }
      
      console.log("Start coordinates:", startCoords);
      console.log("End coordinates:", endCoords);
      
      // Calculate midpoint between start and end for searching
      const midpoint = {
        lat: (startCoords.lat + endCoords.lat) / 2,
        lng: (startCoords.lng + endCoords.lng) / 2
      };
      
      // Calculate distance between points to determine search radius
      const distance = haversineDistance(startCoords, endCoords);
      const searchRadius = Math.min(distance / 2, 50); // Max 50 miles radius
      
      console.log(`Searching for stations near ${midpoint.lat},${midpoint.lng} with radius ${searchRadius} miles`);
      
      // Using the National Renewable Energy Laboratory (NREL) API
      const response = await fetch(
        `https://developer.nrel.gov/api/alt-fuel-stations/v1/nearest.json?api_key=${NREL_API_KEY}&fuel_type=ELEC&latitude=${midpoint.lat}&longitude=${midpoint.lng}&radius=${searchRadius}&limit=10&status=E`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
        const data = await response.json();
        console.log("NREL API Response:", data);
        data.fuel_stations.forEach(station => {
            console.log(`${station.station_name} | L1: ${station.ev_level1_evse_num}, L2: ${station.ev_level2_evse_num}, Fast: ${station.ev_dc_fast_num}`);
        });

      
      if (data.fuel_stations && data.fuel_stations.length > 0) {
        // Transform the data to our format
        const stations = data.fuel_stations.map(station => ({
          id: station.id,
          station_name: station.station_name,
          street_address: station.street_address,
          city: station.city,
          state: station.state,
          zip: station.zip,
          ev_connector_types: station.ev_connector_types || ["Unknown"],
          distance: station.distance,
          latitude: station.latitude,
          longitude: station.longitude,
          ev_level1_evse_num: station.ev_level1_evse_num || 0,
          ev_level2_evse_num: station.ev_level2_evse_num || 0,
          ev_dc_fast_num: station.ev_dc_fast_num || 0
        }));
        
        console.log("Processed stations:", stations);

          
          let filteredStations = stations;

          if (preferredLevel) {
              const level = preferredLevel.trim().toLowerCase();

              filteredStations = filteredStations.filter(station => {
                  if (level === "level 1") {
                      return station.ev_level1_evse_num > 0 || station.ev_level2_evse_num > 0 || station.ev_dc_fast_num > 0;
                  } else if (level === "level 2") {
                      return station.ev_level2_evse_num > 0 || station.ev_dc_fast_num > 0;
                  } else if (level.includes("fast")) {
                      return station.ev_dc_fast_num > 0;
                  } else {
                      return true;
                  }
              });
          }
          
        
        if (selectedVehicle) {
          // Determine compatible connector types based on vehicle
          const compatibleConnectors = getCompatibleConnectors(selectedVehicle);

          // Sort stations by compatibility
          filteredStations = filteredStations.sort((a, b) => {
            const aCompatibility = getStationCompatibilityScore(a, compatibleConnectors);
            const bCompatibility = getStationCompatibilityScore(b, compatibleConnectors);
            return bCompatibility - aCompatibility; // Higher score first
          });
          }

          console.log("Filtered Stations:", filteredStations.length);
          filteredStations.forEach(s => {
              console.log(`${s.station_name} passed the filter`);
          });

        if (filteredStations.length === 0) {
            console.warn(`No stations found for preferred level: ${preferredLevel}, using all stations.`);
            filteredStations = stations;
        } 
        console.log('Filtered Results:', filteredStations); 
          setChargingStations(filteredStations);

        
        // Pass the stations to parent component for map display
        if (onStationsLoaded) {
          onStationsLoaded(filteredStations);
        }
      } else {
        console.log("No stations found from NREL API at midpoint, trying multiple points along route");
        // Try searching at multiple points along the route
        const routeStations = await findStationsAlongRoute(startCoords, endCoords);
        
        if (routeStations.length > 0) {
          console.log("Found stations along route:", routeStations);
          setChargingStations(routeStations);
          
          // Pass the stations to parent component for map display
          if (onStationsLoaded) {
            onStationsLoaded(routeStations);
          }
        } else {
          console.log("No stations found along route, trying at start and end points");
          // Try one more approach - search at both start and end locations with larger radius
          const endPointStations = await searchAtBothEnds(startCoords, endCoords);
          
          if (endPointStations.length > 0) {
            console.log("Found stations at route ends:", endPointStations);
            setChargingStations(endPointStations);
            
            // Pass the stations to parent component for map display
            if (onStationsLoaded) {
              onStationsLoaded(endPointStations);
            }
          } else {
            throw new Error("No charging stations found near this route");
          }
        }
      }
    } catch (err) {
      console.error("Error fetching charging stations:", err);
      setError(`Failed to load charging stations: ${err.message}`);
      setChargingStations([]);
      
      // Pass empty array to parent component
      if (onStationsLoaded) {
        onStationsLoaded([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Find stations at multiple points along the route
  const findStationsAlongRoute = async (startCoords, endCoords) => {
    // Create points along the route
    const points = [
      startCoords,
      {
        lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.25,
        lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.25
      },
      {
        lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.5,
        lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.5
      },
      {
        lat: startCoords.lat + (endCoords.lat - startCoords.lat) * 0.75,
        lng: startCoords.lng + (endCoords.lng - startCoords.lng) * 0.75
      },
      endCoords
    ];
    
    // Use the NREL API to search at each point
    const stations = [];
    
    for (const point of points) {
      try {
        const response = await fetch(
          `https://developer.nrel.gov/api/alt-fuel-stations/v1/nearest.json?api_key=${NREL_API_KEY}&fuel_type=ELEC&latitude=${point.lat}&longitude=${point.lng}&radius=10&limit=3&status=E`
        );
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.fuel_stations && data.fuel_stations.length > 0) {
            for (const station of data.fuel_stations) {
              // Check if this station is already in our list
              if (!stations.some(s => s.id === station.id)) {
                stations.push({
                  id: station.id,
                  station_name: station.station_name,
                  street_address: station.street_address,
                  city: station.city,
                  state: station.state,
                  zip: station.zip,
                  ev_connector_types: station.ev_connector_types || ["Unknown"],
                  distance: station.distance,
                  latitude: station.latitude,
                    longitude: station.longitude,
                    ev_level1_evse_num: station.ev_level1_evse_num || 0,
                    ev_level2_evse_num: station.ev_level2_evse_num || 0,
                    ev_dc_fast_num: station.ev_dc_fast_num || 0
                });
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching stations at point:", point, err);
      }
    }
    
    return stations.sort((a, b) => a.distance - b.distance);
  };

  // Search at both start and end with larger radius as last resort
  const searchAtBothEnds = async (startCoords, endCoords) => {
    const stations = [];
    const searchRadius = 30; // Larger radius for last resort
    
    // Search at start location
    try {
      const startResponse = await fetch(
        `https://developer.nrel.gov/api/alt-fuel-stations/v1/nearest.json?api_key=${NREL_API_KEY}&fuel_type=ELEC&latitude=${startCoords.lat}&longitude=${startCoords.lng}&radius=${searchRadius}&limit=5&status=E`
      );
      
      if (startResponse.ok) {
        const data = await startResponse.json();
        
        if (data.fuel_stations && data.fuel_stations.length > 0) {
          for (const station of data.fuel_stations) {
            stations.push({
              id: station.id,
              station_name: station.station_name,
              street_address: station.street_address,
              city: station.city,
              state: station.state,
              zip: station.zip,
              ev_connector_types: station.ev_connector_types || ["Unknown"],
              distance: station.distance,
              latitude: station.latitude,
                longitude: station.longitude,
                ev_level1_evse_num: station.ev_level1_evse_num || 0,
                ev_level2_evse_num: station.ev_level2_evse_num || 0,
                ev_dc_fast_num: station.ev_dc_fast_num || 0
            });
          }
        }
      }
    } catch (err) {
      console.error("Error searching at start location:", err);
    }
    
    // Search at end location
    try {
      const endResponse = await fetch(
        `https://developer.nrel.gov/api/alt-fuel-stations/v1/nearest.json?api_key=${NREL_API_KEY}&fuel_type=ELEC&latitude=${endCoords.lat}&longitude=${endCoords.lng}&radius=${searchRadius}&limit=5&status=E`
      );
      
      if (endResponse.ok) {
        const data = await endResponse.json();
        
        if (data.fuel_stations && data.fuel_stations.length > 0) {
          for (const station of data.fuel_stations) {
            // Check if this station is already in our list
            if (!stations.some(s => s.id === station.id)) {
              stations.push({
                id: station.id,
                station_name: station.station_name,
                street_address: station.street_address,
                city: station.city,
                state: station.state,
                zip: station.zip,
                ev_connector_types: station.ev_connector_types || ["Unknown"],
                distance: station.distance,
                latitude: station.latitude,
                  longitude: station.longitude,
                  ev_level1_evse_num: station.ev_level1_evse_num || 0,
                  ev_level2_evse_num: station.ev_level2_evse_num || 0,
                  ev_dc_fast_num: station.ev_dc_fast_num || 0
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error searching at end location:", err);
    }
    
    return stations.sort((a, b) => a.distance - b.distance);
  };

  // Get compatible connector types based on vehicle
  const getCompatibleConnectors = (vehicle) => {
    const vehicleLower = vehicle.toLowerCase();
    
    if (vehicleLower.includes('tesla')) {
      return ['TESLA', 'J1772', 'NEMA1450', 'NEMA515', 'NEMA520'];
    } else if (vehicleLower.includes('nissan') && vehicleLower.includes('leaf')) {
      return ['J1772', 'CHADEMO'];
    } else if (vehicleLower.includes('chevrolet') && vehicleLower.includes('bolt')) {
      return ['J1772', 'CCS'];
    } else {
      // Default for most non-Tesla EVs
      return ['J1772', 'CCS'];
    }
  };

  // Calculate compatibility score for a station
  const getStationCompatibilityScore = (station, compatibleConnectors) => {
    if (!station.ev_connector_types || !Array.isArray(station.ev_connector_types)) {
      return 0;
    }
    
    let score = 0;
    for (const connector of station.ev_connector_types) {
      if (compatibleConnectors.some(c => connector.includes(c))) {
        score += 1;
      }
    }
    
    return score;
  };

  const geocodeLocation = async (location) => {
    try {
      const API_KEY = "AIzaSyBegNi21KZBe3Wp9rNOE360XGv8wW8wGuk"; // Your existing Google Maps API key, hope it didn't change
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng
        };
      }
      
      return null;
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  };

  const haversineDistance = (point1, point2) => {
    const R = 3958.8; // Earth's radius in miles
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const addStationToRoute = (station) => {
    const stationAddress = `${station.street_address}, ${station.city}, ${station.state} ${station.zip}`;
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLoc)}&destination=${encodeURIComponent(endLoc)}&waypoints=${encodeURIComponent(stationAddress)}`,
      '_blank'
    );
  };

  return (
    <div className="charging-stations-container">
      <h3>Charging Stations Along Route</h3>
      {loading && <p>Looking for charging stations along your route...</p>}
      {error && <p className="error">{error}</p>}
      
      <div className="stations-list">
        {chargingStations.length > 0 ? (
          chargingStations.map((station) => (
            <div key={station.id} className="station-card">
                            <h4>{station.station_name}</h4>
              <p>{station.street_address}, {station.city}, {station.state} {station.zip}</p>
              <p>
                <strong>Connectors:</strong> {Array.isArray(station.ev_connector_types) 
                  ? station.ev_connector_types.join(', ') 
                  : station.ev_connector_types || 'Unknown'}
              </p>
              <p>
                <strong>Distance:</strong> {station.distance?.toFixed(2) || '?'} miles
              </p>
              <button 
                className="add-to-route-btn"
                onClick={() => addStationToRoute(station)}
              >
                Add to Route
              </button>
            </div>
          ))
        ) : (
          <p>No charging stations found along this route.</p>
        )}
      </div>
    </div>
  );
};

export default ChargingStations;

