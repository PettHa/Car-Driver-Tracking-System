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

// ---- FJERN DENNE LINJEN ----
// const API_URL = 'http://localhost:5000/api';
// ---------------------------

// Funksjon for å sjekke om vi er i kiosk-modus
const checkIsKioskMode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tv') === 'true';
};

const App = () => {
  // State
  const [cars, setCars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Popup states
  const [maintenancePopupOpen, setMaintenancePopupOpen] = useState(false);
  const [endAllTripsPopupOpen, setEndAllTripsPopupOpen] = useState(false);
  const [shortcutsPopupOpen, setShortcutsPopupOpen] = useState(false);

  // TV mode state - initialiseres med URL-parameteren
  const [tvMode, setTvMode] = useState(checkIsKioskMode());

  // Sjekk URL-parameteren for TV-modus
  useEffect(() => {
    const urlTvMode = checkIsKioskMode();
    if (urlTvMode) {
      setTvMode(true);
    }
  }, []);

  // Oppdater body-klassen når tvMode endres
  useEffect(() => {
    if (tvMode) {
      document.body.classList.add('tv-mode');
    } else {
      document.body.classList.remove('tv-mode');
    }
    return () => {
      document.body.classList.remove('tv-mode');
    };
  }, [tvMode]);

  // Fetch cars from API
  const fetchCars = async () => {
    try {
      setIsLoading(true);
      // ---- ENDRE DENNE LINJEN ----
      // const response = await axios.get(`${API_URL}/cars`);
      const response = await axios.get('/api/cars'); // Bruk relativ sti
      // ---------------------------
      setCars(response.data);
      setError(null);
    } catch (err) {
      setError('Feil ved henting av data. Vennligst prøv igjen senere.');
      console.error('Error fetching cars:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch cars on component mount and handle refresh interval
  useEffect(() => {
    fetchCars(); // Fetch initial data

    let refreshIntervalId = null;
    if (tvMode) {
      refreshIntervalId = setInterval(fetchCars, 60000); // Refresh every minute
    }

    // Cleanup interval on component unmount or when tvMode changes
    return () => {
      if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
      }
    };
  }, [tvMode]); // Re-run effect if tvMode changes

  // Save driver function
  const saveDriver = async (carId, driver, note) => {
    try {
      // ---- ENDRE DENNE LINJEN ----
      // const response = await axios.patch(`${API_URL}/cars/${carId}/driver`, { driver, note });
      const response = await axios.patch(`/api/cars/${carId}/driver`, { driver, note }); // Bruk relativ sti
      // ---------------------------

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
      // ---- ENDRE DENNE LINJEN ----
      // const response = await axios.patch(`${API_URL}/cars/${carId}/maintenance`, { note });
      const response = await axios.patch(`/api/cars/${carId}/maintenance`, { note }); // Bruk relativ sti
      // ---------------------------

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
      // ---- ENDRE DENNE LINJEN ----
      // await axios.patch(`${API_URL}/cars/end-all-trips`);
      await axios.patch('/api/cars/end-all-trips'); // Bruk relativ sti
      // ---------------------------

      await fetchCars(); // Refetch all cars to get updated data (fetchCars uses relative path now)
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
      let response;
      if (carId) {
        // Update existing car
        // ---- ENDRE DENNE LINJEN ----
        // response = await axios.put(`${API_URL}/cars/${carId}`, carData);
        response = await axios.put(`/api/cars/${carId}`, carData); // Bruk relativ sti
        // ---------------------------
        setCars(prevCars =>
          prevCars.map(car =>
            car._id === carId ? response.data : car
          )
        );
      } else {
        // Create new car
        // ---- ENDRE DENNE LINJEN ----
        // response = await axios.post(`${API_URL}/cars`, carData);
        response = await axios.post('/api/cars', carData); // Bruk relativ sti
        // ---------------------------
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

  // Keyboard shortcuts (ingen endringer her)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        return;
      }
      switch (event.key.toLowerCase()) {
        case 'e': window.location.href = '/'; break;
        case 'v': window.location.href = '/view'; break;
        case 'a': window.location.href = '/admin'; break;
        case 'l': window.location.href = '/logs'; break;
        case 't': toggleTvMode(); break;
        case 'k':
          if (event.ctrlKey) {
            window.location.href = tvMode ? '/view' : '/view?tv=true';
          }
          break;
        case 's':
          const searchInput = document.querySelector('.search-input');
          if (searchInput) searchInput.focus();
          break;
        case 'escape':
          setMaintenancePopupOpen(false);
          setEndAllTripsPopupOpen(false);
          setShortcutsPopupOpen(false);
          if (tvMode && !checkIsKioskMode()) {
            toggleTvMode();
          }
          break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tvMode, toggleTvMode]); // Added toggleTvMode to dependencies

  const shouldShowNavigation = !checkIsKioskMode();

  return (
    <Router>
      <div className={`app ${tvMode ? 'tv-mode' : ''}`}>
        <div className="container">

          {shouldShowNavigation && (
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
          )}

          {isLoading ? (
            <div className={tvMode ? "kiosk-loading" : "loading"}>
              Laster data...
            </div>
          ) : error ? (
            <div className={tvMode ? "kiosk-error" : "error"}>
              {error}
            </div>
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
                <ActivityLogsPage /> /* Sender ikke props her, den henter data selv */
              } />
            </Routes>
          )}
        </div>

        {/* Popups */}
        {!checkIsKioskMode() && (
          <>
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
            <KeyboardShortcuts onClick={() => setShortcutsPopupOpen(true)} />
          </>
        )}
      </div>
    </Router>
  );
};

export default App;