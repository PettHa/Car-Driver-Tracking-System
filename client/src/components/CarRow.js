// src/components/CarRow.js
import React, { useState, useEffect } from 'react';

const CarRow = ({ car, onSave, savingStatus, editable }) => {
  const [driver, setDriver] = useState(car.driver || '');
  const [note, setNote] = useState(car.note || '');
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Update local state when car prop changes
  useEffect(() => {
    setDriver(car.driver || '');
    setNote(car.note || '');
    setUnsavedChanges(false);
  }, [car]);

  // Get formatted status text
  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Ledig';
      case 'inuse':
        return 'I bruk';
      case 'maintenance':
        return 'Vedlikehold';
      default:
        return status;
    }
  };

  // Get status class
  const getStatusClass = (status) => {
    switch (status) {
      case 'available':
        return 'status-available';
      case 'inuse':
        return 'status-inuse';
      case 'maintenance':
        return 'status-maintenance';
      default:
        return '';
    }
  };

  // Format registration time
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('no');
  };

  // Handle save
  const handleSave = () => {
    if (unsavedChanges) {
      onSave(car._id, driver, note);
      setUnsavedChanges(false);
    }
  };

  // Handle driver input change
  const handleDriverChange = (e) => {
    setDriver(e.target.value);
    setUnsavedChanges(true);
  };

  // Handle note input change
  const handleNoteChange = (e) => {
    setNote(e.target.value);
    setUnsavedChanges(true);
  };

  return (
    <tr className={car.status === 'available' ? 'available-highlight' : ''}>
      <td>{car.carNumber}</td>
      <td>{car.registrationNumber}</td>
      <td>{car.phoneNumber}</td>
      <td>
        {editable ? (
          <input
            type="text"
            className="driver-input"
            value={driver}
            onChange={handleDriverChange}
          />
        ) : (
          driver || <span className="empty-state">-</span>
        )}
      </td>
      <td>
        {editable ? (
          <input
            type="text"
            className="note-input"
            value={note}
            onChange={handleNoteChange}
          />
        ) : (
          note || ''
        )}
      </td>
      <td>{formatTime(car.registrationTime)}</td>
      <td>
        <span className={`status-badge ${getStatusClass(car.status)}`}>
          {getStatusText(car.status)}
        </span>
      </td>
      {editable && (
        <td>
          <button
            className={`save-btn ${savingStatus === 'success' ? 'save-success' : ''}`}
            onClick={handleSave}
            disabled={savingStatus === 'saving' || !unsavedChanges}
          >
            {savingStatus === 'saving' ? 'Lagrer...' :
             savingStatus === 'success' ? 'Lagret!' :
             savingStatus === 'error' ? 'Feil!' :
             'Lagre'}
          </button>
        </td>
      )}
    </tr>
  );
};

export default CarRow;