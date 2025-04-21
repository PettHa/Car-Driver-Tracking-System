// src/App.js
import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  useLocation, // Importer useLocation
  useNavigate, // Importer useNavigate
  Navigate   // Importer Navigate for omdirigering i Routes
} from 'react-router-dom';
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

// Funksjon for å sjekke om vi er i kiosk-modus
const checkIsKioskMode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('tv') === 'true';
};

// --- Wrapper komponent for å bruke hooks i App ---
const AppWrapper = () => {
  return (
    <Router>
      <App />
    </Router>
  );
}

const App = () => {
  // --- Hooks for routing ---
  const location = useLocation(); // Få nåværende rute
  const navigate = useNavigate(); // Få funksjon for programmatisk navigering

  // State
  const [cars, setCars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Ny state for autentisering

  // Popup states
  const [maintenancePopupOpen, setMaintenancePopupOpen] = useState(false);
  const [endAllTripsPopupOpen, setEndAllTripsPopupOpen] = useState(false);
  const [shortcutsPopupOpen, setShortcutsPopupOpen] = useState(false);

  // TV mode state - initialiseres med URL-parameteren
  const [tvMode, setTvMode] = useState(checkIsKioskMode());

  // Sjekk URL-parameteren for TV-modus ved lasting
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

  // --- Autentiseringslogikk ---
  useEffect(() => {
    const currentPath = location.pathname;
    const protectedPaths = ['/view', '/admin', '/logs']; // Definer beskyttede ruter

    // Hvis brukeren er på /admin og IKKE autentisert -> vis passordprompt
    if (currentPath === '/admin' && !isAuthenticated) {
      const password = prompt('Admin-tilgang krever passord:');
      if (password === 'pettererkul') {
        setIsAuthenticated(true); // Sett autentisert til true ved riktig passord
      } else {
        if (password !== null) { // Ikke vis alert hvis brukeren trykket Cancel
          alert('Feil passord!');
        }
        navigate('/', { replace: true }); // Omdiriger til hjemmesiden ved feil passord
      }
    }
    // Hvis brukeren prøver å gå til andre beskyttede sider UTEN å være autentisert -> omdiriger
    else if (protectedPaths.includes(currentPath) && !isAuthenticated && currentPath !== '/admin') {
        // Sjekk om vi allerede ER på / før vi navigerer, for å unngå unødvendig re-render/loop
        if (currentPath !== '/') {
            navigate('/', { replace: true }); // Omdiriger til hjemmesiden
        }
    }

  }, [location, isAuthenticated, navigate]); // Kjør effect når rute eller auth-status endres

  // Fetch cars from API
  const fetchCars = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/cars');
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
      const response = await axios.patch(`/api/cars/${carId}/driver`, { driver, note });
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
      const response = await axios.patch(`/api/cars/${carId}/maintenance`, { note });
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
      await axios.patch('/api/cars/end-all-trips');
      await fetchCars(); // Refetch all cars
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
        response = await axios.put(`/api/cars/${carId}`, carData);
        setCars(prevCars =>
          prevCars.map(car =>
            car._id === carId ? response.data : car
          )
        );
      } else {
        // Create new car
        response = await axios.post('/api/cars', carData);
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
    const nextTvMode = !tvMode;
    setTvMode(nextTvMode);
     // Oppdater URL uten å laste siden på nytt
     const currentUrl = new URL(window.location.href);
     if (nextTvMode) { // Hvis vi skrur PÅ tvMode
       currentUrl.searchParams.set('tv', 'true');
     } else { // Hvis vi skrur AV tvMode
       currentUrl.searchParams.delete('tv');
     }
     // Bruk replaceState for å unngå at brukeren kan trykke "tilbake" mellom tv=true/false
     window.history.replaceState({}, '', currentUrl);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ikke gjør noe hvis vi er i et inputfelt etc.
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        return;
      }

      // Felles snarveier (uavhengig av auth)
      switch (event.key.toLowerCase()) {
        case 't':
          toggleTvMode();
          return; // Avslutt her for T
        case 'escape':
          setMaintenancePopupOpen(false);
          setEndAllTripsPopupOpen(false);
          setShortcutsPopupOpen(false);
          return; // Avslutt her for Escape
        case 's':
           // Fokuser på søkefelt KUN hvis autentisert (siden feltet bare vises da)
           if (isAuthenticated) {
               const searchInput = document.querySelector('.search-input');
               if (searchInput) {
                  event.preventDefault(); // Forhindre standard 's' oppførsel
                  searchInput.focus();
               }
           }
           return; // Avslutt her for S
      }

      // Navigasjon og admin-spesifikke snarveier
      // 'a' skal alltid virke for å kunne trigge login
      if (event.key.toLowerCase() === 'a') {
          navigate('/admin');
          return; // Avslutt her for A
      }

      // Resten av navigasjonen krever auth
      if (isAuthenticated) {
          switch (event.key.toLowerCase()) {
            case 'e': navigate('/'); break;
            case 'v': navigate('/view'); break;
            case 'l': navigate('/logs'); break;
            // Legg til andre auth-spesifikke snarveier her om nødvendig
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  // Dependencies: funksjoner som brukes (navigate, toggleTvMode) og state som påvirker logikk (isAuthenticated, tvMode)
  }, [navigate, isAuthenticated, tvMode, toggleTvMode]); // La toggleTvMode være her siden den brukes i 't'

  const shouldShowNavigation = !checkIsKioskMode(); // Nav skal ikke vises i kiosk-modus

  return (
    <div className={`app ${tvMode ? 'tv-mode' : ''}`}>
      <div className="container">
        {/* Vis navbaren KUN hvis autentisert OG ikke i kiosk-modus */}
        {isAuthenticated && shouldShowNavigation && (
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
            {/* Rute for Registrer/Endre - alltid tilgjengelig */}
            <Route path="/" element={
              <EditPage
                cars={cars}
                saveDriver={saveDriver}
                // Send med auth-status for å kontrollere søk/vedlikeholdsknapp
                isAuthenticated={isAuthenticated} // <--- DENNE VAR LÄGT TILL
                // Åpne popup kun hvis autentisert (og ikke kiosk-modus, håndteres senere)
                openMaintenancePopup={() => isAuthenticated && setMaintenancePopupOpen(true)}
              />
            } />

            {/* Beskyttede ruter - krever autentisering */}
            {isAuthenticated ? (
              <>
                <Route path="/view" element={
                  <ViewPage
                    cars={cars}
                    // Åpne popup kun hvis autentisert (og ikke kiosk-modus, håndteres senere)
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
                {/* Valgfritt: Håndter andre ukjente ruter når man ER logget inn */}
                 <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ) : (
               // Hvis IKKE autentisert:
               <>
                 {/* Rute for /admin slik at useEffect kan fange den og vise prompt */}
                 <Route path="/admin" element={<div>Autentiserer...</div>} />
                 {/* Alle andre ukjente/beskyttede ruter omdirigeres til / via Navigate */}
                 <Route path="*" element={<Navigate to="/" replace />} />
               </>
            )}
          </Routes>
        )}
      </div>

      {/* Popups og KeyboardShortcuts-knapp */}
      {/* Vis disse KUN hvis IKKE i kiosk-modus */}
      {!checkIsKioskMode() && (
        <>
          {/* Disse popupene krever autentisering for å brukes */}
          {isAuthenticated && (
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
            </>
          )}
           {/* Snarvei-popup og knapp kan vises uavhengig av auth */}
           <ShortcutsPopup
              isOpen={shortcutsPopupOpen}
              onClose={() => setShortcutsPopupOpen(false)}
            />
           <KeyboardShortcuts onClick={() => setShortcutsPopupOpen(true)} />
        </>
      )}
    </div>
  );
};

// Eksporter wrapperen som default
export default AppWrapper;