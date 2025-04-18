// src/components/KeyboardShortcuts.js
import React from 'react';

const KeyboardShortcuts = ({ onClick }) => {
  return (
    <div className="keyboard-shortcuts" onClick={onClick}>
      <span className="keyboard-icon">⌨️</span>
      <span>Tastatursnarveier</span>
    </div>
  );
};

export default KeyboardShortcuts;