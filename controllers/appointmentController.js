const Appointment = require('../models/Appointment');
const CounselorProfile = require('../models/CounselorProfile');
const User = require('../models/User');
const nodemailer = require('nodemailer');

exports.bookAppointment = async (req, res) => {
  const { counselorId, date, time, sessionType } = req.body;
  try {
    const profile = await CounselorProfile.findOne({ userId: counselorId });
    if (!profile) return res.status(404).json({ message: 'Counselor profile not found' });

    const slot = profile.availableSlots.find(s => s.date === date && s.time === time);
    if (!slot) return res.status(400).json({ message: 'Selected slot is not available' });
    if (slot.isBooked) return res.status(409).json({ message: 'This slot has just been booked by someone else. Please pick another.' });

    slot.isBooked = true;
    await profile.save();

    const appointment = await Appointment.create({
      clientId: req.user.id,
      counselorId,
      date,
      time,
      sessionType
    });

    res.status(201).json(appointment);

    sendBookingEmails(req.user.id, counselorId, date, time, sessionType).catch(emailErr => {
      console.error('Failed to send confirmation email:', emailErr.message);
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

async function sendBookingEmails(clientId, counselorId, date, time, sessionType) {
  const client = await User.findById(clientId);
  const counselor = await User.findById(counselorId);

  if (!client || !counselor) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"MindBridge Counseling" <${process.env.EMAIL_USER}>`,
    to: client.email,
    subject: 'Appointment Booking Confirmation - MindBridge',
    html: `
      <h3>Booking Confirmed!</h3>
      <p>Hello <strong>${client.name}</strong>,</p>
      <p>Your appointment with <strong>${counselor.name}</strong> has been successfully booked.</p>
      <ul>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Session Type:</strong> ${sessionType || 'Online'}</li>
      </ul>
      <p>Thank you for choosing MindBridge.</p>
    `,
  });


  await transporter.sendMail({
    from: `"MindBridge Counseling" <${process.env.EMAIL_USER}>`,
    to: counselor.email,
    subject: 'New Appointment Booking - MindBridge',
    html: `
      <h3>New Booking Alert</h3>
      <p>Hello <strong>${counselor.name}</strong>,</p>
      <p>You have a new booking from <strong>${client.name}</strong>.</p>
      <ul>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Session Type:</strong> ${sessionType || 'Online'}</li>
      </ul>
    `,
  });
}

exports.getMyAppointments = async (req, res) => {
  try {
    const filter = req.user.role === 'client'
      ? { clientId: req.user.id }
      : { counselorId: req.user.id };

    const appointments = await Appointment.find(filter)
      .populate('clientId', 'name email')
      .populate('counselorId', 'name email')
      .sort('-createdAt');

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const { status } = req.body;
    const userId = req.user.id.toString();
    const isCounselor = appointment.counselorId.toString() === userId;
    const isClient = appointment.clientId.toString() === userId;

    if (!isCounselor && !isClient) {
      return res.status(403).json({ message: 'Not authorized for this appointment' });
    }

    if ((status === 'confirmed' || status === 'completed') && !isCounselor) {
      return res.status(403).json({ message: 'Only the counselor can do that' });
    }

    if (status === 'cancelled' && appointment.status !== 'cancelled') {
      const profile = await CounselorProfile.findOne({ userId: appointment.counselorId });
      if (profile) {
        const slot = profile.availableSlots.find(s => s.date === appointment.date && s.time === appointment.time);
        if (slot) {
          slot.isBooked = false;
          await profile.save();
        }
      }
    }

    appointment.status = status;
    await appointment.save();
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};