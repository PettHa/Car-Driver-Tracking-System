// server.js - Node.js backend for Bilsjåfør Registrering
// Med OWASP Top 10 sikkerhetstiltak implementert
require('dotenv').config(); // npm install dotenv
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet'); // npm install helmet
const rateLimit = require('express-rate-limit'); // npm install express-rate-limit
const { check, validationResult } = require('express-validator'); // npm install express-validator
const sanitizeHtml = require('sanitize-html'); // npm install sanitize-html
const winston = require('winston'); // npm install winston
const fs = require('fs');
const crypto = require('crypto');

console.log('Starter server-applikasjon...');

// Opprett logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'bilregister-api' },
  transports: [
    // Feillogging til fil
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Kombinert logg
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    // Sikkerhetshendelser
    new winston.transports.File({ 
      filename: 'logs/security.log', 
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    })
  ]
});

// Legg til konsoll-logging i utviklingsmiljø
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Se til at logmappene eksisterer
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Initialisere Express
const app = express();
const PORT = process.env.PORT || 5000;

// Valider miljøvariabler ved oppstart
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
      logger.error(`Manglende påkrevde miljøvariabler: ${missing.join(', ')}`);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1); // Stopp serveren i produksjon hvis nødvendige miljøvariabler mangler
      }
    }
  }
};

validateEnvVars();

// Bygg opp sikker MongoDB connection string
const mongoURI = process.env.MONGO_URI || 
  (process.env.NODE_ENV === 'production' 
    ? `mongodb://${process.env.MONGO_USER}:${encodeURIComponent(process.env.MONGO_PASSWORD)}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin&ssl=true`
    : 'mongodb://localhost:27017/bilregister');

// Middleware
logger.info('Setter opp middleware...');

// Sikkerhetshoder
app.use(helmet());

// Rate limiting for å forhindre brute force og DoS-angrep
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutter
  max: 100, // maks 100 forespørsler per IP i denne tidsperioden
  standardHeaders: true,
  legacyHeaders: false,
  message: 'For mange forespørsler fra denne IP-adressen, prøv igjen senere'
});

// Begrenset CORS for API-et
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGIN || 'http://localhost:5000'
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '1mb' })); // Begrens størrelsen på JSON-data
app.use(express.static(path.join(__dirname, 'client/build')));
app.use('/api/', apiLimiter);

// Logg alle API-forespørsler
app.use((req, res, next) => {
  // Logg start av forespørsel
  logger.info({
    message: `${req.method} ${req.url}`,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    query: req.query,
    // Ikke logg fullstendige request bodies - kan inneholde sensitiv info
    bodyKeys: req.body ? Object.keys(req.body) : []
  });
  
  // Logg slutten av forespørselen
  res.on('finish', () => {
    // Logg HTTP-statuskoder 4xx og 5xx
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
  
  // Registrer starttidspunkt for å måle responstid
  req._startTime = Date.now();
  next();
});

logger.info('Middleware oppsett fullført');

// Signering av data for integritetsbeskyttelse
const signData = (data, secret = process.env.DATA_SIGNING_SECRET || 'default-signing-secret') => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(data));
  return hmac.digest('hex');
};

// Verifisering av data
const verifyData = (data, signature, secret = process.env.DATA_SIGNING_SECRET || 'default-signing-secret') => {
  const expectedSignature = signData(data, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (err) {
    logger.error('Error verifying data signature:', err);
    return false;
  }
};

// Connect to MongoDB with secure options
logger.info('Prøver å koble til MongoDB...');
const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Tidsavbrudd for servervalg for å unngå at applikasjonen henger
  serverSelectionTimeoutMS: 5000,
  // Tidsavbrudd for socket-tilkoblinger
  socketTimeoutMS: 45000
};

// Legg til SSL-opsjoner i produksjon
if (process.env.NODE_ENV === 'production') {
  // Sikker SSL/TLS konfigurasjon for MongoDB (hvis SSL er aktivert)
  if (process.env.MONGO_SSL === 'true' && fs.existsSync(process.env.MONGO_CA_FILE)) {
    mongooseOptions.tls = true;
    mongooseOptions.tlsCAFile = process.env.MONGO_CA_FILE;
    mongooseOptions.tlsAllowInvalidHostnames = false;
    mongooseOptions.tlsAllowInvalidCertificates = false;
  }
}

