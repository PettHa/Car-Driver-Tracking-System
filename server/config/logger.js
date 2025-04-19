// server/config/logger.js
const winston = require('winston');
const fs = require('fs');

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'bilregister-api' },
  transports: [
    // Error logging to file
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    // Security events
    new winston.transports.File({ 
      filename: 'logs/security.log', 
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  ]
});

// Add console logging in development environment
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Ensure log folders exist
const ensureLogDirectoryExists = () => {
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs');
  }
};

ensureLogDirectoryExists();

module.exports = { 
  logger 
};