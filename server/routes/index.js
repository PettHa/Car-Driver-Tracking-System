// server/routes/index.js
const express = require('express');
const router = express.Router();
const { apiLimiter } = require('../middleware/rateLimiter');
const carRoutes = require('./cars');
const activityLogRoutes = require('./activityLogs');

// Apply rate limiting to all API routes
router.use('/', apiLimiter);

// Car routes
router.use('/cars', carRoutes);

// Activity log routes
router.use('/activity-logs', activityLogRoutes);

module.exports = router;