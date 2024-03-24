const mongoose = require('mongoose');

const apointmentSchema = new mongoose.Schema({
  patientId: {
    type: String,
    ref: 'Patient',
  },
  bloodPressure: {
    type: String,
  },
  respiratoryRate: {
    type: String,
  },
  pulseRate: {
    type: String,
  },
  weight: {
    type: String,
  },
  height: {
    type: String,
  },
  bmi: {
    type: String,
  },
  o2Saturation: {
    type: String,
  },
  status: {
    type: String,
    default: 'active',
  },
  apointmentDate: {
    type: Date,
  },
});

module.exports = mongoose.model('Apointment', apointmentSchema);