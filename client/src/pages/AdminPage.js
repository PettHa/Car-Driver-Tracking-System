// src/pages/AdminPage.js
import React, { useState } from 'react';
import AdminCarRow from '../components/AdminCarRow';

const AdminPage = ({ cars, saveCar }) => {
  const [newCar, setNewCar] = useState({
    carNumber: '',
    registrationNumber: '',
    phoneNumber: '',
  });
  const [savingStatus, setSavingStatus] = useState({});

  // Sort cars by car number
  const sortedCars = [...cars].sort((a, b) => a.carNumber - b.carNumber);

  // Handle saving car info
  const handleSaveCar = async (carId, carData) => {
    setSavingStatus(prev => ({ ...prev, [carId || 'new']: 'saving' }));
    
    try {
      const success = await saveCar(carId, carData);
      
      if (success) {
        setSavingStatus(prev => ({ ...prev, [carId || 'new']: 'success' }));
        
        // If it's a new car, reset the form
        if (!carId) {
          setNewCar({
            carNumber: '',
            registrationNumber: '',
            phoneNumber: '',
          });
        }
        
        // Reset status after 2 seconds
        setTimeout(() => {
          setSavingStatus(prev => ({ ...prev, [carId || 'new']: null }));
        }, 2000);
      } else {
        setSavingStatus(prev => ({ ...prev, [carId || 'new']: 'error' }));
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setSavingStatus(prev => ({ ...prev, [carId || 'new']: null }));
        }, 3000);
      }
    } catch (error) {
      setSavingStatus(prev => ({ ...prev, [carId || 'new']: 'error' }));
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setSavingStatus(prev => ({ ...prev, [carId || 'new']: null }));
      }, 3000);
    }
  };

  // Handle change in new car form
  const handleNewCarChange = (e) => {
    const { name, value } = e.target;
    setNewCar(prev => ({ ...prev, [name]: value }));
  };

  // Handle submit of new car form
  const handleAddCar = () => {
    if (!newCar.carNumber || !newCar.registrationNumber || !newCar.phoneNumber) {
      alert('Vennligst fyll ut alle feltene');
      return;
    }
    
    // Check if car number already exists
    if (cars.some(car => car.carNumber === parseInt(newCar.carNumber))) {
      alert('Bilnummer finnes allerede');
      return;
    }
    
    // Check if registration number already exists
    if (cars.some(car => car.registrationNumber === newCar.registrationNumber)) {
      alert('Registreringsnummer finnes allerede');
      return;
    }
    
    handleSaveCar(null, {
      ...newCar,
      carNumber: parseInt(newCar.carNumber),
      driver: '',
      note: '',
      status: 'available'
    });
  };

  return (
    <div className="page-transition">
      <h2>Admin - Rediger Bilnummer og Registreringsnummer</h2>
      
      <table>
        <thead>
          <tr>
            <th>Bil Nr</th>
            <th>Registreringsnr</th>
            <th>Telefon</th>
            <th>Handling</th>
          </tr>
        </thead>
        <tbody>
          {sortedCars.map(car => (
            <AdminCarRow
              key={car._id}
              car={car}
              onSave={handleSaveCar}
              savingStatus={savingStatus[car._id]}
            />
          ))}
          <tr>
            <td>
              <input
                type="number"
                className="car-number-input"
                placeholder="Nytt bilnr"
                name="carNumber"
                value={newCar.carNumber}
                onChange={handleNewCarChange}
              />
            </td>
            <td>
              <input
                type="text"
                className="reg-number-input"
                placeholder="Nytt regnr"
                name="registrationNumber"
                value={newCar.registrationNumber}
                onChange={handleNewCarChange}
              />
            </td>
            <td>
              <input
                type="text"
                className="phone-number-input"
                placeholder="Nytt tlf nr"
                name="phoneNumber"
                value={newCar.phoneNumber}
                onChange={handleNewCarChange}
              />
            </td>
            <td>
              <button
                className={`add-btn ${savingStatus.new === 'success' ? 'save-success' : ''}`}
                onClick={handleAddCar}
                disabled={savingStatus.new === 'saving'}
              >
                {savingStatus.new === 'saving' ? 'Lagrer...' :
                 savingStatus.new === 'success' ? 'Lagt til!' :
                 savingStatus.new === 'error' ? 'Feil!' :
                 'Legg til'}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default AdminPage;