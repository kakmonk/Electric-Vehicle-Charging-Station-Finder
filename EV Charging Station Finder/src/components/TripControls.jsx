import { useState } from 'react';
import '../styles/TripControls.css';

const TripControls = ({ onEndTrip }) => {
    return (
        <div className="trip-controls">
            <button 
                className="end-trip-button"
                onClick={onEndTrip}
                >
                    End Trip
                </button>
        </div>
    );
};

export default TripControls;
