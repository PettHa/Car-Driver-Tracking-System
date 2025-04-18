// src/components/popups/ShortcutsPopup.js
import React from 'react';

const ShortcutsPopup = ({ isOpen, onClose }) => {
  return (
    <div className={`popup-overlay ${isOpen ? 'open' : ''}`}>
      <div className="popup-content">
        <h3 className="popup-title">Tastatursnarveier</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <tbody>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                <kbd style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border)' }}>E</kbd>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Gå til Registrer/Endre</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                <kbd style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border)' }}>V</kbd>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Gå til Vis Oversikt</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                <kbd style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border)' }}>A</kbd>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Gå til Admin</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                <kbd style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border)' }}>T</kbd>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Slå på/av TV-modus</td>
            </tr>
            <tr>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                <kbd style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border)' }}>S</kbd>
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Fokuser søkefeltet</td>
            </tr>
            <tr>
              <td style={{ padding: '8px' }}>
                <kbd style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--border)' }}>Esc</kbd>
              </td>
              <td style={{ padding: '8px' }}>Lukk popup</td>
            </tr>
          </tbody>
        </table>
        <div className="popup-buttons">
          <button 
            id="shortcuts-close" 
            className="btn btn-primary"
            style={{ 
              padding: '8px 16px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              border: 'none'
            }}
            onClick={onClose}
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsPopup;