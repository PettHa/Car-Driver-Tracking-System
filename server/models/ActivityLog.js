// server/models/ActivityLog.js
const mongoose = require('mongoose');

// Activity log schema to track all changes
const activityLogSchema = new mongoose.Schema({
  action: { 
    type: String, 
    required: true,
    enum: ['driver_assigned', 'driver_removed', 'maintenance_set', 'maintenance_cleared', 'car_added', 'car_updated', 'car_deleted'] 
  },
  carId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Car',
    required: true 
  },
  carNumber: { type: Number, required: true },
  registrationNumber: { type: String, required: true },
  previousDriver: { type: String, default: null },
  newDriver: { type: String, default: null },
  note: { type: String, default: '' },
  userId: { type: String, default: 'system' }, // Can be used to track which user made the change
  timestamp: { type: Date, default: Date.now },
  // New fields for security tracking
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' }
});

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;