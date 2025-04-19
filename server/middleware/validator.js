// server/middleware/validator.js
const { check } = require('express-validator');

// Common validation rules
const carValidationRules = [
  check('carNumber', 'Car number must be an integer').isInt(),
  check('registrationNumber', 'Registration number is required').notEmpty().matches(/^[A-Z0-9 ]{2,8}$/),
  check('phoneNumber', 'Valid phone number is required').matches(/^[0-9+ ]{8,15}$/),
  check('driver').optional().trim().escape(),
  check('note').optional().trim().escape(),
  check('status').optional().isIn(['available', 'inuse', 'maintenance'])
];

const driverValidationRules = [
  check('driver').optional().trim().escape(),
  check('note').optional().trim().escape()
];

const maintenanceValidationRules = [
  check('note').optional().trim().escape()
];

const activityLogValidationRules = [
  check('carId').optional().isMongoId().withMessage('Invalid car ID format'),
  check('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  check('endDate').optional().isISO8601().withMessage('Invalid end date format'),
  check('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  check('action').optional().isIn([
    'driver_assigned', 'driver_removed', 'maintenance_set', 
    'maintenance_cleared', 'car_added', 'car_updated', 'car_deleted'
  ]).withMessage('Invalid action type')
];

module.exports = {
  carValidationRules,
  driverValidationRules,
  maintenanceValidationRules,
  activityLogValidationRules
};