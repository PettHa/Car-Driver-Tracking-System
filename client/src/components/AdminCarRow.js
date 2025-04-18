// src/components/AdminCarRow.js
import React, { useState, useEffect } from 'react';

const AdminCarRow = ({ car, onSave, savingStatus }) => {
  const [carNumber, setCarNumber] = useState(car.carNumber || '');
  const [registrationNumber, setRegistrationNumber] = useState(car.registrationNumber || '');
  const [phoneNumber, setPhoneNumber] = useState(car.phoneNumber || '');
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Update local state when car prop changes
  useEffect(() => {
    setCarNumber(car.carNumber || '');
    setRegistrationNumber(car.registrationNumber || '');
    setPhoneNumber(car.phoneNumber || '');
    setUnsavedChanges(false);
  }, [car]);

  // Handle save
  const handleSave = () => {
    if (unsavedChanges) {
      onSave(car._id, {
        carNumber: parseInt(carNumber),
        registrationNumber,
        phoneNumber
      });
      setUnsavedChanges(false);
    }
  };

  // Handle input changes
  const handleCarNumberChange = (e) => {
    setCarNumber(e.target.value);
    setUnsavedChanges(true);
  };

  const handleRegNumberChange = (e) => {
    setRegistrationNumber(e.target.value);
    setUnsavedChanges(true);
  };

  const handlePhoneNumberChange = (e) => {
    setPhoneNumber(e.target.value);
    setUnsavedChanges(true);
  };

  return (
    <tr>
      <td>
        <input
          type="number"
          className="car-number-input"
          value={carNumber}
          onChange={handleCarNumberChange}
        />
      </td>
      <td>
        <input
          type="text"
          className="reg-number-input"
          value={registrationNumber}
          onChange={handleRegNumberChange}
        />
      </td>
      <td>
        <input
          type="text"
          className="phone-number-input"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
        />
      </td>
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
    </tr>
  );
};

export default AdminCarRow;