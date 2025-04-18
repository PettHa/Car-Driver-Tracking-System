// src/components/popups/EndAllTripsPopup.js
import React from 'react';

const EndAllTripsPopup = ({ isOpen, onClose, onConfirm }) => {
  return (
    <div className={`popup-overlay ${isOpen ? 'open' : ''}`}>
      <div className="popup-content">
        <h3 className="popup-title">Avslutt alle aktive turer</h3>
        <p>Er du sikker på at du vil avslutte alle aktive turer? Dette vil registrere at alle biler som er i bruk nå er ledige.</p>
        <div className="popup-buttons">
          <button 
            id="end-all-cancel" 
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
            id="end-all-confirm" 
            className="btn btn-danger"
            style={{ 
              padding: '8px 16px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              border: 'none'
            }}
            onClick={onConfirm}
          >
            Bekreft
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndAllTripsPopup;