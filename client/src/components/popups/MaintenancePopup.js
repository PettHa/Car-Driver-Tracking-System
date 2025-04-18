// src/components/popups/MaintenancePopup.js
import React, { useState, useEffect } from 'react';

const MaintenancePopup = ({ isOpen, onClose, cars, onConfirm }) => {
  const [selectedCar, setSelectedCar] = useState('');
  const [note, setNote] = useState('');
  const [availableCars, setAvailableCars] = useState([]);

  // Update available cars when cars prop changes
  useEffect(() => {
    setAvailableCars(cars.filter(car => car.status !== 'maintenance'));
  }, [cars]);

  // Reset form when popup is opened
  useEffect(() => {
    if (isOpen) {
      setSelectedCar('');
      setNote('');
    }
  }, [isOpen]);

  // Handle confirm button click
  const handleConfirm = () => {
    if (!selectedCar) {
      alert('Vennligst velg en bil');
      return;
    }

    onConfirm(selectedCar, note);
  };

  // Handle select change
  const handleCarSelectChange = (e) => {
    setSelectedCar(e.target.value);
  };

  // Handle note change
  const handleNoteChange = (e) => {
    setNote(e.target.value);
  };

  return (
    <div className={`popup-overlay ${isOpen ? 'open' : ''}`}>
      <div className="popup-content">
        <h3 className="popup-title">Sett bil til vedlikehold</h3>
        <p>Velg bil som skal settes til vedlikehold:</p>
        
        <select 
          id="maintenance-car-select" 
          className="form-control" 
          style={{ 
            width: '100%', 
            padding: '10px', 
            marginBottom: '15px', 
            backgroundColor: 'var(--bg-tertiary)', 
            color: 'var(--text-primary)', 
            border: '1px solid var(--border)', 
            borderRadius: '4px' 
          }}
          value={selectedCar}
          onChange={handleCarSelectChange}
        >
          <option value="">-- Velg bil --</option>
          {availableCars.map(car => (
            <option key={car._id} value={car._id}>
              {car.carNumber} - {car.registrationNumber}
              {car.status === 'inuse' ? ' (I bruk)' : ''}
            </option>
          ))}
        </select>
        
        <div className="form-group">
          <label htmlFor="maintenance-note">Vedlikeholdsnotat:</label>
          <textarea 
            id="maintenance-note" 
            style={{ 
              width: '100%', 
              padding: '10px', 
              marginBottom: '10px', 
              backgroundColor: 'var(--bg-tertiary)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border)', 
              borderRadius: '4px' 
            }} 
            rows="3" 
            placeholder="Beskrivelse av vedlikeholdsårsak..."
            value={note}
            onChange={handleNoteChange}
          />
        </div>
        
        <div className="popup-buttons">
          <button 
            id="maintenance-cancel" 
            className="btn"
            style={{ 
              padding: '8px 16px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              border: '1px solid var(--border)', 
              backgroundColor: 'var(--bg-tertiary)', 
              color: 'var(--text-primary)' 
            }}
            onClick={onClose}
          >
            Avbryt
          </button>
          <button 
            id="maintenance-confirm" 
            className="btn btn-warning"
            style={{ 
              padding: '8px 16px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              border: 'none'
            }}
            onClick={handleConfirm}
          >
            Bekreft
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePopup;