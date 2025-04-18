// src/pages/ViewPage.js
import React, { useState, useEffect } from 'react';
import ViewCarRow from '../components/ViewCarRow';
import RefreshIndicator from '../components/RefreshIndicator';

const ViewPage = ({ cars, openEndAllTripsPopup, tvMode, toggleTvMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [countdownTime, setCountdownTime] = useState(60);
  const [inUseCars, setInUseCars] = useState([]);

  // Filter cars based on search term
  const filteredCars = cars.filter(car => {
    const searchLower = searchTerm.toLowerCase();
    return (
      car.carNumber.toString().includes(searchLower) ||
      car.registrationNumber.toLowerCase().includes(searchLower) ||
      car.phoneNumber.includes(searchLower) ||
      (car.driver && car.driver.toLowerCase().includes(searchLower)) ||
      (car.note && car.note.toLowerCase().includes(searchLower))
    );
  });

  // Sort cars: available first, then in use, then maintenance
  const sortedCars = [...filteredCars].sort((a, b) => {
    const statusOrder = { 'available': 1, 'inuse': 2, 'maintenance': 3 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // Export data as CSV
  const exportData = () => {
    const headers = [
      'Bil Nr',
      'Registreringsnr',
      'Telefon',
      'Sjåfør',
      'Registrert',
      'Merknad',
      'Status'
    ];

    const csvData = cars.map(car => [
      car.carNumber,
      car.registrationNumber,
      car.phoneNumber,
      car.driver || '-',
      car.registrationTime ? new Date(car.registrationTime).toLocaleString('no') : '-',
      car.note || '',
      car.status === 'available' ? 'Ledig' : car.status === 'inuse' ? 'I bruk' : 'Vedlikehold'
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bilregistrering_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto refresh countdown
  useEffect(() => {
    if (!tvMode) return;

    const interval = setInterval(() => {
      setCountdownTime(prev => {
        if (prev <= 1) {
          // This would be the place to fetch fresh data
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [tvMode]);

  // Update inUseCars whenever cars changes
  useEffect(() => {
    setInUseCars(cars.filter(car => car.status === 'inuse'));
  }, [cars]);

  return (
    <div className="page-transition">
      <h2>Oversikt over Bilbruk</h2>
      
      <div className="search-container">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Søk etter bil, sjåfør eller merknad..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="quick-actions">
        <button 
          className="btn btn-danger" 
          onClick={openEndAllTripsPopup}
          disabled={inUseCars.length === 0}
        >
          Avslutt Alle Turer ({inUseCars.length})
        </button>
        <button 
          className="btn btn-info" 
          onClick={exportData}
        >
          Eksporter Data
        </button>
        <button 
          className="btn btn-primary" 
          onClick={toggleTvMode}
        >
          {tvMode ? 'Avslutt TV-modus' : 'TV-modus'}
        </button>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Bil Nr</th>
            <th>Registreringsnr</th>
            <th>Telefon</th>
            <th>Sjåfør</th>
            <th>Registrert</th>
            <th>Merknad</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedCars.length > 0 ? (
            sortedCars.map(car => (
              <ViewCarRow key={car._id} car={car} />
            ))
          ) : (
            <tr>
              <td colSpan="7" className="empty-state" style={{ textAlign: 'center' }}>
                Ingen biler funnet
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      <RefreshIndicator countdown={countdownTime} visible={tvMode} />
    </div>
  );
};

export default ViewPage;