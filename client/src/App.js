// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import axios from 'axios';

// Import pages
import EditPage from './pages/EditPage';
import ViewPage from './pages/ViewPage';
import AdminPage from './pages/AdminPage';
import ActivityLogsPage from './pages/ActivityLogsPage';

// Import components
import MaintenancePopup from './components/popups/MaintenancePopup';
import EndAllTripsPopup from './components/popups/EndAllTripsPopup';
import ShortcutsPopup from './components/popups/ShortcutsPopup';
import KeyboardShortcuts from './components/KeyboardShortcuts';

// Import styles
import './styles/App.css';

// API base URL - Change this to your server URL
const API_URL = 'http://localhost:5000/api';

const App = () => {
  // State
  const [cars, setCars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Popup states
  const [maintenancePopupOpen, setMaintenancePopupOpen] = useState(false);
  const [endAllTripsPopupOpen, setEndAllTripsPopupOpen] = useState(false);
  const [shortcutsPopupOpen, setShortcutsPopupOpen] = useState(false);
  
  // TV mode state
  const [tvMode, setTvMode] = useState(false);
  
  // Fetch cars from API
  const fetchCars = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/cars`);
      setCars(response.data);
      setError(null);
    } catch (err) {
      setError('Feil ved henting av data. Vennligst prøv igjen senere.');
      console.error('Error fetching cars:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch cars on component mount
  useEffect(() => {
    fetchCars();
  }, []);
  
  // Save driver function
  const saveDriver = async (carId, driver, note) => {
    try {
      const response = await axios.patch(`${API_URL}/cars/${carId}/driver`, { driver, note });
      
      // Update cars state with updated car
      setCars(prevCars => 
        prevCars.map(car => 
          car._id === carId ? response.data : car
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error saving driver:', err);
      return false;
    }
  };
  
  // Set car to maintenance
  const setMaintenanceCar = async (carId, note) => {
    try {
      const response = await axios.patch(`${API_URL}/cars/${carId}/maintenance`, { note });
      
      // Update cars state with updated car
      setCars(prevCars => 
        prevCars.map(car => 
          car._id === carId ? response.data : car
        )
      );
      
      setMaintenancePopupOpen(false);
      return true;
    } catch (err) {
      console.error('Error setting maintenance:', err);
      return false;
    }
  };
  
  // End all trips
  const endAllTrips = async () => {
    try {
      await axios.patch(`${API_URL}/cars/end-all-trips`);
      
      // Refetch all cars to get updated data
      fetchCars();
      
      setEndAllTripsPopupOpen(false);
      return true;
    } catch (err) {
      console.error('Error ending all trips:', err);
      return false;
    }
  };
  
  // Save car details in admin
  const saveCar = async (carId, carData) => {
    try {
      if (carId) {
        // Update existing car
        const response = await axios.put(`${API_URL}/cars/${carId}`, carData);
        
        // Update cars state with updated car
        setCars(prevCars => 
          prevCars.map(car => 
            car._id === carId ? response.data : car
          )
        );
      } else {
        // Create new car
        const response = await axios.post(`${API_URL}/cars`, carData);
        
        // Add new car to cars state
        setCars(prevCars => [...prevCars, response.data]);
      }
      
      return true;
    } catch (err) {
      console.error('Error saving car:', err);
      return false;
    }
  };
  
  // Toggle TV mode
  const toggleTvMode = () => {
    setTvMode(prev => !prev);
  };
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        return;
      }
      
      switch (event.key.toLowerCase()) {
        case 'e':
          // Navigate to Edit page
          window.location.hash = '#/';
          break;
        case 'v':
          // Navigate to View page
          window.location.hash = '#/view';
          break;
        case 'a':
          // Navigate to Admin page
          window.location.hash = '#/admin';
          break;
        case 'l':
          // Navigate to Logs page
          window.location.hash = '#/logs';
          break;
        case 't':
          // Toggle TV mode
          toggleTvMode();
          break;
        case 's':
          // Focus search input
          const searchInput = document.querySelector('.search-input');
          if (searchInput) searchInput.focus();
          break;
        case 'escape':
          // Close all popups
          setMaintenancePopupOpen(false);
          setEndAllTripsPopupOpen(false);
          setShortcutsPopupOpen(false);
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  return (
    <Router>
      <div className={`app ${tvMode ? 'tv-mode' : ''}`}>
        <div className="container">
          <h1>Bilsjåfør Registrering</h1>
          
          <nav className="nav">
            <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>
              Registrer/Endre
            </NavLink>
            <NavLink to="/view" className={({ isActive }) => isActive ? "active" : ""}>
              Vis Oversikt
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => isActive ? "active" : ""}>
              Admin
            </NavLink>
            <NavLink to="/logs" className={({ isActive }) => isActive ? "active" : ""}>
              Aktivitetslogg
            </NavLink>
          </nav>
          
          {isLoading ? (
            <div className="loading">Laster data...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <Routes>
              <Route path="/" element={
                <EditPage 
                  cars={cars} 
                  saveDriver={saveDriver} 
                  openMaintenancePopup={() => setMaintenancePopupOpen(true)} 
                />
              } />
              <Route path="/view" element={
                <ViewPage 
                  cars={cars} 
                  openEndAllTripsPopup={() => setEndAllTripsPopupOpen(true)} 
                  tvMode={tvMode}
                  toggleTvMode={toggleTvMode}
                />
              } />
              <Route path="/admin" element={
                <AdminPage 
                  cars={cars} 
                  saveCar={saveCar} 
                />
              } />
              <Route path="/logs" element={
                <ActivityLogsPage />
              } />
            </Routes>
          )}
        </div>
        
        {/* Popups */}
        <MaintenancePopup 
          isOpen={maintenancePopupOpen} 
          onClose={() => setMaintenancePopupOpen(false)} 
          cars={cars}
          onConfirm={setMaintenanceCar}
        />
        
        <EndAllTripsPopup 
          isOpen={endAllTripsPopupOpen} 
          onClose={() => setEndAllTripsPopupOpen(false)} 
          onConfirm={endAllTrips}
        />
        
        <ShortcutsPopup 
          isOpen={shortcutsPopupOpen} 
          onClose={() => setShortcutsPopupOpen(false)} 
        />
        
        {/* Keyboard shortcuts indicator */}
        <KeyboardShortcuts onClick={() => setShortcutsPopupOpen(true)} />
      </div>
    </Router>
  );
};

export default App;