mongoose.connect(mongoURI, mongooseOptions)
  .then(() => logger.info('MongoDB tilkoblet suksessfullt!'))
  .catch(err => {
    logger.error('MongoDB tilkoblingsfeil:', err);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1); // Stopp serveren i produksjon hvis DB-tilkobling feiler
    }
  });

// Databasehendelseslytting
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB frakoblet');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB tilkoblet på nytt');
});

mongoose.connection.on('error', (err) => {
  logger.error({
    message: 'MongoDB feil',
    error: err.message,
    stack: err.stack
  });
});

// Create Mongoose schemas and models
logger.info('Definerer database-skjemaer...');
const carSchema = new mongoose.Schema({
    carNumber: { type: Number, required: true, unique: true },
    registrationNumber: { 
      type: String, 
      required: true, 
      unique: true,
      // Validér norsk registreringsnummer format
      validate: {
        validator: function(v) {
          return /^[A-Z0-9 ]{2,8}$/.test(v);
        },
        message: props => `${props.value} er ikke et gyldig registreringsnummer!`
      }
    },
    phoneNumber: { 
      type: String, 
      required: true,
      // Validér telefonnummer
      validate: {
        validator: function(v) {
          return /^[0-9+ ]{8,15}$/.test(v);
        },
        message: props => `${props.value} er ikke et gyldig telefonnummer!`
      }
    },
    driver: { type: String, default: '' },
    note: { type: String, default: '' },
    registrationTime: { type: Date, default: null },
    status: { type: String, enum: ['available', 'inuse', 'maintenance'], default: 'available' }
});

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
    // Nye felt for sikkerhetssporing
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' }
});

