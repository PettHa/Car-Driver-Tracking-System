// src/pages/EditPage.js
import React, { useState } from 'react';
import CarRow from '../components/CarRow';

const EditPage = ({ cars, saveDriver, openMaintenancePopup }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [savingStatus, setSavingStatus] = useState({});

  // Filter cars based on search term
  const filteredCars = cars.filter(car => {
    const searchLower = searchTerm.toLowerCase();
    return (
      car.carNumber.toString().includes(searchLower) ||
      car.registrationNumber.toLowerCase().includes(searchLower) ||
      car.phoneNumber.includes(searchLower) ||
      (car.driver && car.driver.toLowerCase().includes(searchLower))
    );
  });

  // Handle saving driver info
  const handleSaveDriver = async (carId, driver, note) => {
    setSavingStatus(prev => ({ ...prev, [carId]: 'saving' }));
    
    try {
      const success = await saveDriver(carId, driver, note);
      
      if (success) {
        setSavingStatus(prev => ({ ...prev, [carId]: 'success' }));
        
        // Reset after 2 seconds
        setTimeout(() => {
          setSavingStatus(prev => ({ ...prev, [carId]: null }));
        }, 2000);
      } else {
        setSavingStatus(prev => ({ ...prev, [carId]: 'error' }));
        
        // Reset after 3 seconds
        setTimeout(() => {
          setSavingStatus(prev => ({ ...prev, [carId]: null }));
        }, 3000);
      }
    } catch (error) {
      setSavingStatus(prev => ({ ...prev, [carId]: 'error' }));
      
      // Reset after 3 seconds
      setTimeout(() => {
        setSavingStatus(prev => ({ ...prev, [carId]: null }));
      }, 3000);
    }
  };

  return (
    <div className="page-transition">
      <h2>Registrer/Endre Ansatt for Bil</h2>
      
      <div className="search-container">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Søk etter bil eller ansatt..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="quick-actions">
        <button 
          className="btn btn-warning" 
          onClick={openMaintenancePopup}
        >
          Sett til Vedlikehold
        </button>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Bil Nr</th>
            <th>Registreringsnr</th>
            <th>Telefon</th>
            <th>Ansatt</th>
            <th>Merknad</th>
            <th>Reg. tidspunkt</th>
            <th>Status</th>
            <th>Handling</th>
          </tr>
        </thead>
        <tbody>
          {filteredCars.length > 0 ? (
            filteredCars.map(car => (
              <CarRow 
                key={car._id} 
                car={car} 
                onSave={handleSaveDriver}
                savingStatus={savingStatus[car._id]}
                editable={true}
              />
            ))
          ) : (
            <tr>
              <td colSpan="8" className="empty-state" style={{ textAlign: 'center' }}>
                Ingen biler funnet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EditPage;