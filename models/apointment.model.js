const mongoose = require('mongoose');

const apointmentSchema = new mongoose.Schema({

  patientId: {
    type: String,
    ref: 'Patient',
  },
  bloodPresure: {
    type: String,
  },
  respiratory_rate: {
    type: String,
  },
  pulse_rate: {
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
  o2_saturation: {
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