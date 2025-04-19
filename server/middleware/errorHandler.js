// server/middleware/errorHandler.js
const { logger } = require('../config/logger');

// Global error handler for unhandled errors
const errorHandler = (err, req, res, next) => {
  logger.error({
    message: 'Unhandled error occurred',
    error: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Server error' 
      : err.message
  });
};

module.exports = errorHandler;