// src/components/ViewCarRow.js
import React, { useState, useEffect } from 'react';

const ViewCarRow = ({ car }) => {
  const [timeElapsed, setTimeElapsed] = useState('');
  const [timeClass, setTimeClass] = useState('time-recent');

  // Get formatted status text
  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Ledig';
      case 'inuse':
        return 'I bruk';
      case 'maintenance':
        return 'Vedlikehold';
      default:
        return status;
    }
  };

  // Get status class
  const getStatusClass = (status) => {
    switch (status) {
      case 'available':
        return 'status-available';
      case 'inuse':
        return 'status-inuse';
      case 'maintenance':
        return 'status-maintenance';
      default:
        return '';
    }
  };

  // Format registration time
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('no');
  };

  // Calculate and update time elapsed since registration
  useEffect(() => {
    const updateTimeElapsed = () => {
      if (!car.registrationTime) return;

      const now = new Date();
      const regTime = new Date(car.registrationTime);
      const diffMs = now - regTime;
      
      // Convert to hours and minutes
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      // Format time elapsed
      const formattedTime = `${formatTime(car.registrationTime)} (${hours}t ${minutes}m)`;
      setTimeElapsed(formattedTime);
      
      // Set class based on elapsed time
      if (hours < 5) {
        setTimeClass('time-recent');
      } else if (hours < 6) {
        setTimeClass('time-approaching');
      } else if (hours < 7) {
        setTimeClass('time-likely');
      } else {
        setTimeClass('time-overdue');
      }
    };

    updateTimeElapsed();
    
    // Update every minute
    const interval = setInterval(updateTimeElapsed, 60000);
    
    return () => clearInterval(interval);
  }, [car.registrationTime]);

  return (
    <tr className={car.status === 'available' ? 'available-highlight' : ''}>
      <td>{car.carNumber}</td>
      <td>{car.registrationNumber}</td>
      <td>{car.phoneNumber}</td>
      <td>{car.driver || <span className="empty-state">-</span>}</td>
      <td>
        {car.registrationTime ? (
          <span className={`time-badge ${timeClass}`}>
            {timeElapsed}
          </span>
        ) : (
          <span className="empty-state">-</span>
        )}
      </td>
      <td>{car.note || ''}</td>
      <td>
        <span className={`status-badge ${getStatusClass(car.status)}`}>
          {getStatusText(car.status)}
        </span>
      </td>
    </tr>
  );
};

export default ViewCarRow;