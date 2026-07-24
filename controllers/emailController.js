const nodemailer = require('nodemailer');
const Appointment = require('../models/Appointment');
const { isAuthorizedForAppointment } = require('./chatController');

exports.sendEmail = async (req, res) => {
  try {
    const { appointmentId, subject, message } = req.body;
    if (!appointmentId || !message) {
      return res.status(400).json({ message: 'appointmentId and message are required' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('clientId', 'name email')
      .populate('counselorId', 'name email');

    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (!isAuthorizedForAppointment(appointment, req.user.id)) {
      return res.status(403).json({ message: 'Not authorized for this appointment' });
    }

    const isSenderClient = appointment.clientId._id.toString() === req.user.id.toString();
    const sender = isSenderClient ? appointment.clientId : appointment.counselorId;
    const recipient = isSenderClient ? appointment.counselorId : appointment.clientId;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"MindBridge Counseling" <${process.env.EMAIL_USER}>`,
      to: recipient.email,
      replyTo: sender.email,
      subject: subject || `Message from ${sender.name} (MindBridge)`,
      html: `
        <p><strong>${sender.name}</strong> sent you a message regarding your session on
        ${appointment.date} at ${appointment.time}:</p>
        <blockquote style="border-left:3px solid #2C7A7B;padding-left:12px;color:#333;">${message}</blockquote>
        <p style="font-size:12px;color:#888;">Reply directly to this email to respond to ${sender.name}.</p>
      `,
    });

    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
};