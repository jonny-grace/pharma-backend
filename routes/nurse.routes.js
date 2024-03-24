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
// Middleware to verify the JWT token
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

// get a single patient data from patient table using patient id from req.params.id
router.get("/patient/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const patient = await patientModel.findOne({ patientId: id });
    if (!patient) {
      return res.status(404).json({
        message: "Patient not found",
      });
    }
    // here before sending the response lets check if the patient have a today active appointment with patientId and current date
    const today = new Date();
    const date =
      today.getFullYear() +
      "-" +
      (today.getMonth() + 1) +
      "-" +
      today.getDate();
    const apointment = await apointmentModel.findOne({
      patientId: id,
      apointmentDate: date,
      status: "active",
    });

    // i if the appointment is found i want to send the patient data with a message say active appointment
    if (apointment) {
      return res.status(404).json({
        message: "Patient have a today active appointment",
      });
    }
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// create an appointment for the patient by getting the patient id from req.params and some datas from the req.body blood presure and weight and create appointment for the patient with this data and todays date
router.post("/patient/:id/appointment", async (req, res) => {
  try {
    const id = req.params.id;
    const {
      bloodPressure,
      temperature,
      respiratoryRate,
      pulseRate,
      weight,
      height,
      bmi,
      o2Saturation,
    } = req.body;

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
      bloodPressure,
      temperature,
      respiratoryRate,
      pulseRate,
      weight,
      height,
      bmi,
      o2Saturation,
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
router.get("/patient/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const apointment = await apointmentModel.findOne({ _id: id });
    const patientId = apointment.patientId;
    const doctorId = apointment.doctorId;
    const patient = await patientModel.findOne(
      { patientId },
      { firstname: 1, lastname: 1, age: 1, patientId: 1 }
    );
    const doctor = await doctorModel.findOne(
      { userId: doctorId },
      { firstname: 1, lastname: 1, speciality: 1 }
    );

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    if (!doctor) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const apointmentData = {
      patient,
      doctor,
    };
    res.json(apointmentData);
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
