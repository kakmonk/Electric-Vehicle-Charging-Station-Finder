import { useState, useEffect, useRef } from 'react'
import Navbar from "./Navbar";
import VehicleSelector from './VehicleSelector';
import TripControls from './TripControls';
import '../styles/TripPlan.css'
import ChargingStations from './ChargingStations';

function TripPlan() {
    const [startLoc, changeStartLoc] = useState('')
    const [endLoc, changeEndLoc] = useState('')
    const [tripActive, setTripActive] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [preferredCharge, setPreferredCharge] = useState(20);
    const [chargingStations, setChargingStations] = useState([]);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const directionsServiceRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const markersRef = useRef([]);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Load Google Maps API script
    useEffect(() => {
        const loadGoogleMapsAPI = () => {
            console.log("Loading Google Maps API...");
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBegNi21KZBe3Wp9rNOE360XGv8wW8wGuk&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                console.log("Google Maps API loaded");
                setMapLoaded(true);
            };
            document.head.appendChild(script);
            
            return () => {
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
            };
        };

        if (!window.google || !window.google.maps) {
            loadGoogleMapsAPI();
        } else {
            console.log("Google Maps API already loaded");
            setMapLoaded(true);
        }
    }, []);

    // Initialize map when API is loaded
    useEffect(() => {
        if (mapLoaded && mapRef.current && !mapInstanceRef.current) {
            console.log("Map API loaded and ref available, initializing map");
            initMap();
        }
    }, [mapLoaded]);

    // Initialize map
    const initMap = () => {
        if (!window.google || !window.google.maps || !mapRef.current) {
            console.log("Cannot initialize map yet - missing dependencies");
            return;
        }
        
        console.log("Initializing map...");
        
        try {
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat: 37.0902, lng: -95.7129 }, // Center of US
                zoom: 4,
                mapTypeControl: true,
                streetViewControl: false
            });
            
            mapInstanceRef.current = map;
            
            directionsServiceRef.current = new window.google.maps.DirectionsService();
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: false
            });
            
            console.log("Map initialized successfully");
        } catch (error) {
            console.error("Error initializing map:", error);
        }
    };

    // Calculate and display route when trip is activated
    useEffect(() => {
        if (tripActive && startLoc && endLoc && mapLoaded) {
            console.log("Trip activated, calculating route...");
            
            // Ensure map is initialized
            if (!mapInstanceRef.current) {
                console.log("Map not initialized yet, initializing now");
                initMap();
            }
            
            if (mapInstanceRef.current) {
                calculateAndDisplayRoute();
            } else {
                console.error("Could not initialize map for route calculation");
            }
        }
    }, [tripActive, startLoc, endLoc, mapLoaded]);

    const calculateAndDisplayRoute = () => {
        if (!directionsServiceRef.current || !directionsRendererRef.current) {
            console.error("Directions service or renderer not initialized");
            return;
        }
        
        console.log("Calculating route from", startLoc, "to", endLoc);
        
        directionsServiceRef.current.route({
            origin: startLoc,
            destination: endLoc,
            travelMode: window.google.maps.TravelMode.DRIVING
        }, (response, status) => {
            if (status === 'OK') {
                console.log("Route calculated successfully");
                directionsRendererRef.current.setDirections(response);
                
                // If we already have charging stations, display them
                // from the Charging stations API
                if (chargingStations.length > 0) {
                    console.log("Displaying existing charging stations");
                    displayChargingStations(chargingStations);
                }
            } else {
                console.error('Directions request failed due to ' + status);
                alert("Could not calculate route. Please check your locations and try again.");
            }
        });
    };

    // Display charging stations on the map
    const displayChargingStations = (stations) => {
        console.log("Displaying charging stations on map:", stations);
        
        // Clear existing markers
        clearMarkers();
        
        if (!mapInstanceRef.current) {
            console.error("Map not initialized, cannot display stations");
            return;
        }
        
        const map = mapInstanceRef.current;
        const infoWindow = new window.google.maps.InfoWindow({
            pixelOffset: new window.google.maps.Size(0, -30) // Offset to position above the marker
        });
        
        // Process each station
        stations.forEach(station => {
            if (!station.latitude || !station.longitude) {
                console.warn(`Missing coordinates for station: ${station.station_name || 'Unknown'}`);
                return;
            }
            
            // Parse coordinates to ensure they're numbers
            const lat = parseFloat(station.latitude);
            const lng = parseFloat(station.longitude);
            
            if (isNaN(lat) || isNaN(lng)) {
                console.warn(`Invalid coordinates for station ${station.station_name}: ${station.latitude}, ${station.longitude}`);
                return;
            }
            
            // Check if coordinates are within reasonable bounds
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                console.warn(`Coordinates out of bounds for station ${station.station_name}: ${lat}, ${lng}`);
                return;
            }
            
            // Get the full address
            const fullAddress = `${station.street_address || ''}, ${station.city || ''}, ${station.state || ''} ${station.zip || ''}`;
            
            console.log(`Creating marker for ${station.station_name} at ${lat}, ${lng}`);
            
            try {
                const marker = new window.google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                    title: fullAddress, // Show address on hover
                    icon: {
                        url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                        scaledSize: new window.google.maps.Size(40, 40)
                    },
                    zIndex: 1000
                });
                
                marker.addListener('click', () => {
                    // Create the info window content with all required information
                    const content = `
                        <div style="padding: 10px; min-width: 200px; max-width: 300px;">
                            <h3 style="margin-top: 0; margin-bottom: 8px; color: #333; font-size: 16px;">${station.station_name}</h3>
                            <p style="margin: 5px 0; font-size: 14px; color: #555;">${fullAddress}</p>
                            <p style="margin: 5px 0; font-size: 14px; color: #555;"><strong>Connectors:</strong> ${Array.isArray(station.ev_connector_types) 
                                ? station.ev_connector_types.join(', ') 
                                : station.ev_connector_types || 'Unknown'}</p>
                            <p style="margin: 5px 0; font-size: 14px; color: #555;"><strong>Distance:</strong> ${station.distance?.toFixed(2) || '?'} miles</p>
                            <button id="add-to-route-${station.id}" style="background-color: #646cff; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 8px; font-size: 14px; width: 100%;">
                                Add to Route
                            </button>
                        </div>
                    `;
                    
                    infoWindow.setContent(content);
                    infoWindow.open(map, marker);
                    
                    // Add event listener after the info window is opened
                    setTimeout(() => {
                        const button = document.getElementById(`add-to-route-${station.id}`);
                        if (button) {
                            button.addEventListener('click', () => {
                                addStationToRoute(station);
                            });
                        }
                    }, 300);
                });
                
                markersRef.current.push(marker);
            } catch (error) {
                console.error("Error creating marker for station:", station.station_name, error);
            }
        });
        
        console.log(`Added ${markersRef.current.length} markers to the map`);
    };
    
    const clearMarkers = () => {
        if (markersRef.current.length > 0) {
            console.log("Clearing existing markers");
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
        }
    };
    
    const addStationToRoute = (station) => {
        const stationAddress = `${station.street_address}, ${station.city}, ${station.state} ${station.zip}`;
        window.open(
            `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(startLoc)}&destination=${encodeURIComponent(endLoc)}&waypoints=${encodeURIComponent(stationAddress)}`,
            '_blank'
        );
    };

    const getRoute = async () => {
        if (!startLoc || !endLoc) {
            alert("Please enter both start and destination locations");
            return;
        }
        
        // If this is a new trip after ending a previous one, ensure map is ready
        if (!mapInstanceRef.current && mapLoaded) {
            console.log("Map instance not found, re-initializing for new trip");
            initMap();
        }
        
        setTripActive(true);
    };

    const handleEndTrip = () => {
        // Set trip to inactive
        setTripActive(false);
        
        // Clear markers
        clearMarkers();
        
        // Clear directions
        if (directionsRendererRef.current) {
            directionsRendererRef.current.setDirections({ routes: [] });
        }
        
        // Reset charging stations
        setChargingStations([]);
        
        // Reset map instance to force re-initialization on next trip
        mapInstanceRef.current = null;
        directionsServiceRef.current = null;
        directionsRendererRef.current = null;
        
        // Keep the map element but reset its content
        if (mapRef.current) {
            // Clear the map element's content
            while (mapRef.current.firstChild) {
                mapRef.current.removeChild(mapRef.current.firstChild);
            }
        }
        
        console.log("Trip ended, map state reset");
    };

    const handleVehicleSelect = (vehicle) => {
        console.log("Vehicle selected:", vehicle);
        setSelectedVehicle(vehicle);
    };

    const handlePreferredChargeChange = (charge) => {
        console.log("Preferred charge changed:", charge);
        setPreferredCharge(charge);
    };

    const handleStationsLoaded = (stations) => {
        console.log("Stations loaded:", stations);
        setChargingStations(stations);
        
        // Display the stations on the map only if map is initialized
        if (stations.length > 0 && mapInstanceRef.current) {
            displayChargingStations(stations);
        } else if (stations.length > 0) {
            console.warn("Map not initialized yet, cannot display stations");
        }
    };

    return (
        <>
            <Navbar />
            <h1>Electric Vehicle Charging Station Finder</h1>
            <div className="card">
                <VehicleSelector 
                    onVehicleSelect={handleVehicleSelect}
                    onPreferredChargeChange={handlePreferredChargeChange}
                />
                <div className="input-container">
                    <input
                        type="text"
                        value={startLoc}
                        onChange={(e) => changeStartLoc(e.target.value)}
                        placeholder="Start location"></input>
                    <input
                        type="text"
                        value={endLoc}
                        onChange={(e) => changeEndLoc(e.target.value)}
                        placeholder="Destination location"></input>
                    <button onClick={getRoute}>Start Trip</button>
                </div>
            </div>
            
            {tripActive && (
                <>
                    <div className="map-container">
                        <div 
                            ref={mapRef} 
                            style={{ width: '100%', height: '500px' }}
                        ></div>
                    </div>
                    
                    <ChargingStations
                        startLoc={startLoc}
                        endLoc={endLoc}
                        selectedVehicle={selectedVehicle}
                        preferredCharge={preferredCharge}
                        onStationsLoaded={handleStationsLoaded}
                    />
                    
                    <TripControls onEndTrip={handleEndTrip} />
                </>
            )}
        </>
    );
}

export default TripPlan;
