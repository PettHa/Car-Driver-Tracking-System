// src/pages/ViewPage.js - Med støtte for tv-parameter i URL
import React, { useState, useEffect } from 'react';
import ViewCarRow from '../components/ViewCarRow';
import RefreshIndicator from '../components/RefreshIndicator';

const ViewPage = ({ cars, openEndAllTripsPopup, tvMode: propsTvMode, toggleTvMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [countdownTime, setCountdownTime] = useState(60);
  const [inUseCars, setInUseCars] = useState([]);
  
  // Sjekk om tv=true i URL-parameteren
  const [isTvMode, setIsTvMode] = useState(false);
  
  // Sjekk URL-parameter og prop for TV-modus
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTvMode = urlParams.get('tv') === 'true';
    
    // Sett TV-modus hvis enten prop eller URL-parameter indikerer det
    if (urlTvMode || propsTvMode) {
      setIsTvMode(true);
    } else {
      setIsTvMode(false);
    }
  }, [propsTvMode]);

  // Filter cars based on search term
  const filteredCars = cars.filter(car => {
    // Hvis TV-modus, vis alle biler
    if (isTvMode) return true;
    
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
    if (!isTvMode) return;

    const interval = setInterval(() => {
      setCountdownTime(prev => {
        if (prev <= 1) {
          // Triggeret ville normalt hente nye data
          // Men siden fetchCars() ikke er tilgjengelig her, 
          // lar vi komponenten gjenbruke for hver oppdatering
          window.location.reload();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTvMode]);

  // Update inUseCars whenever cars changes
  useEffect(() => {
    setInUseCars(cars.filter(car => car.status === 'inuse'));
  }, [cars]);

  // TV modus rendring - enkel versjon uten kontroller
  if (isTvMode) {
    return (
      <div className="page-transition tv-view">
        <div className="last-updated">
          Sist oppdatert: {new Date().toLocaleTimeString('no')}
        </div>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Bil Nr</th>
                <th>Registreringsnr</th>
                <th>Telefon</th>
                <th>Ansatt</th>
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
        </div>
        
        <RefreshIndicator countdown={countdownTime} visible={true} />
      </div>
    );
  }

  // Normal view with controls
  return (
    <div className="page-transition">
      
      <table>
        <thead>
          <tr>
            <th>Bil Nr</th>
            <th>Registreringsnr</th>
            <th>Telefon</th>
            <th>Ansatt</th>
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
      
      <RefreshIndicator countdown={countdownTime} visible={propsTvMode} />
    </div>
  );
};

export default ViewPage;