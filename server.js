// server.js - Node.js backend for Bilsjåfør Registrering
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');

console.log('Starter server-applikasjon...');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
console.log('Setter opp middleware...');
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client/build')));
console.log('Middleware oppsett fullført');

// Connect to MongoDB (replace with your actual connection string)
console.log('Prøver å koble til MongoDB...');
mongoose.connect('mongodb://localhost:27017/bilregister', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB tilkoblet suksessfullt!'))
.catch(err => console.log('MongoDB tilkoblingsfeil:', err));

// Create Mongoose schemas and models
console.log('Definerer database-skjemaer...');
const carSchema = new mongoose.Schema({
    carNumber: { type: Number, required: true, unique: true },
    registrationNumber: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
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
    timestamp: { type: Date, default: Date.now }
});

const Car = mongoose.model('Car', carSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
console.log('Database-modeller opprettet: Car og ActivityLog');

// API Routes

// Get all cars
app.get('/api/cars', async (req, res) => {
    console.log('GET /api/cars: Henter alle biler...');
    try {
        const cars = await Car.find().sort({ carNumber: 1 });
        console.log(`GET /api/cars: Fant ${cars.length} biler`);
        res.json(cars);
    } catch (err) {
        console.error('GET /api/cars FEIL:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get activity logs
app.get('/api/activity-logs', async (req, res) => {
    console.log('GET /api/activity-logs: Henter aktivitetslogger med parametre:', req.query);
    try {
        const { carId, startDate, endDate, limit = 100, action } = req.query;
        
        const query = {};
        
        if (carId) {
            query.carId = carId;
            console.log(`Filtrerer på bilID: ${carId}`);
        }
        
        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
            console.log(`Filtrerer på tidsperiode: ${startDate} til ${endDate}`);
        } else if (startDate) {
            query.timestamp = { $gte: new Date(startDate) };
            console.log(`Filtrerer på tid fra: ${startDate}`);
        } else if (endDate) {
            query.timestamp = { $lte: new Date(endDate) };
            console.log(`Filtrerer på tid til: ${endDate}`);
        }
        
        if (action) {
            query.action = action;
            console.log(`Filtrerer på action: ${action}`);
        }
        
        console.log('Endelig spørring:', JSON.stringify(query));
        
        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .exec();
            
        console.log(`Fant ${logs.length} logginnslag`);
        res.json(logs);
    } catch (err) {
        console.error('GET /api/activity-logs FEIL:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single car
app.get('/api/cars/:id', async (req, res) => {
    console.log(`GET /api/cars/${req.params.id}: Henter spesifikk bil...`);
    try {
        const car = await Car.findById(req.params.id);
        if (!car) {
            console.log(`GET /api/cars/${req.params.id}: Bil ikke funnet`);
            return res.status(404).json({ message: 'Car not found' });
        }
        console.log(`GET /api/cars/${req.params.id}: Bil funnet:`, car.registrationNumber);
        res.json(car);
    } catch (err) {
        console.error(`GET /api/cars/${req.params.id} FEIL:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new car
app.post('/api/cars', async (req, res) => {
    console.log('POST /api/cars: Oppretter ny bil med data:', JSON.stringify(req.body));
    try {
        const { userId, ...carData } = req.body;
        const newCar = new Car(carData);
        console.log('Lagrer ny bil...');
        const savedCar = await newCar.save();
        console.log(`Bil lagret med ID: ${savedCar._id}`);
        
        // Create activity log entry
        console.log('Oppretter aktivitetslogg for ny bil...');
        const activityLog = new ActivityLog({
            action: 'car_added',
            carId: savedCar._id,
            carNumber: savedCar.carNumber,
            registrationNumber: savedCar.registrationNumber,
            previousDriver: null,
            newDriver: savedCar.driver || null,
            note: savedCar.note || '',
            userId: userId || 'system'
        });
        
        await activityLog.save();
        console.log('Aktivitetslogg lagret');
        
        res.status(201).json(savedCar);
    } catch (err) {
        console.error('POST /api/cars FEIL:', err);
        if (err.code === 11000) {
            console.log('Duplikat bilnummer eller registreringsnummer');
            return res.status(400).json({ message: 'Car number or registration number already exists' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Update car
app.put('/api/cars/:id', async (req, res) => {
    console.log(`PUT /api/cars/${req.params.id}: Oppdaterer bil med data:`, JSON.stringify(req.body));
    try {
        const { userId, ...updateData } = req.body;
        
        // Find the car before updating to get previous state
        console.log('Henter eksisterende bil...');
        const existingCar = await Car.findById(req.params.id);
        if (!existingCar) {
            console.log(`Bil med ID ${req.params.id} ikke funnet`);
            return res.status(404).json({ message: 'Car not found' });
        }
        console.log('Eksisterende bil funnet:', {
            carNumber: existingCar.carNumber,
            registrationNumber: existingCar.registrationNumber
        });
        
        console.log('Oppdaterer bil...');
        const updatedCar = await Car.findByIdAndUpdate(
            req.params.id, 
            updateData,
            { new: true, runValidators: true }
        );
        
        console.log('Bil oppdatert:', {
            carNumber: updatedCar.carNumber,
            registrationNumber: updatedCar.registrationNumber
        });
        
        // Create activity log entry
        console.log('Oppretter aktivitetslogg for biloppdatering...');
        const activityLog = new ActivityLog({
            action: 'car_updated',
            carId: updatedCar._id,
            carNumber: updatedCar.carNumber,
            registrationNumber: updatedCar.registrationNumber,
            previousDriver: existingCar.driver,
            newDriver: updatedCar.driver,
            note: `Bilnr endret fra ${existingCar.carNumber} til ${updatedCar.carNumber}, Regnr endret fra ${existingCar.registrationNumber} til ${updatedCar.registrationNumber}`,
            userId: userId || 'system'
        });
        
        await activityLog.save();
        console.log('Aktivitetslogg lagret');
        
        res.json(updatedCar);
    } catch (err) {
        console.error(`PUT /api/cars/${req.params.id} FEIL:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update car driver status
app.patch('/api/cars/:id/driver', async (req, res) => {
    console.log(`PATCH /api/cars/${req.params.id}/driver: Oppdaterer sjåførstatus med data:`, JSON.stringify(req.body));
    try {
        const { driver, note, userId } = req.body;
        let update = { driver, note };
        
        // Find the car before updating to get previous state
        console.log('Henter eksisterende bil...');
        const existingCar = await Car.findById(req.params.id);
        if (!existingCar) {
            console.log(`Bil med ID ${req.params.id} ikke funnet`);
            return res.status(404).json({ message: 'Car not found' });
        }
        
        console.log('Eksisterende bil funnet:', {
            carNumber: existingCar.carNumber,
            registrationNumber: existingCar.registrationNumber,
            currentDriver: existingCar.driver,
            currentStatus: existingCar.status
        });
        
        // If driver field is not empty, set status to 'inuse' and update registration time
        if (driver && driver.trim() !== '') {
            update.status = 'inuse';
            update.registrationTime = new Date();
            console.log('Oppdaterer status til "inuse" med sjåfør:', driver);
        } else if (note && (note.toLowerCase().includes('vedlikehold') || note.toLowerCase().includes('ødelagt'))) {
            // If note includes maintenance keywords, set status to 'maintenance'
            update.status = 'maintenance';
            update.registrationTime = null;
            console.log('Oppdaterer status til "maintenance" basert på notat');
        } else {
            // Otherwise, set to available
            update.status = 'available';
            update.registrationTime = null;
            console.log('Oppdaterer status til "available"');
        }
        
        console.log('Oppdaterer bil med:', update);
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
                console.log('Aktivitet: Sjåfør tildelt');
            } else if (updatedCar.status === 'available' && existingCar.status === 'inuse') {
                action = 'driver_removed';
                console.log('Aktivitet: Sjåfør fjernet');
            } else if (updatedCar.status === 'maintenance') {
                action = 'maintenance_set';
                console.log('Aktivitet: Satt til vedlikehold');
            } else if (existingCar.status === 'maintenance') {
                action = 'maintenance_cleared';
                console.log('Aktivitet: Fjernet fra vedlikehold');
            }
        } else if (existingCar.driver !== updatedCar.driver) {
            action = updatedCar.driver ? 'driver_assigned' : 'driver_removed';
            console.log(`Aktivitet: ${updatedCar.driver ? 'Sjåfør tildelt' : 'Sjåfør fjernet'}`);
        } else {
            action = 'car_updated';
            console.log('Aktivitet: Bil oppdatert');
        }
        
        console.log('Oppretter aktivitetslogg...');
        const activityLog = new ActivityLog({
            action,
            carId: updatedCar._id,
            carNumber: updatedCar.carNumber,
            registrationNumber: updatedCar.registrationNumber,
            previousDriver: existingCar.driver,
            newDriver: updatedCar.driver,
            note: updatedCar.note,
            userId: userId || 'system'
        });
        
        await activityLog.save();
        console.log('Aktivitetslogg lagret');
        
        res.json(updatedCar);
    } catch (err) {
        console.error(`PATCH /api/cars/${req.params.id}/driver FEIL:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Set car to maintenance
app.patch('/api/cars/:id/maintenance', async (req, res) => {
    console.log(`PATCH /api/cars/${req.params.id}/maintenance: Setter bil til vedlikehold med data:`, JSON.stringify(req.body));
    try {
        const { note, userId } = req.body;
        
        // Find the car before updating to get previous state
        console.log('Henter eksisterende bil...');
        const existingCar = await Car.findById(req.params.id);
        if (!existingCar) {
            console.log(`Bil med ID ${req.params.id} ikke funnet`);
            return res.status(404).json({ message: 'Car not found' });
        }
        
        console.log('Eksisterende bil funnet:', {
            carNumber: existingCar.carNumber,
            registrationNumber: existingCar.registrationNumber,
            currentStatus: existingCar.status
        });
        
        console.log('Oppdaterer til vedlikeholdsstatus...');
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
        console.log('Oppretter aktivitetslogg for vedlikehold...');
        const activityLog = new ActivityLog({
            action: 'maintenance_set',
            carId: updatedCar._id,
            carNumber: updatedCar.carNumber,
            registrationNumber: updatedCar.registrationNumber,
            previousDriver: existingCar.driver,
            newDriver: '',
            note: note,
            userId: userId || 'system'
        });
        
        await activityLog.save();
        console.log('Aktivitetslogg lagret');
        
        res.json(updatedCar);
    } catch (err) {
        console.error(`PATCH /api/cars/${req.params.id}/maintenance FEIL:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// End all trips - set all cars to available
app.patch('/api/cars/end-all-trips', async (req, res) => {
    console.log('PATCH /api/cars/end-all-trips: Avslutter alle turer...');
    try {
        const { userId } = req.body;
        
        // Find all cars currently in use before updating
        console.log('Henter alle biler i bruk...');
        const carsInUse = await Car.find({ status: 'inuse' });
        console.log(`Fant ${carsInUse.length} biler i bruk`);
        
        console.log('Oppdaterer alle biler i bruk til tilgjengelig...');
        const result = await Car.updateMany(
            { status: 'inuse' },
            { 
                status: 'available', 
                driver: '', 
                registrationTime: null 
            }
        );
        
        console.log(`Oppdatert ${result.nModified || result.modifiedCount} biler`);
        
        // Create activity log entries for each car
        if (carsInUse.length > 0) {
            console.log('Oppretter aktivitetslogger for alle avsluttede turer...');
            const activityLogs = carsInUse.map(car => ({
                action: 'driver_removed',
                carId: car._id,
                carNumber: car.carNumber,
                registrationNumber: car.registrationNumber,
                previousDriver: car.driver,
                newDriver: '',
                note: 'Masseavslutning av turer',
                userId: userId || 'system'
            }));
            
            await ActivityLog.insertMany(activityLogs);
            console.log(`${activityLogs.length} aktivitetslogger lagret`);
        }
        
        res.json({ 
            message: 'All trips ended successfully',
            carsUpdated: result.nModified || result.modifiedCount // handle different MongoDB driver versions
        });
    } catch (err) {
        console.error('PATCH /api/cars/end-all-trips FEIL:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Export activity logs as CSV
app.get('/api/activity-logs/export', async (req, res) => {
    console.log('GET /api/activity-logs/export: Eksporterer aktivitetslogger til CSV...');
    try {
        const { carId, startDate, endDate, action } = req.query;
        
        const query = {};
        
        if (carId) {
            query.carId = carId;
            console.log(`Filtrerer på bilID: ${carId}`);
        }
        
        if (startDate && endDate) {
            query.timestamp = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
            console.log(`Filtrerer på tidsperiode: ${startDate} til ${endDate}`);
        } else if (startDate) {
            query.timestamp = { $gte: new Date(startDate) };
            console.log(`Filtrerer på tid fra: ${startDate}`);
        } else if (endDate) {
            query.timestamp = { $lte: new Date(endDate) };
            console.log(`Filtrerer på tid til: ${endDate}`);
        }
        
        if (action) {
            query.action = action;
            console.log(`Filtrerer på action: ${action}`);
        }
        
        console.log('Endelig spørring:', JSON.stringify(query));
        
        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .exec();
            
        console.log(`Fant ${logs.length} logginnslag for CSV-eksport`);
            
        // Convert to CSV
        console.log('Konverterer data til CSV-format...');
        const headers = [
            'Tidspunkt',
            'Handling',
            'Bil Nr',
            'Registreringsnr',
            'Tidligere Sjåfør',
            'Ny Sjåfør',
            'Notat',
            'Bruker'
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
            log.userId
        ]);
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => 
                typeof cell === 'string' && cell.includes(',') 
                    ? `"${cell.replace(/"/g, '""')}"` 
                    : cell
            ).join(','))
        ].join('\n');
        
        console.log('CSV generert, sender respons...');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv;charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=aktivitetslogg_${new Date().toISOString().split('T')[0]}.csv`);
        
        // Send CSV response
        res.send(csvContent);
    } catch (err) {
        console.error('GET /api/activity-logs/export FEIL:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete car
app.delete('/api/cars/:id', async (req, res) => {
    console.log(`DELETE /api/cars/${req.params.id}: Sletter bil...`);
    try {
        const { userId } = req.body;
        
        console.log('Henter og sletter bil...');
        const deletedCar = await Car.findByIdAndDelete(req.params.id);
        if (!deletedCar) {
            console.log(`Bil med ID ${req.params.id} ikke funnet`);
            return res.status(404).json({ message: 'Car not found' });
        }
        
        console.log(`Bil slettet: ${deletedCar.carNumber}, ${deletedCar.registrationNumber}`);
        
        // Create activity log entry
        console.log('Oppretter aktivitetslogg for slettet bil...');
        const activityLog = new ActivityLog({
            action: 'car_deleted',
            carId: deletedCar._id,
            carNumber: deletedCar.carNumber,
            registrationNumber: deletedCar.registrationNumber,
            previousDriver: deletedCar.driver,
            newDriver: null,
            note: `Bil slettet fra systemet`,
            userId: userId || 'system'
        });
        
        await activityLog.save();
        console.log('Aktivitetslogg lagret');
        
        res.json({ message: 'Car deleted successfully' });
    } catch (err) {
        console.error(`DELETE /api/cars/${req.params.id} FEIL:`, err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Seed initial data if needed
app.post('/api/seed', async (req, res) => {
    console.log('POST /api/seed: Legger inn testdata...');
    try {
        // Clear existing data
        console.log('Sletter eksisterende data...');
        await Car.deleteMany({});
        console.log('Eksisterende data slettet');
        
        // Initial car data
        console.log('Forbereder testdata...');
        const cars = [
            { carNumber: 39, registrationNumber: 'AB12345', phoneNumber: '480 12 345', driver: 'Ola Nordmann', note: '', registrationTime: new Date('2025-03-22T08:15:00'), status: 'inuse' },
            { carNumber: 40, registrationNumber: 'CD67890', phoneNumber: '480 23 456', driver: 'Kari Nordmann', note: 'Verksted 3.3.15', registrationTime: new Date('2025-03-21T14:30:00'), status: 'inuse' },
            { carNumber: 41, registrationNumber: 'EF12345', phoneNumber: '480 34 567', driver: '', note: '', registrationTime: null, status: 'available' },
            { carNumber: 42, registrationNumber: 'GH67890', phoneNumber: '480 45 678', driver: 'Per Hansen', note: '', registrationTime: new Date('2025-03-22T09:45:00'), status: 'inuse' },
            { carNumber: 43, registrationNumber: 'IJ12345', phoneNumber: '480 56 789', driver: '', note: 'Ødelagt bremsesystem', registrationTime: null, status: 'maintenance' },
            { carNumber: 44, registrationNumber: 'KL67890', phoneNumber: '480 67 890', driver: 'Lisa Andersen', note: '', registrationTime: new Date('2025-03-22T10:20:00'), status: 'inuse' },
            { carNumber: 45, registrationNumber: 'MN12345', phoneNumber: '480 78 901', driver: '', note: '', registrationTime: null, status: 'available' },
        ];
        
        console.log(`Legger inn ${cars.length} testbiler...`);
        await Car.insertMany(cars);
        console.log('Testdata lagt inn');
        
        res.status(201).json({ message: 'Database seeded successfully' });
    } catch (err) {
        console.error('POST /api/seed FEIL:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server kjører på port ${PORT}`);
    console.log(`API tilgjengelig på http://localhost:${PORT}/api/`);
});