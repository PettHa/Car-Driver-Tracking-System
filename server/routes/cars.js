// server/routes/cars.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const { 
  carValidationRules, 
  driverValidationRules, 
  maintenanceValidationRules 
} = require('../middleware/validator');
const Car = require('../models/Car');
const ActivityLog = require('../models/ActivityLog');
const { logger } = require('../config/logger');
const { sanitizeInput, verifyData } = require('../utils/security');

// Get all cars
router.get('/', async (req, res) => {
  logger.info('GET /api/cars: Getting all cars...');
  try {
    const cars = await Car.find().sort({ carNumber: 1 });
    logger.info(`GET /api/cars: Found ${cars.length} cars`);
    res.json(cars);
  } catch (err) {
    logger.error('GET /api/cars ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single car
router.get('/:id', async (req, res) => {
  logger.info(`GET /api/cars/${req.params.id}: Getting specific car...`);
  try {
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      logger.warn(`Invalid car ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Invalid ID format' });
    }
    
    const car = await Car.findById(req.params.id);
    if (!car) {
      logger.info(`GET /api/cars/${req.params.id}: Car not found`);
      return res.status(404).json({ message: 'Car not found' });
    }
    logger.info(`GET /api/cars/${req.params.id}: Car found:`, car.registrationNumber);
    res.json(car);
  } catch (err) {
    logger.error(`GET /api/cars/${req.params.id} ERROR:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new car
router.post('/', carValidationRules, async (req, res) => {
  logger.info('POST /api/cars: Creating new car with data:', JSON.stringify(req.body));
  
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Invalid input for new car:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Start a database session for transactions
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    let { userId, driver, note, ...carData } = req.body;
    
    // Sanitize input to prevent XSS
    carData.driver = sanitizeInput(driver) || '';
    carData.note = sanitizeInput(note) || '';
    
    const newCar = new Car(carData);
    logger.info('Saving new car...');
    const savedCar = await newCar.save({ session });
    logger.info(`Car saved with ID: ${savedCar._id}`);
    
    // Create activity log entry
    logger.info('Creating activity log for new car...');
    const activityLog = new ActivityLog({
      action: 'car_added',
      carId: savedCar._id,
      carNumber: savedCar.carNumber,
      registrationNumber: savedCar.registrationNumber,
      previousDriver: null,
      newDriver: savedCar.driver || null,
      note: savedCar.note || '',
      userId: userId || 'system',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });
    
    await activityLog.save({ session });
    logger.info('Activity log saved');
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json(savedCar);
  } catch (err) {
    // Something went wrong, abort the entire transaction
    await session.abortTransaction();
    session.endSession();
    
    logger.error('POST /api/cars ERROR:', err);
    if (err.code === 11000) {
      logger.warn('Duplicate car number or registration number');
      return res.status(400).json({ message: 'Car number or registration number already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Update car
router.put('/:id', carValidationRules, async (req, res) => {
  logger.info(`PUT /api/cars/${req.params.id}: Updating car with data:`, JSON.stringify(req.body));
  
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Invalid input for car update:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Validate MongoDB ObjectId format
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.warn(`Invalid car ID format: ${req.params.id}`);
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  
  // Start a database session for transactions
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    let { userId, signature, timestamp, driver, note, ...updateData } = req.body;
    
    // Sanitize input to prevent XSS
    if (driver) {
      updateData.driver = sanitizeInput(driver);
    }
    
    if (note) {
      updateData.note = sanitizeInput(note);
    }
    
    // Check signature if given (to verify data integrity)
    if (signature && timestamp) {
      // Check if data is older than allowed (prevents replay attacks)
      const maxAgeMs = 5 * 60 * 1000; // 5 minutes
      if (Date.now() - timestamp > maxAgeMs) {
        logger.warn('Request expired for car update', { id: req.params.id });
        return res.status(400).json({ message: 'Request has expired' });
      }
      
      const dataToVerify = { 
        id: req.params.id, 
        ...updateData, 
        timestamp 
      };
      
      if (!verifyData(dataToVerify, signature)) {
        logger.warn('Invalid data signature for car update', { id: req.params.id });
        return res.status(403).json({ message: 'Invalid data signature' });
      }
    }
    
    // Find the car before updating to get previous state
    logger.info('Getting existing car...');
    const existingCar = await Car.findById(req.params.id);
    if (!existingCar) {
      logger.warn(`Car with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Car not found' });
    }
    logger.info('Existing car found:', {
      carNumber: existingCar.carNumber,
      registrationNumber: existingCar.registrationNumber
    });
    
    logger.info('Updating car...');
    const updatedCar = await Car.findByIdAndUpdate(
      req.params.id, 
      updateData,
      { new: true, runValidators: true, session }
    );
    
    logger.info('Car updated:', {
      carNumber: updatedCar.carNumber,
      registrationNumber: updatedCar.registrationNumber
    });
    
    // Create activity log entry
    logger.info('Creating activity log for car update...');
    const activityLog = new ActivityLog({
      action: 'car_updated',
      carId: updatedCar._id,
      carNumber: updatedCar.carNumber,
      registrationNumber: updatedCar.registrationNumber,
      previousDriver: existingCar.driver,
      newDriver: updatedCar.driver,
      note: `Car number changed from ${existingCar.carNumber} to ${updatedCar.carNumber}, Registration number changed from ${existingCar.registrationNumber} to ${updatedCar.registrationNumber}`,
      userId: userId || 'system',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });
    
    await activityLog.save({ session });
    logger.info('Activity log saved');
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    res.json(updatedCar);
  } catch (err) {
    // Something went wrong, abort the entire transaction
    await session.abortTransaction();
    session.endSession();
    
    logger.error(`PUT /api/cars/${req.params.id} ERROR:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update car driver status
router.patch('/:id/driver', driverValidationRules, async (req, res) => {
  logger.info(`PATCH /api/cars/${req.params.id}/driver: Updating driver status with data:`, JSON.stringify(req.body));
  
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Invalid input for driver status:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Validate MongoDB ObjectId format
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.warn(`Invalid car ID format: ${req.params.id}`);
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  
  try {
    let { driver, note, userId } = req.body;
    
    // Sanitize input to prevent XSS
    driver = sanitizeInput(driver);
    note = sanitizeInput(note);
    
    let update = { driver, note };
    
    // Find the car before updating to get previous state
    logger.info('Getting existing car...');
    const existingCar = await Car.findById(req.params.id);
    if (!existingCar) {
      logger.warn(`Car with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Car not found' });
    }
    
    logger.info('Existing car found:', {
      carNumber: existingCar.carNumber,
      registrationNumber: existingCar.registrationNumber,
      currentDriver: existingCar.driver,
      currentStatus: existingCar.status
    });
    
    // If driver field is not empty, set status to 'inuse' and update registration time
    if (driver && driver.trim() !== '') {
      update.status = 'inuse';
      update.registrationTime = new Date();
      logger.info('Updating status to "inuse" with driver:', driver);
    } else if (note && (note.toLowerCase().includes('vedlikehold') || note.toLowerCase().includes('ødelagt'))) {
      // If note includes maintenance keywords, set status to 'maintenance'
      update.status = 'maintenance';
      update.registrationTime = null;
      logger.info('Updating status to "maintenance" based on note');
    } else {
      // Otherwise, set to available
      update.status = 'available';
      update.registrationTime = null;
      logger.info('Updating status to "available"');
    }
    
    logger.info('Updating car with:', update);
    const updatedCar = await Car.findByIdAndUpdate(
      req.params.id, 
      update,
      { new: true }
    );
    
    // Create activity log entry
    let action;
    if (existingCar.status !== updatedCar.status) {
      if (updatedCar.status === 'inuse') {
        action = 'driver_assigned';
        logger.info('Activity: Driver assigned');
      } else if (updatedCar.status === 'available' && existingCar.status === 'inuse') {
        action = 'driver_removed';
        logger.info('Activity: Driver removed');
      } else if (updatedCar.status === 'maintenance') {
        action = 'maintenance_set';
        logger.info('Activity: Set to maintenance');
      } else if (existingCar.status === 'maintenance') {
        action = 'maintenance_cleared';
        logger.info('Activity: Removed from maintenance');
      }
    } else if (existingCar.driver !== updatedCar.driver) {
      action = updatedCar.driver ? 'driver_assigned' : 'driver_removed';
      logger.info(`Activity: ${updatedCar.driver ? 'Driver assigned' : 'Driver removed'}`);
    } else {
      action = 'car_updated';
      logger.info('Activity: Car updated');
    }
    
    logger.info('Creating activity log...');
    const activityLog = new ActivityLog({
      action,
      carId: updatedCar._id,
      carNumber: updatedCar.carNumber,
      registrationNumber: updatedCar.registrationNumber,
      previousDriver: existingCar.driver,
      newDriver: updatedCar.driver,
      note: updatedCar.note,
      userId: userId || 'system',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });
    
    await activityLog.save();
    logger.info('Activity log saved');
    
    res.json(updatedCar);
  } catch (err) {
    logger.error(`PATCH /api/cars/${req.params.id}/driver ERROR:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Set car to maintenance
router.patch('/:id/maintenance', maintenanceValidationRules, async (req, res) => {
  logger.info(`PATCH /api/cars/${req.params.id}/maintenance: Setting car to maintenance with data:`, JSON.stringify(req.body));
  
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Invalid input for maintenance status:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  
  // Validate MongoDB ObjectId format
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.warn(`Invalid car ID format: ${req.params.id}`);
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  
  try {
    let { note, userId } = req.body;
    
    // Sanitize input to prevent XSS
    note = sanitizeInput(note);
    
    // Find the car before updating to get previous state
    logger.info('Getting existing car...');
    const existingCar = await Car.findById(req.params.id);
    if (!existingCar) {
      logger.warn(`Car with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Car not found' });
    }
    
    logger.info('Existing car found:', {
      carNumber: existingCar.carNumber,
      registrationNumber: existingCar.registrationNumber,
      currentStatus: existingCar.status
    });
    
    logger.info('Updating to maintenance status...');
    const updatedCar = await Car.findByIdAndUpdate(
      req.params.id,
      {
        status: 'maintenance',
        driver: '',
        note,
        registrationTime: null
      },
      { new: true }
    );
    
    // Create activity log entry
    logger.info('Creating activity log for maintenance...');
    const activityLog = new ActivityLog({
      action: 'maintenance_set',
      carId: updatedCar._id,
      carNumber: updatedCar.carNumber,
      registrationNumber: updatedCar.registrationNumber,
      previousDriver: existingCar.driver,
      newDriver: '',
      note: note,
      userId: userId || 'system',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });
    
    await activityLog.save();
    logger.info('Activity log saved');
    
    res.json(updatedCar);
  } catch (err) {
    logger.error(`PATCH /api/cars/${req.params.id}/maintenance ERROR:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// End all trips - set all cars to available
router.patch('/end-all-trips', async (req, res) => {
  logger.info('PATCH /api/cars/end-all-trips: Ending all trips...');
  
  // Start a database session for transactions
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userId } = req.body;
    
    // Find all cars currently in use before updating
    logger.info('Getting all cars in use...');
    const carsInUse = await Car.find({ status: 'inuse' });
    logger.info(`Found ${carsInUse.length} cars in use`);
    
    // Log if it's a large operation (many cars affected)
    if (carsInUse.length > 10) {
      logger.warn({
        message: `Large database operation: end-all-trips`,
        count: carsInUse.length
      });
    }
    
    logger.info('Updating all cars in use to available...');
    const result = await Car.updateMany(
      { status: 'inuse' },
      { 
        status: 'available', 
        driver: '', 
        registrationTime: null 
      },
      { session }
    );
    
    logger.info(`Updated ${result.nModified || result.modifiedCount} cars`);
    
    // Create activity log entries for each car
    if (carsInUse.length > 0) {
      logger.info('Creating activity logs for all ended trips...');
      const activityLogs = carsInUse.map(car => ({
        action: 'driver_removed',
        carId: car._id,
        carNumber: car.carNumber,
        registrationNumber: car.registrationNumber,
        previousDriver: car.driver,
        newDriver: '',
        note: 'Mass ending of trips',
        userId: userId || 'system',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || ''
      }));
      
      await ActivityLog.insertMany(activityLogs, { session });
      logger.info(`${activityLogs.length} activity logs saved`);
    }
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    res.json({ 
      message: 'All trips ended successfully',
      carsUpdated: result.nModified || result.modifiedCount // handle different MongoDB driver versions
    });
  } catch (err) {
    // Something went wrong, abort the entire transaction
    await session.abortTransaction();
    session.endSession();
    
    logger.error('PATCH /api/cars/end-all-trips ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete car
router.delete('/:id', async (req, res) => {
  logger.info(`DELETE /api/cars/${req.params.id}: Deleting car...`);
  
  // Validate MongoDB ObjectId format
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    logger.warn(`Invalid car ID format: ${req.params.id}`);
    return res.status(400).json({ message: 'Invalid ID format' });
  }
  
  // Start a database session for transactions
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userId } = req.body;
    
    logger.info('Getting and deleting car...');
    const deletedCar = await Car.findByIdAndDelete(req.params.id, { session });
    if (!deletedCar) {
      logger.warn(`Car with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Car not found' });
    }
    
    logger.info(`Car deleted: ${deletedCar.carNumber}, ${deletedCar.registrationNumber}`);
    
    // Create activity log entry
    logger.info('Creating activity log for deleted car...');
    const activityLog = new ActivityLog({
      action: 'car_deleted',
      carId: deletedCar._id,
      carNumber: deletedCar.carNumber,
      registrationNumber: deletedCar.registrationNumber,
      previousDriver: deletedCar.driver,
      newDriver: null,
      note: `Car deleted from the system`,
      userId: userId || 'system',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });
    
    await activityLog.save({ session });
    logger.info('Activity log saved');
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    res.json({ message: 'Car deleted successfully' });
  } catch (err) {
    // Something went wrong, abort the entire transaction
    await session.abortTransaction();
    session.endSession();
    
    logger.error(`DELETE /api/cars/${req.params.id} ERROR:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Seed initial data if needed
router.post('/seed', async (req, res) => {
  logger.info('POST /api/cars/seed: Adding test data...');
  
  // Start a database session for transactions
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Clear existing data
    logger.info('Deleting existing data...');
    await Car.deleteMany({}, { session });
    logger.info('Existing data deleted');
    
    // Initial car data
    logger.info('Preparing test data...');
    const cars = [
      { carNumber: 39, registrationNumber: 'AB12345', phoneNumber: '480 12 345', driver: 'Ola Nordmann', note: '', registrationTime: new Date('2025-03-22T08:15:00'), status: 'inuse' },
      { carNumber: 40, registrationNumber: 'CD67890', phoneNumber: '480 23 456', driver: 'Kari Nordmann', note: 'Verksted 3.3.15', registrationTime: new Date('2025-03-21T14:30:00'), status: 'inuse' },
      { carNumber: 41, registrationNumber: 'EF12345', phoneNumber: '480 34 567', driver: '', note: '', registrationTime: null, status: 'available' },
      { carNumber: 42, registrationNumber: 'GH67890', phoneNumber: '480 45 678', driver: 'Per Hansen', note: '', registrationTime: new Date('2025-03-22T09:45:00'), status: 'inuse' },
      { carNumber: 43, registrationNumber: 'IJ12345', phoneNumber: '480 56 789', driver: '', note: 'Ødelagt bremsesystem', registrationTime: null, status: 'maintenance' },
      { carNumber: 44, registrationNumber: 'KL67890', phoneNumber: '480 67 890', driver: 'Lisa Andersen', note: '', registrationTime: new Date('2025-03-22T10:20:00'), status: 'inuse' },
      { carNumber: 45, registrationNumber: 'MN12345', phoneNumber: '480 78 901', driver: '', note: '', registrationTime: null, status: 'available' },
    ];
    
    logger.info(`Adding ${cars.length} test cars...`);
    await Car.insertMany(cars, { session });
    logger.info('Test data added');
    
    // Commit transaction
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json({ message: 'Database seeded successfully' });
  } catch (err) {
    // Something went wrong, abort the entire transaction
    await session.abortTransaction();
    session.endSession();
    
    logger.error('POST /api/cars/seed ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;