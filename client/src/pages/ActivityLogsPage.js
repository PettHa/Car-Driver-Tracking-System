// src/pages/ActivityLogsPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

const API_URL = 'http://localhost:5000/api';

const ActivityLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    carId: '',
    startDate: '',
    endDate: '',
    action: '',
    limit: 100
  });
  const [cars, setCars] = useState([]);

  // Fetch cars on component mount
  useEffect(() => {
    const fetchCars = async () => {
      try {
        const response = await axios.get(`${API_URL}/cars`);
        setCars(response.data);
      } catch (err) {
        console.error('Error fetching cars:', err);
        setError('Feil ved henting av biler. Vennligst prøv igjen senere.');
      }
    };
    
    fetchCars();
  }, []);

  // Fetch logs based on filter
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        
        // Build query params
        const params = new URLSearchParams();
        if (filter.carId) params.append('carId', filter.carId);
        if (filter.startDate) params.append('startDate', filter.startDate);
        if (filter.endDate) params.append('endDate', filter.endDate);
        if (filter.action) params.append('action', filter.action);
        if (filter.limit) params.append('limit', filter.limit);
        
        const response = await axios.get(`${API_URL}/activity-logs?${params}`);
        setLogs(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError('Feil ved henting av aktivitetslogg. Vennligst prøv igjen senere.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLogs();
  }, [filter]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({ ...prev, [name]: value }));
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return format(new Date(timestamp), 'dd.MM.yyyy HH:mm:ss', { locale: nb });
  };

  // Get action text
  const getActionText = (action) => {
    switch (action) {
      case 'driver_assigned':
        return 'Sjåfør tildelt';
      case 'driver_removed':
        return 'Sjåfør fjernet';
      case 'maintenance_set':
        return 'Satt til vedlikehold';
      case 'maintenance_cleared':
        return 'Fjernet fra vedlikehold';
      case 'car_added':
        return 'Bil lagt til';
      case 'car_updated':
        return 'Bil oppdatert';
      case 'car_deleted':
        return 'Bil slettet';
      default:
        return action;
    }
  };

  // Find car details by id
  const getCarDetails = (carId) => {
    const car = cars.find(c => c._id === carId);
    if (!car) return { carNumber: 'Ukjent', registrationNumber: 'Ukjent' };
    return { carNumber: car.carNumber, registrationNumber: car.registrationNumber };
  };

  return (
    <div className="page-transition">
      <h2>Aktivitetslogg</h2>
      
      <div className="filter-container" style={{ marginBottom: '20px' }}>
        <div className="quick-actions" style={{ marginBottom: '15px' }}>
          <button 
            className="btn btn-info" 
            onClick={() => {
              // Build query params for export
              const params = new URLSearchParams();
              if (filter.carId) params.append('carId', filter.carId);
              if (filter.startDate) params.append('startDate', filter.startDate);
              if (filter.endDate) params.append('endDate', filter.endDate);
              if (filter.action) params.append('action', filter.action);
              
              // Open export URL in new window/tab
              window.open(`${API_URL}/activity-logs/export?${params}`, '_blank');
            }}
          >
            Eksporter til CSV
          </button>
        </div>
      
        <div className="filter-row" style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
          <div className="filter-item" style={{ flex: 1 }}>
            <label htmlFor="carId">Bil:</label>
            <select
              id="carId"
              name="carId"
              value={filter.carId}
              onChange={handleFilterChange}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">Alle biler</option>
              {cars.map(car => (
                <option key={car._id} value={car._id}>
                  {car.carNumber} - {car.registrationNumber}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-item" style={{ flex: 1 }}>
            <label htmlFor="action">Handling:</label>
            <select
              id="action"
              name="action"
              value={filter.action}
              onChange={handleFilterChange}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">Alle handlinger</option>
              <option value="driver_assigned">Ansatt tildelt</option>
              <option value="driver_removed">Ansatt fjernet</option>
              <option value="maintenance_set">Satt til vedlikehold</option>
              <option value="maintenance_cleared">Fjernet fra vedlikehold</option>
              <option value="car_added">Bil lagt til</option>
              <option value="car_updated">Bil oppdatert</option>
              <option value="car_deleted">Bil slettet</option>
            </select>
          </div>
        </div>
        
        <div className="filter-row" style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
          <div className="filter-item" style={{ flex: 1 }}>
            <label htmlFor="startDate">Fra dato:</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filter.startDate}
              onChange={handleFilterChange}
              className="form-control"
              style={{ width: '100%' }}
            />
          </div>
          
          <div className="filter-item" style={{ flex: 1 }}>
            <label htmlFor="endDate">Til dato:</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filter.endDate}
              onChange={handleFilterChange}
              className="form-control"
              style={{ width: '100%' }}
            />
          </div>
          
          <div className="filter-item" style={{ flex: 1 }}>
            <label htmlFor="limit">Maks antall:</label>
            <select
              id="limit"
              name="limit"
              value={filter.limit}
              onChange={handleFilterChange}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="50">50 oppføringer</option>
              <option value="100">100 oppføringer</option>
              <option value="200">200 oppføringer</option>
              <option value="500">500 oppføringer</option>
            </select>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="loading">Laster aktivitetslogg...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Tidspunkt</th>
              <th>Handling</th>
              <th>Bil Nr</th>
              <th>Registreringsnr</th>
              <th>Tidligere Ansatt</th>
              <th>Ny Ansatt</th>
              <th>Notat</th>
              <th>Bruker</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map(log => (
                <tr key={log._id}>
                  <td>{formatTimestamp(log.timestamp)}</td>
                  <td>{getActionText(log.action)}</td>
                  <td>{log.carNumber}</td>
                  <td>{log.registrationNumber}</td>
                  <td>{log.previousDriver || <span className="empty-state">-</span>}</td>
                  <td>{log.newDriver || <span className="empty-state">-</span>}</td>
                  <td>{log.note || ''}</td>
                  <td>{log.userId}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty-state" style={{ textAlign: 'center' }}>
                  Ingen loggoppføringer funnet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ActivityLogsPage;