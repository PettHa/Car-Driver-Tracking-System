// server/routes/activityLogs.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const { activityLogValidationRules } = require('../middleware/validator');
const ActivityLog = require('../models/ActivityLog');
const { logger } = require('../config/logger');

// Get activity logs
router.get('/', activityLogValidationRules, async (req, res) => {
  logger.info('GET /api/activity-logs: Getting activity logs with parameters:', req.query);
  
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Invalid input for activity logs:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { carId, startDate, endDate, limit = 100, action } = req.query;
    
    const query = {};
    
    if (carId) {
      // Validate MongoDB ObjectId format
      if (!mongoose.Types.ObjectId.isValid(carId)) {
        logger.warn(`Invalid carId format: ${carId}`);
        return res.status(400).json({ message: 'Invalid car ID format' });
      }
      
      query.carId = carId;
      logger.info(`Filtering by carID: ${carId}`);
    }
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
      logger.info(`Filtering by time period: ${startDate} to ${endDate}`);
    } else if (startDate) {
      query.timestamp = { $gte: new Date(startDate) };
      logger.info(`Filtering by time from: ${startDate}`);
    } else if (endDate) {
      query.timestamp = { $lte: new Date(endDate) };
      logger.info(`Filtering by time to: ${endDate}`);
    }
    
    if (action) {
      query.action = action;
      logger.info(`Filtering by action: ${action}`);
    }
    
    logger.info('Final query:', JSON.stringify(query));
    
    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .exec();
      
    logger.info(`Found ${logs.length} log entries`);
    res.json(logs);
  } catch (err) {
    logger.error('GET /api/activity-logs ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export activity logs as CSV
router.get('/export', activityLogValidationRules, async (req, res) => {
  logger.info('GET /api/activity-logs/export: Exporting activity logs to CSV...');
  
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Invalid input for CSV export:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { carId, startDate, endDate, action } = req.query;
    
    const query = {};
    
    if (carId) {
      // Validate MongoDB ObjectId format
      if (!mongoose.Types.ObjectId.isValid(carId)) {
        logger.warn(`Invalid carId format: ${carId}`);
        return res.status(400).json({ message: 'Invalid car ID format' });
      }
      
      query.carId = carId;
      logger.info(`Filtering by carID: ${carId}`);
    }
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
      logger.info(`Filtering by time period: ${startDate} to ${endDate}`);
    } else if (startDate) {
      query.timestamp = { $gte: new Date(startDate) };
      logger.info(`Filtering by time from: ${startDate}`);
    } else if (endDate) {
      query.timestamp = { $lte: new Date(endDate) };
      logger.info(`Filtering by time to: ${endDate}`);
    }
    
    if (action) {
      query.action = action;
      logger.info(`Filtering by action: ${action}`);
    }
    
    logger.info('Final query:', JSON.stringify(query));
    
    const logs = await ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .exec();
      
    logger.info(`Found ${logs.length} log entries for CSV export`);
      
    // Convert to CSV
    logger.info('Converting data to CSV format...');
    const headers = [
      'Tidspunkt',
      'Handling',
      'Bil Nr',
      'Registreringsnr',
      'Tidligere Sjåfør',
      'Ny Sjåfør',
      'Notat',
      'Bruker',
      'IP-adresse' // New column for security tracking
    ];
    
    const actionMap = {
      'driver_assigned': 'Ansatt tildelt',
      'driver_removed': 'Ansatt fjernet',
      'maintenance_set': 'Satt til vedlikehold',
      'maintenance_cleared': 'Fjernet fra vedlikehold',
      'car_added': 'Bil lagt til',
      'car_updated': 'Bil oppdatert',
      'car_deleted': 'Bil slettet'
    };
    
    const csvData = logs.map(log => [
      new Date(log.timestamp).toLocaleString('no'),
      actionMap[log.action] || log.action,
      log.carNumber,
      log.registrationNumber,
      log.previousDriver || '-',
      log.newDriver || '-',
      log.note || '',
      log.userId,
      log.ipAddress || '-'
    ]);
    
    // Create CSV content with proper escaping for special characters
    const escapeCsvValue = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n');
    
    logger.info('CSV generated, sending response...');
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=aktivitetslogg_${new Date().toISOString().split('T')[0]}.csv`);
    
    // Send CSV response
    res.send(csvContent);
  } catch (err) {
    logger.error('GET /api/activity-logs/export ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;