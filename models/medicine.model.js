const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  prescriptionId: String, 
  name: String,
  description: String,
  quantity: Number,
  essentiality: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number,
    default: 0,
  },
  availablity: {
    type: Boolean,
    default: false,
  },
  countryOfOrigin: {
    type: String,
    default: "",
  },
});

module.exports = mongoose.model("Medicine", medicineSchema);
