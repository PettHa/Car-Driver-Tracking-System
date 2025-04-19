// server/models/Car.js
const mongoose = require('mongoose');

// Create Mongoose schema for Car
const carSchema = new mongoose.Schema({
  carNumber: { type: Number, required: true, unique: true },
  registrationNumber: { 
    type: String, 
    required: true, 
    unique: true,
    // Validate Norwegian registration number format
    validate: {
      validator: function(v) {
        return /^[A-Z0-9 ]{2,8}$/.test(v);
      },
      message: props => `${props.value} is not a valid registration number!`
    }
  },
  phoneNumber: { 
    type: String, 
    required: true,
    // Validate phone number
    validate: {
      validator: function(v) {
        return /^[0-9+ ]{8,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  driver: { type: String, default: '' },
  note: { type: String, default: '' },
  registrationTime: { type: Date, default: null },
  status: { type: String, enum: ['available', 'inuse', 'maintenance'], default: 'available' }
});

const Car = mongoose.model('Car', carSchema);

module.exports = Car;