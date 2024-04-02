const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const userModel = require("../models/user.model");
const doctorModel = require("../models/doctor.model");
const pharmacyModel = require("../models/pharmacy.model");
const patientModel = require("../models/patient.model");
const apointmentModel = require("../models/apointment.model");
const { default: mongoose } = require("mongoose");
const prescriptionModel = require("../models/prescription.model");
const medicineModel = require("../models/medicine.model");
const pharmaModel = require("../models/pharma.model");
const { getIO } = require("../utils/io");
const io = getIO();
const secretKey = "your_secret_key";
// Middleware to verify the JWT toke
const verifyToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), "secretkey");
    req.user = decoded;
    res.send(req.user);
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};



// create an appointment for the patient by getting the patient id from req.params and some datas from the req.body blood presure and weight and create appointment for the patient with this data and todays date
router.post("/patient/:id/appointment", async (req, res) => {
  try {
    const id = req.params.id;
    const {
      bloodPresure,
      bmi,
      height,
      o2_saturation,
      pulse_rate,
      respiratory_rate,
      weight,
      
     
      
    } = req.body;
console.log(req.body);
    const today = new Date();
    const date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();

    // here before sending the response lets check if the patient have a today active appointment with patientId and current date
    const ActiveApointment = await apointmentModel.findOne({
      patientId: id,
      apointmentDate: date,
      status: "active",
    });
    if (ActiveApointment) {
      return res.status(404).json({
        message: "Patient have a today active appointment",
      });
    }
    const apointment = new apointmentModel({
      patientId: id,
      bloodPresure,
      respiratory_rate,
      pulse_rate,
      weight,
      height,
      bmi,
      o2_saturation,
      apointmentDate: date,
    });

    await apointment.save();
    console.log('apointment',apointment)
    res.json({ message: "apointment created successfully",apointment:apointment });


  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}); 

// Get single Patient
router.get("/patient/prescription/:id", async (req, res) => {
  const id = req.params.id;
  const modifiedId = new RegExp(id, "i");
  console.log(modifiedId); 
  try{ 
    const prescription = await prescriptionModel.find({ patientId: modifiedId });
   
    console.log(prescription);
    if (!prescription) {
      console.log("prescription not found");
      return res.status(404).json({
        message: "prescription not found",
      });

      
    }
    res.json({ prescription });
    // here before sending the response lets check if the patient have a today active
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
//get a medicine list for the given prescription id
router.get("/patient/prescription/:id/medicine", async (req, res) => {
  const prescriptionId = req.params.id;
 
  try {
    const medicines = await medicineModel.find({ prescriptionId });
    const prescription = await prescriptionModel.findById(prescriptionId);
   
    console.log(prescription);
    if (!medicines) {
      console.log("medicines not found");
      return res.status(404).json({
        message: "medicines not found",
      });
    }
    res.json({ medicines,prescription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/create/prescription", async (req, res) => {
  try {
    const {
      patientId,
      pfirstname,
      plastname,
      dfirstname,
      dlastname,
      patientAge,
      doctorId,
      medicines,
      apointmentId,
    } = req.body;

    // Concatenate patient full name
    const patientFullName = pfirstname + " " + plastname;

    // lets find the doctor image from doctor table using doctorId
    const doctor = await doctorModel.findOne({ userId: doctorId });
    const doctorImage = doctor.image;
    // Concatenate doctor full name
    const doctorFullName = dfirstname + " " + dlastname;

    // Get the current time
    const currentTime = new Date();

    // Calculate the end time (current time + 10 minutes)
    const endTime = new Date(currentTime.getTime() + 5 * 60000);
    // Create a new Prescription instance

    // Create a new Prescription instance
    const prescription = new prescriptionModel({
      apointmentId,
      patientId,
      patientFullName,
      doctorFullName,
      doctorImage,
      patientAge,
      status: "assigned",
      currentTime,
      endTime,
      timerStatus: "active",
    });

    // Save the prescription to the database
    await prescription.save();
    console.log("prescription", prescription);
    // Calculate the remaining time in milliseconds
    const remainingTime = endTime.getTime() - currentTime.getTime();

    // Set the timeout for the prescription
    const timer = setTimeout(async () => {
      // Update the prescription's timerStatus to "deactivate"
      const timers = await prescriptionModel.findByIdAndUpdate(
        prescription._id,
        {
          timerStatus: "deactivate",
        }
      );

      console.log("end time");

      // Emit a socket event indicating that the time is up
      // Make sure you have access to the socket object here
      io.emit("timerFinished", { prescriptionId: prescription._id });
    }, 4 * 60 * 1000);

    // Save the timeout reference in the prescription object for future use (e.g., to clear the timeout)
    prescription.timer = timer;

    // Create an array to store the medicine IDs
    const medicineIds = [];

    // Loop through the medicines array and save each medicine to the Medicine table
    for (const medicine of medicines) {
      const { name, description } = medicine;

      // Create a new Medicine instance
      const medicineObj = new medicineModel({
        prescriptionId: prescription._id, // Set the prescription ID
        name,
        description,
      });

      // Save the medicine to the database
      await medicineObj.save();
    }

    await patientModel.updateOne(
      { patientId: patientId },
      { healed: true, apointment_active: true }
    );
    console.log("prescriptionnnnnnnnnnn", prescription);
    res.json({
      message: "Prescription created successfully",
      prescription: prescription,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all prescriptions
router.get("/prescription", async (req, res) => {
  try {
    const prescriptions = await prescriptionModel.find();
    console.log("prescriptions", prescriptions);
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/prescriptions", async (req, res) => {
    try {
      const prescriptions = await prescriptionModel.find();
      // Create an array to store the updated prescriptions with medicines
      const updatedPrescriptions = [];
  
      // Loop through each prescription
      for (const prescription of prescriptions) {
        // Get the prescription ID
        const prescriptionId = prescription._id;
  
        // Find the medicines associated with the prescription using the prescriptionId
        const medicines = await medicineModel.find({ prescriptionId });
  
        // Create an array to store the medicine details
        const medicineDetails = [];
  
        // Loop through each medicine
        for (const medicine of medicines) {
          // Extract the relevant medicine details
          const { name, description, price, availablity } = medicine;
          // Add the medicine details to the medicineDetails array
          medicineDetails.push({ name, description, price, availablity });
        }
  
        // Create a new object with the prescription data and the medicine details
        const updatedPrescription = {
          PID: prescription.patientId,
          prescriptionId: prescription._id,
          patientName: prescription.patientFullName,
          doctorName: prescription.doctorFullName,
          age: prescription.patientAge,
          medicines: medicineDetails,
          pharmacy: prescription.pharmacyName,
          status: prescription.status,
          counter: prescription.responseCounter,
          timerStatus:prescription.timerStatus,
        };
  
        // Push the updated prescription object to the array
        updatedPrescriptions.push(updatedPrescription);
      }
  
      res.json(updatedPrescriptions);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
async function authenticateDoctor(req, res, next) {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, secretKey);

    // Check if the decoded email belongs to a user with the admin role
    const username = decoded.username;
    const user = await userModel.findOne({ username });
    if (!user || user.role !== "doctor") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error(error);
    return res.status(403).json({ message: "Forbidden" });
  }
}

// here lets create a route for changing a password it will gone recienve old password doctorId and new password and do the change password for the doctor in users table
router.post("/changepassword", async (req, res) => {
  try {
    const data = req.body;
    const { doctorId, oldPassword, newPassword } = data;
    const user = await userModel.findOne({ _id: doctorId });
    const validPassword = bcrypt.compare(oldPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updatedUser = await userModel.findByIdAndUpdate(
      { _id: doctorId },
      { password: hashedPassword },
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// lets create a route called /getdoctorname which takes a doctorId as a parameter and gets the doctor name from doctors table
router.get("/getdoctorname/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id); // Use req.params.id to get the id from the request
    const doctor = await doctorModel.findOne({ userId: id }); // Use id instead of modifiedId
    res.json(doctor); // Return the doctor object instead of the id
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post("/logout", verifyToken, (req, res) => {
  res.json({ message: "Logout successful" });
});
module.exports = router;
