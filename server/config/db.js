// server/config/db.js
const mongoose = require('mongoose');
const fs = require('fs');
const { logger } = require('./logger');

// Validate environment variables at startup
const validateEnvVars = () => {
  // Check if we have a MongoDB URI (for Atlas) or individual connection parameters
  if (!process.env.MONGO_URI) {
    const requiredVars = [
      'MONGO_USER', 
      'MONGO_PASSWORD', 
      'MONGO_HOST', 
      'MONGO_PORT',
      'MONGO_DB'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      logger.error(`Missing required environment variables: ${missing.join(', ')}`);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1); // Stop server in production if necessary environment variables are missing
      }
    }
  }
};

// Build up secure MongoDB connection string
const getMongoURI = () => {
  return process.env.MONGO_URI || 
    (process.env.NODE_ENV === 'production' 
      ? `mongodb://${process.env.MONGO_USER}:${encodeURIComponent(process.env.MONGO_PASSWORD)}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&ssl=true`
      : 'mongodb://localhost:27017/bilregister');
};

// Get Mongoose options
const getMongooseOptions = () => {
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  };

  // Add SSL options in production
  if (process.env.NODE_ENV === 'production') {
    // Secure SSL/TLS configuration for MongoDB (if SSL is enabled)
    if (process.env.MONGO_SSL === 'true' && fs.existsSync(process.env.MONGO_CA_FILE)) {
      options.tls = true;
      options.tlsCAFile = process.env.MONGO_CA_FILE;
      options.tlsAllowInvalidHostnames = false;
      options.tlsAllowInvalidCertificates = false;
    }
  }

  return options;
};

// Connect to MongoDB with secure options
const connectDatabase = async () => {
  validateEnvVars();
  
  const mongoURI = getMongoURI();
  const mongooseOptions = getMongooseOptions();
  
  logger.info('Trying to connect to MongoDB...');
  
  try {
    await mongoose.connect(mongoURI, mongooseOptions);
    logger.info('MongoDB connected successfully!');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Stop server in production if DB connection fails
    }
  }
  
  // Database event listeners
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({
      message: 'MongoDB error',
      error: err.message,
      stack: err.stack
    });
  });
};

module.exports = {
  connectDatabase,
  getMongoURI,
  getMongooseOptions
};