const Car = mongoose.model('Car', carSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
logger.info('Database-modeller opprettet: Car og ActivityLog');

// API Routes

// Get all cars
app.get('/api/cars', async (req, res) => {
    logger.info('GET /api/cars: Henter alle biler...');
    try {
        const cars = await Car.find().sort({ carNumber: 1 });
        logger.info(`GET /api/cars: Fant ${cars.length} biler`);
        res.json(cars);
    } catch (err) {
        logger.error('GET /api/cars FEIL:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get activity logs
app.get('/api/activity-logs', [
  check('carId').optional().isMongoId().withMessage('Ugyldig bil-ID format'),
  check('startDate').optional().isISO8601().withMessage('Ugyldig startdato format'),
  check('endDate').optional().isISO8601().withMessage('Ugyldig sluttdato format'),
  check('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit må være mellom 1 og 1000'),
  check('action').optional().isIn([
    'driver_assigned', 'driver_removed', 'maintenance_set', 
    'maintenance_cleared', 'car_added', 'car_updated', 'car_deleted'
  ]).withMessage('Ugyldig handlingstype')
], async (req, res) => {
    logger.info('GET /api/activity-logs: Henter aktivitetslogger med parametre:', req.query);
    
    // Valider input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ugyldig input for aktivitetslogger:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { carId, startDate, endDate, limit = 100, action } = req.query;
        
        const query = {};
        
        if (carId) {
            // Valider MongoDB ObjectId format
            if (!mongoose.Types.ObjectId.isValid(carId)) {
              logger.warn(`Ugyldig carId format: ${carId}`);
              return res.status(400).json({ message: 'Ugyldig bil-ID format' });
            }
            
            query.carId = carId;
            logger.info(`Filtrerer på bilID: ${carId}`);
        }
        
        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
            logger.info(`Filtrerer på tidsperiode: ${startDate} til ${endDate}`);
        } else if (startDate) {
            query.timestamp = { $gte: new Date(startDate) };
            logger.info(`Filtrerer på tid fra: ${startDate}`);
        } else if (endDate) {
            query.timestamp = { $lte: new Date(endDate) };
            logger.info(`Filtrerer på tid til: ${endDate}`);
        }
        
        if (action) {
            query.action = action;
            logger.info(`Filtrerer på action: ${action}`);
        }
        
        logger.info('Endelig spørring:', JSON.stringify(query));
        
        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .exec();
            
        logger.info(`Fant ${logs.length} logginnslag`);
        res.json(logs);
    } catch (err) {
        logger.error('GET /api/activity-logs FEIL:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single car
app.get('/api/cars/:id', async (req, res) => {
    logger.info(`GET /api/cars/${req.params.id}: Henter spesifikk bil...`);
    try {
        // Valider MongoDB ObjectId format
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
          logger.warn(`Ugyldig bil-ID format: ${req.params.id}`);
          return res.status(400).json({ message: 'Ugyldig ID-format' });
        }
        
        const car = await Car.findById(req.params.id);
        if (!car) {
            logger.info(`GET /api/cars/${req.params.id}: Bil ikke funnet`);
            return res.status(404).json({ message: 'Car not found' });
        }
        logger.info(`GET /api/cars/${req.params.id}: Bil funnet:`, car.registrationNumber);
        res.json(car);
    } catch (err) {
        logger.error(`GET /api/cars/${req.params.id} FEIL:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new car
app.post('/api/cars', [
  check('carNumber', 'Bilnummer må være et heltall').isInt(),
  check('registrationNumber', 'Registreringsnummer er påkrevd').notEmpty().matches(/^[A-Z0-9 ]{2,8}$/),
  check('phoneNumber', 'Gyldig telefonnummer er påkrevd').matches(/^[0-9+ ]{8,15}$/),
  check('driver').optional().trim().escape(),
  check('note').optional().trim().escape(),
  check('status').optional().isIn(['available', 'inuse', 'maintenance'])
], async (req, res) => {
    logger.info('POST /api/cars: Oppretter ny bil med data:', JSON.stringify(req.body));
    
    // Valider input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ugyldig input for ny bil:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Start en database-sesjon for transaksjoner
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        let { userId, driver, note, ...carData } = req.body;
        
        // Sanitér input for å forhindre XSS
        if (driver) {
          driver = sanitizeHtml(driver, {
            allowedTags: [],
            allowedAttributes: {}
          });
        }
        
        if (note) {
          note = sanitizeHtml(note, {
            allowedTags: [],
            allowedAttributes: {}
          });
        }
        
        // Sett tilbake saniterte verdier
        carData.driver = driver || '';
        carData.note = note || '';
        
        const newCar = new Car(carData);
        logger.info('Lagrer ny bil...');
        const savedCar = await newCar.save({ session });
        logger.info(`Bil lagret med ID: ${savedCar._id}`);
        
        // Create activity log entry
        logger.info('Oppretter aktivitetslogg for ny bil...');
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
        logger.info('Aktivitetslogg lagret');
        
        // Commit transaksjonen
        await session.commitTransaction();
        session.endSession();
        
        res.status(201).json(savedCar);
    } catch (err) {
        // Noe gikk galt, rull tilbake hele transaksjonen
        await session.abortTransaction();
        session.endSession();
        
        logger.error('POST /api/cars FEIL:', err);
        if (err.code === 11000) {
            logger.warn('Duplikat bilnummer eller registreringsnummer');
            return res.status(400).json({ message: 'Car number or registration number already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Update car
app.put('/api/cars/:id', [
  check('carNumber', 'Bilnummer må være et heltall').isInt(),
  check('registrationNumber', 'Registreringsnummer er påkrevd').notEmpty().matches(/^[A-Z0-9 ]{2,8}$/),
  check('phoneNumber', 'Gyldig telefonnummer er påkrevd').matches(/^[0-9+ ]{8,15}$/),
  check('driver').optional().trim().escape(),
  check('note').optional().trim().escape(),
  check('status').optional().isIn(['available', 'inuse', 'maintenance'])
], async (req, res) => {
    logger.info(`PUT /api/cars/${req.params.id}: Oppdaterer bil med data:`, JSON.stringify(req.body));
    
    // Valider input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ugyldig input for biloppdatering:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Valider MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      logger.warn(`Ugyldig bil-ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Ugyldig ID-format' });
    }
    
    // Start en database-sesjon for transaksjoner
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        let { userId, signature, timestamp, driver, note, ...updateData } = req.body;
        
        // Sanitér input for å forhindre XSS
        if (driver) {
          driver = sanitizeHtml(driver, {
            allowedTags: [],
            allowedAttributes: {}
          });
          updateData.driver = driver;
        }
        
        if (note) {
          note = sanitizeHtml(note, {
            allowedTags: [],
            allowedAttributes: {}
          });
          updateData.note = note;
        }
        
        // Sjekk signatur om den er gitt (for å verifisere data-integritet)
        if (signature && timestamp) {
          // Sjekk om data er eldre enn tillatt (hindrer replay-angrep)
          const maxAgeMs = 5 * 60 * 1000; // 5 minutter
          if (Date.now() - timestamp > maxAgeMs) {
            logger.warn('Forespørsel utgått for bil-oppdatering', { id: req.params.id });
            return res.status(400).json({ message: 'Forespørselen er utgått' });
          }
          
          const dataToVerify = { 
            id: req.params.id, 
            ...updateData, 
            timestamp 
          };
          
          if (!verifyData(dataToVerify, signature)) {
            logger.warn('Ugyldig datasignatur for bil-oppdatering', { id: req.params.id });
            return res.status(403).json({ message: 'Ugyldig datasignatur' });
          }
        }
        
        // Find the car before updating to get previous state
        logger.info('Henter eksisterende bil...');
        const existingCar = await Car.findById(req.params.id);
        if (!existingCar) {
            logger.warn(`Bil med ID ${req.params.id} ikke funnet`);
            return res.status(404).json({ message: 'Car not found' });
        }
        logger.info('Eksisterende bil funnet:', {
            carNumber: existingCar.carNumber,
            registrationNumber: existingCar.registrationNumber
        });
        
        logger.info('Oppdaterer bil...');
        const updatedCar = await Car.findByIdAndUpdate(
            req.params.id, 
            updateData,
            { new: true, runValidators: true, session }
        );
        
        logger.info('Bil oppdatert:', {
            carNumber: updatedCar.carNumber,
            registrationNumber: updatedCar.registrationNumber
        });
        
        // Create activity log entry
        logger.info('Oppretter aktivitetslogg for biloppdatering...');
        const activityLog = new ActivityLog({
            action: 'car_updated',
            carId: updatedCar._id,
            carNumber: updatedCar.carNumber,
            registrationNumber: updatedCar.registrationNumber,
            previousDriver: existingCar.driver,
            newDriver: updatedCar.driver,
            note: `Bilnr endret fra ${existingCar.carNumber} til ${updatedCar.carNumber}, Regnr endret fra ${existingCar.registrationNumber} til ${updatedCar.registrationNumber}`,
            userId: userId || 'system',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || ''
        });
        
        await activityLog.save({ session });
        logger.info('Aktivitetslogg lagret');
        
        // Commit transaksjonen
        await session.commitTransaction();
        session.endSession();
        
        res.json(updatedCar);
    } catch (err) {
        // Noe gikk galt, rull tilbake hele transaksjonen
        await session.abortTransaction();
        session.endSession();
        
        logger.error(`PUT /api/cars/${req.params.id} FEIL:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update car driver status
app.patch('/api/cars/:id/driver', [
  check('driver').optional().trim().escape(),
  check('note').optional().trim().escape()
], async (req, res) => {
    logger.info(`PATCH /api/cars/${req.params.id}/driver: Oppdaterer sjåførstatus med data:`, JSON.stringify(req.body));
    
    // Valider input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ugyldig input for sjåførstatus:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Valider MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      logger.warn(`Ugyldig bil-ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Ugyldig ID-format' });
    }
    
    try {
        let { driver, note, userId } = req.body;
        
        // Sanitér input for å forhindre XSS
        if (driver) {
          driver = sanitizeHtml(driver, {
            allowedTags: [],
            allowedAttributes: {}
          });
        }
        
        if (note) {
          note = sanitizeHtml(note, {
            allowedTags: [],
            allowedAttributes: {}
          });
        }
        
        let update = { driver, note };
        
        // Find the car before updating to get previous state
        logger.info('Henter eksisterende bil...');
        const existingCar = await Car.findById(req.params.id);
        if (!existingCar) {
            logger.warn(`Bil med ID ${req.params.id} ikke funnet`);
            return res.status(404).json({ message: 'Car not found' });
        }
        
        logger.info('Eksisterende bil funnet:', {
            carNumber: existingCar.carNumber,
            registrationNumber: existingCar.registrationNumber,
            currentDriver: existingCar.driver,
            currentStatus: existingCar.status
        });
        
        // If driver field is not empty, set status to 'inuse' and update registration time
        if (driver && driver.trim() !== '') {
            update.status = 'inuse';
            update.registrationTime = new Date();
            logger.info('Oppdaterer status til "inuse" med sjåfør:', driver);
        } else if (note && (note.toLowerCase().includes('vedlikehold') || note.toLowerCase().includes('ødelagt'))) {
            // If note includes maintenance keywords, set status to 'maintenance'
            update.status = 'maintenance';
            update.registrationTime = null;
            logger.info('Oppdaterer status til "maintenance" basert på notat');
        } else {
            // Otherwise, set to available
            update.status = 'available';
            update.registrationTime = null;
            logger.info('Oppdaterer status til "available"');
        }
        
        logger.info('Oppdaterer bil med:', update);
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
                logger.info('Aktivitet: Sjåfør tildelt');
            } else if (updatedCar.status === 'available' && existingCar.status === 'inuse') {
                action = 'driver_removed';
                logger.info('Aktivitet: Sjåfør fjernet');
            } else if (updatedCar.status === 'maintenance') {
                action = 'maintenance_set';
                logger.info('Aktivitet: Satt til vedlikehold');
            } else if (existingCar.status === 'maintenance') {
                action = 'maintenance_cleared';
                logger.info('Aktivitet: Fjernet fra vedlikehold');
            }
        } else if (existingCar.driver !== updatedCar.driver) {
            action = updatedCar.driver ? 'driver_assigned' : 'driver_removed';
            logger.info(`Aktivitet: ${updatedCar.driver ? 'Sjåfør tildelt' : 'Sjåfør fjernet'}`);
        } else {
            action = 'car_updated';
            logger.info('Aktivitet: Bil oppdatert');
        }
        
        logger.info('Oppretter aktivitetslogg...');
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
        logger.info('Aktivitetslogg lagret');
        
        res.json(updatedCar);
    } catch (err) {
        logger.error(`PATCH /api/cars/${req.params.id}/driver FEIL:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Set car to maintenance
app.patch('/api/cars/:id/maintenance', [
  check('note').optional().trim().escape()
], async (req, res) => {
    logger.info(`PATCH /api/cars/${req.params.id}/maintenance: Setter bil til vedlikehold med data:`, JSON.stringify(req.body));
    
    // Valider input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ugyldig input for vedlikeholdsstatus:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Valider MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      logger.warn(`Ugyldig bil-ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Ugyldig ID-format' });
    }
    
    try {
        let { note, userId } = req.body;
        
        // Sanitér input for å forhindre XSS
        if (note) {
          note = sanitizeHtml(note, {
            allowedTags: [],
            allowedAttributes: {}
          });
        }
        
        // Find the car before updating to get previous state
        logger.info('Henter eksisterende bil...');
        const existingCar = await Car.findById(req.params.id);
        if (!existingCar) {
            logger.warn(`Bil med ID ${req.params.id} ikke funnet`);
            return res.status(404).json({ message: 'Car not found' });
        }
        
        logger.info('Eksisterende bil funnet:', {
            carNumber: existingCar.carNumber,
            registrationNumber: existingCar.registrationNumber,
            currentStatus: existingCar.status
        });
        
        logger.info('Oppdaterer til vedlikeholdsstatus...');
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
        logger.info('Oppretter aktivitetslogg for vedlikehold...');
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
        logger.info('Aktivitetslogg lagret');
        
        res.json(updatedCar);
    } catch (err) {
        logger.error(`PATCH /api/cars/${req.params.id}/maintenance FEIL:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// End all trips - set all cars to available
app.patch('/api/cars/end-all-trips', async (req, res) => {
    logger.info('PATCH /api/cars/end-all-trips: Avslutter alle turer...');
    
    // Start en database-sesjon for transaksjoner
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { userId } = req.body;
        
        // Find all cars currently in use before updating
        logger.info('Henter alle biler i bruk...');
        const carsInUse = await Car.find({ status: 'inuse' });
        logger.info(`Fant ${carsInUse.length} biler i bruk`);
        
        // Logg hvis det er en stor operasjon (mange biler påvirket)
        if (carsInUse.length > 10) {
          logger.warn({
            message: `Stor database-operasjon: end-all-trips`,
            count: carsInUse.length
          });
        }
        
        logger.info('Oppdaterer alle biler i bruk til tilgjengelig...');
        const result = await Car.updateMany(
            { status: 'inuse' },
            { 
                status: 'available', 
                driver: '', 
                registrationTime: null 
            },
            { session }
        );
        
        logger.info(`Oppdatert ${result.nModified || result.modifiedCount} biler`);
        
        // Create activity log entries for each car
        if (carsInUse.length > 0) {
            logger.info('Oppretter aktivitetslogger for alle avsluttede turer...');
            const activityLogs = carsInUse.map(car => ({
                action: 'driver_removed',
                carId: car._id,
                carNumber: car.carNumber,
                registrationNumber: car.registrationNumber,
                previousDriver: car.driver,
                newDriver: '',
                note: 'Masseavslutning av turer',
                userId: userId || 'system',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] || ''
            }));
            
            await ActivityLog.insertMany(activityLogs, { session });
            logger.info(`${activityLogs.length} aktivitetslogger lagret`);
        }
        
        // Commit transaksjonen
        await session.commitTransaction();
        session.endSession();
        
        res.json({ 
            message: 'All trips ended successfully',
            carsUpdated: result.nModified || result.modifiedCount // handle different MongoDB driver versions
        });
    } catch (err) {
        // Noe gikk galt, rull tilbake hele transaksjonen
        await session.abortTransaction();
        session.endSession();
        
        logger.error('PATCH /api/cars/end-all-trips FEIL:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Export activity logs as CSV
app.get('/api/activity-logs/export', [
  check('carId').optional().isMongoId().withMessage('Ugyldig bil-ID format'),
  check('startDate').optional().isISO8601().withMessage('Ugyldig startdato format'),
  check('endDate').optional().isISO8601().withMessage('Ugyldig sluttdato format'),
  check('action').optional().isIn([
    'driver_assigned', 'driver_removed', 'maintenance_set', 
    'maintenance_cleared', 'car_added', 'car_updated', 'car_deleted'
  ]).withMessage('Ugyldig handlingstype')
], async (req, res) => {
    logger.info('GET /api/activity-logs/export: Eksporterer aktivitetslogger til CSV...');
    
    // Valider input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Ugyldig input for CSV-eksport:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const { carId, startDate, endDate, action } = req.query;
        
        const query = {};
        
        if (carId) {
            // Valider MongoDB ObjectId format
            if (!mongoose.Types.ObjectId.isValid(carId)) {
              logger.warn(`Ugyldig carId format: ${carId}`);
              return res.status(400).json({ message: 'Ugyldig bil-ID format' });
            }
            
            query.carId = carId;
            logger.info(`Filtrerer på bilID: ${carId}`);
        }
        
        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
            logger.info(`Filtrerer på tidsperiode: ${startDate} til ${endDate}`);
        } else if (startDate) {
            query.timestamp = { $gte: new Date(startDate) };
            logger.info(`Filtrerer på tid fra: ${startDate}`);
        } else if (endDate) {
            query.timestamp = { $lte: new Date(endDate) };
            logger.info(`Filtrerer på tid til: ${endDate}`);
        }
        
        if (action) {
            query.action = action;
            logger.info(`Filtrerer på action: ${action}`);
        }
        
        logger.info('Endelig spørring:', JSON.stringify(query));
        
        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .exec();
            
        logger.info(`Fant ${logs.length} logginnslag for CSV-eksport`);
            
        // Convert to CSV
        logger.info('Konverterer data til CSV-format...');
        const headers = [
            'Tidspunkt',
            'Handling',
            'Bil Nr',
            'Registreringsnr',
            'Tidligere Sjåfør',
            'Ny Sjåfør',
            'Notat',
            'Bruker',
            'IP-adresse' // Ny kolonne for sikkerhetssporing
        ];
        
        const actionMap = {
            'driver_assigned': 'Sjåfør tildelt',
            'driver_removed': 'Sjåfør fjernet',
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
        
        logger.info('CSV generert, sender respons...');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv;charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=aktivitetslogg_${new Date().toISOString().split('T')[0]}.csv`);
        
        // Send CSV response
        res.send(csvContent);
    } catch (err) {
        logger.error('GET /api/activity-logs/export FEIL:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete car
app.delete('/api/cars/:id', async (req, res) => {
    logger.info(`DELETE /api/cars/${req.params.id}: Sletter bil...`);
    
    // Valider MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      logger.warn(`Ugyldig bil-ID format: ${req.params.id}`);
      return res.status(400).json({ message: 'Ugyldig ID-format' });
    }
    
    // Start en database-sesjon for transaksjoner
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const { userId } = req.body;
        
        logger.info('Henter og sletter bil...');
        const deletedCar = await Car.findByIdAndDelete(req.params.id, { session });
        if (!deletedCar) {
            logger.warn(`Bil med ID ${req.params.id} ikke funnet`);
            return res.status(404).json({ message: 'Car not found' });
        }
        
        logger.info(`Bil slettet: ${deletedCar.carNumber}, ${deletedCar.registrationNumber}`);
        
        // Create activity log entry
        logger.info('Oppretter aktivitetslogg for slettet bil...');
        const activityLog = new ActivityLog({
            action: 'car_deleted',
            carId: deletedCar._id,
            carNumber: deletedCar.carNumber,
            registrationNumber: deletedCar.registrationNumber,
            previousDriver: deletedCar.driver,
            newDriver: null,
            note: `Bil slettet fra systemet`,
            userId: userId || 'system',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || ''
        });
        
        await activityLog.save({ session });
        logger.info('Aktivitetslogg lagret');
        
        // Commit transaksjonen
        await session.commitTransaction();
        session.endSession();
        
        res.json({ message: 'Car deleted successfully' });
    } catch (err) {
        // Noe gikk galt, rull tilbake hele transaksjonen
        await session.abortTransaction();
        session.endSession();
        
        logger.error(`DELETE /api/cars/${req.params.id} FEIL:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Seed initial data if needed
app.post('/api/seed', async (req, res) => {
    logger.info('POST /api/seed: Legger inn testdata...');
    
    // Start en database-sesjon for transaksjoner
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        // Clear existing data
        logger.info('Sletter eksisterende data...');
        await Car.deleteMany({}, { session });
        logger.info('Eksisterende data slettet');
        
        // Initial car data
        logger.info('Forbereder testdata...');
        const cars = [
            { carNumber: 39, registrationNumber: 'AB12345', phoneNumber: '480 12 345', driver: 'Ola Nordmann', note: '', registrationTime: new Date('2025-03-22T08:15:00'), status: 'inuse' },
            { carNumber: 40, registrationNumber: 'CD67890', phoneNumber: '480 23 456', driver: 'Kari Nordmann', note: 'Verksted 3.3.15', registrationTime: new Date('2025-03-21T14:30:00'), status: 'inuse' },
            { carNumber: 41, registrationNumber: 'EF12345', phoneNumber: '480 34 567', driver: '', note: '', registrationTime: null, status: 'available' },
            { carNumber: 42, registrationNumber: 'GH67890', phoneNumber: '480 45 678', driver: 'Per Hansen', note: '', registrationTime: new Date('2025-03-22T09:45:00'), status: 'inuse' },
            { carNumber: 43, registrationNumber: 'IJ12345', phoneNumber: '480 56 789', driver: '', note: 'Ødelagt bremsesystem', registrationTime: null, status: 'maintenance' },
            { carNumber: 44, registrationNumber: 'KL67890', phoneNumber: '480 67 890', driver: 'Lisa Andersen', note: '', registrationTime: new Date('2025-03-22T10:20:00'), status: 'inuse' },
            { carNumber: 45, registrationNumber: 'MN12345', phoneNumber: '480 78 901', driver: '', note: '', registrationTime: null, status: 'available' },
        ];
        
        logger.info(`Legger inn ${cars.length} testbiler...`);
        await Car.insertMany(cars, { session });
        logger.info('Testdata lagt inn');
        
        // Commit transaksjonen
        await session.commitTransaction();
        session.endSession();
        
        res.status(201).json({ message: 'Database seeded successfully' });
    } catch (err) {
        // Noe gikk galt, rull tilbake hele transaksjonen
        await session.abortTransaction();
        session.endSession();
        
        logger.error('POST /api/seed FEIL:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Global error handler for ubehandlede feil
app.use((err, req, res, next) => {
  logger.error({
    message: 'Ubehandlet feil oppstod',
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
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    logger.info(`Server kjører på port ${PORT}`);
    logger.info(`API tilgjengelig på http://localhost:${PORT}/api/`);
});