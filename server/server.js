// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const helmet = require('helmet');
const { connectDatabase } = require('./config/db');
const { logger } = require('./config/logger');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

console.log('Starting server application...');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
logger.info('Setting up middleware...');
app.use(helmet());

// Configure CORS for API
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN || 'http://localhost:5000'
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

// Request logging middleware
app.use((req, res, next) => {
  // Log start of request
  logger.info({
    message: `${req.method} ${req.url}`,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    query: req.query,
    bodyKeys: req.body ? Object.keys(req.body) : []
  });
  
  // Log end of request
  res.on('finish', () => {
    // Log HTTP status codes 4xx and 5xx
    if (res.statusCode >= 400) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
      logger[logLevel]({
        message: `${req.method} ${req.url} - ${res.statusCode}`,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTime: Date.now() - req._startTime,
        ip: req.ip
      });
    }
  });
  
  // Register start time to measure response time
  req._startTime = Date.now();
  next();
});

logger.info('Middleware setup complete');

// Connect to MongoDB
connectDatabase();

// API routes
app.use('/api', routes);

// Global error handler
app.use(errorHandler);

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API available at http://localhost:${PORT}/api/`);
});