const mongoose = require('mongoose');

//mongodb connection
// mongoId='mongodb://localhost:27017/maldoPharma'
// const mongoId='mongodb://maldo_e_pharma:rPECSr5ZcXCETTIb..@maldopharmacy.xwvgshm.mongodb.net/?retryWrites=true&w=majority';
const mongoId='mongodb+srv://maldo_e_pharma:rPECSr5ZcXCETTIb..@maldopharmacy.xwvgshm.mongodb.net/?retryWrites=true&w=majority&appName=maldoPharmacy';
// const mongoId='mongodb+srv://johnlemma9:GraceArgens1..@digitalmarketing.ieftbiv.mongodb.net/?retryWrites=true&w=majority';
// const mongoId='mongodb+srv://johnlemma9:GraceArgens1..@digitalmarketing.ieftbiv.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(mongoId, {
});

module.exports = mongoose;
