import { useState } from 'react'
import '../styles/VehicleSelector.css'

const VehicleSelector = ({ onVehicleSelect }) => {
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [preferredCharge, setPreferredCharge] = useState(20);

    const vehicles = [
        { make: 'Tesla', model: 'Model 3' },
        { make: 'Tesla', model: 'Model Y '},
        { make: 'Nissan', model: 'Leaf' },
        { make: 'Chevrolet', model: 'Bolt'}

    ];

    const handleVehicleChange = (e) => {
        setSelectedVehicle(e.target.value);
        onVehicleSelect(e.target.value);
    };

    return (
        <div className="vehicle-selector">
            <select
                value={selectedVehicle}
                onChange={handleVehicleChange}
                className="vehicle-dropdown"
            >
                <option value="">Select your vehicle</option>
                {vehicles.map((vehicle, index) => (
                    <option key={index} value={`${vehicle.make} ${vehicle.model}`}>
                        {vehicle.make} {vehicle.model}
                    </option>
                ))}
            </select>
            <div className="charge-preference">
                <label>Preferred Minimum Charge (%)</label>
                <input 
                    type="range"
                    min= "10"
                    max="100"
                    value={preferredCharge}
                    onChange={(e) => setPreferredCharge(e.target.value)}
                />
                <span>{preferredCharge}%</span>
                    
            </div>
        </div>
    );
};

export default VehicleSelector;