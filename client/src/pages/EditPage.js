// src/pages/EditPage.js
import React, { useState } from 'react';
import CarRow from '../components/CarRow';

// Motta isAuthenticated som prop
const EditPage = ({ cars, saveDriver, openMaintenancePopup, isAuthenticated }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [savingStatus, setSavingStatus] = useState({});

  // Filter cars based on search term (kun relevant hvis søk er aktivt)
  const filteredCars = isAuthenticated // <-- Sjekk auth her også for filtrering
    ? cars.filter(car => {
        const searchLower = searchTerm.toLowerCase();
        return (
          car.carNumber.toString().includes(searchLower) ||
          car.registrationNumber.toLowerCase().includes(searchLower) ||
          car.phoneNumber.includes(searchLower) ||
          (car.driver && car.driver.toLowerCase().includes(searchLower))
        );
      })
    : cars; // <-- Hvis ikke autentisert, vis alle biler (ingen filtrering)

  // Handle saving driver info (denne skal fortsatt fungere uansett auth på denne siden)
  const handleSaveDriver = async (carId, driver, note) => {
    setSavingStatus(prev => ({ ...prev, [carId]: 'saving' }));
    try {
      const success = await saveDriver(carId, driver, note);
      if (success) {
        setSavingStatus(prev => ({ ...prev, [carId]: 'success' }));
        setTimeout(() => {
          setSavingStatus(prev => ({ ...prev, [carId]: null }));
        }, 2000);
      } else {
        setSavingStatus(prev => ({ ...prev, [carId]: 'error' }));
        setTimeout(() => {
          setSavingStatus(prev => ({ ...prev, [carId]: null }));
        }, 3000);
      }
    } catch (error) {
      setSavingStatus(prev => ({ ...prev, [carId]: 'error' }));
      setTimeout(() => {
        setSavingStatus(prev => ({ ...prev, [carId]: null }));
      }, 3000);
    }
  };

  return (
    <div className="page-transition">

      {/* Vis søkefelt KUN hvis autentisert */}
      {isAuthenticated && (
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Søk etter bil eller ansatt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      {/* Vis 'Sett til Vedlikehold'-knapp KUN hvis autentisert */}
      {isAuthenticated && (
        <div className="quick-actions">
          <button
            className="btn btn-warning"
            onClick={openMaintenancePopup} // openMaintenancePopup fra App.js sjekker allerede auth før den åpner
          >
            Sett til Vedlikehold
          </button>
        </div>
      )}

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
                editable={true} // Edit er alltid mulig på denne siden
              />
            ))
          ) : (
            <tr>
              <td colSpan="8" className="empty-state" style={{ textAlign: 'center' }}>
                {isAuthenticated && searchTerm ? 'Ingen biler funnet med søketerm' : 'Ingen biler tilgjengelig'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EditPage;