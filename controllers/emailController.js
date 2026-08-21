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

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'MindBridge Counseling', email: process.env.EMAIL_USER },
        to: [{ email: recipient.email, name: recipient.name }],
        replyTo: { email: sender.email, name: sender.name },
        subject: subject || `Message from ${sender.name} (MindBridge)`,
        htmlContent: `
          <p><strong>${sender.name}</strong> sent you a message regarding your session on
          ${appointment.date} at ${appointment.time}:</p>
          <blockquote style="border-left:3px solid #2C7A7B;padding-left:12px;color:#333;">${message}</blockquote>
          <p style="font-size:12px;color:#888;">Reply directly to this email to respond to ${sender.name}.</p>
        `,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Brevo API error (${response.status}): ${errText}`);
    }

    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send email', error: err.message });
  }
};