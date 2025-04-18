// src/components/RefreshIndicator.js
import React from 'react';

const RefreshIndicator = ({ countdown, visible }) => {
  if (!visible) return null;
  
  return (
    <div className="refresh-indicator" id="refresh-indicator">
      Oppdateres automatisk hvert minutt - Neste oppdatering om <span id="refresh-countdown">{countdown}</span>s
    </div>
  );
};

export default RefreshIndicator;