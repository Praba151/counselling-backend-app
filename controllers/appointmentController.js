const Appointment = require('../models/Appointment');
const CounselorProfile = require('../models/CounselorProfile');
const Payment = require('../models/Payment');
const User = require('../models/User');
const razorpay = require('../config/razorpay');
const { sendEmail } = require('../utils/mailer');


const FULL_REFUND_HOURS = 0;

exports.bookAppointment = async (req, res) => {
  const { counselorId, date, time, sessionType } = req.body;
  try {
    const profile = await CounselorProfile.findOne({ userId: counselorId });
    if (!profile) return res.status(404).json({ message: 'Counselor profile not found' });

    const slot = profile.availableSlots.find(s => s.date === date && s.time === time);
    if (!slot || slot.isBlocked) return res.status(400).json({ message: 'Selected slot is not available' });


    const locked = await CounselorProfile.findOneAndUpdate(
      {
        userId: counselorId,
        availableSlots: { $elemMatch: { date, time, isBooked: false, isBlocked: { $ne: true } } },
      },
      { $set: { 'availableSlots.$.isBooked': true } }
    );
    if (!locked) return res.status(409).json({ message: 'This slot has just been booked by someone else. Please pick another.' });

    const appointment = await Appointment.create({
      clientId: req.user.id,
      counselorId,
      date,
      time,
      sessionType
    });

    res.status(201).json(appointment);

    sendBookingEmails(req.user.id, counselorId, date, time, sessionType).catch(emailErr => {
      console.error('Failed to send booking emails:', emailErr.message);
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

async function sendBookingEmails(clientId, counselorId, date, time, sessionType) {
  const client = await User.findById(clientId);
  const counselor = await User.findById(counselorId);

  if (!client || !counselor) return;

  await sendEmail({
    toEmail: client.email,
    toName: client.name,
    subject: 'Booking Request Received - Counselling',
    html: `
      <h3>Booking Initiated!</h3>
      <p>Hello <strong>${client.name}</strong>,</p>
      <p>Your appointment with <strong>${counselor.name}</strong> has been successfully initiated.</p>
      <ul>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
        <li><strong>Session Type:</strong> ${sessionType || 'Online'}</li>
      </ul>
      <p>Thank you for choosing MindBridge.</p>
    `,
  });

  await sendEmail({
    toEmail: counselor.email,
    toName: counselor.name,
    subject: 'New Appointment Booking - Counselling ',
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


const sessionStartTime = (appointment) => {
  const d = new Date(`${appointment.date}T${appointment.time}:00+05:30`);
  return isNaN(d.getTime()) ? null : d;
};

const isFullRefund = (appointment, cancelledBy) => {
  if (cancelledBy === 'counselor') return true;
  const start = sessionStartTime(appointment);
  if (!start) return true; 
  const hoursLeft = (start.getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursLeft >= FULL_REFUND_HOURS;
};

async function sendCancelEmails(appointment, cancelledBy, refundMessage) {
  const client = await User.findById(appointment.clientId);
  const counselor = await User.findById(appointment.counselorId);
  if (!client || !counselor) return;

  const who = cancelledBy === 'counselor' ? counselor.name : client.name;
  const details = `
    <ul>
      <li><strong>Date:</strong> ${appointment.date}</li>
      <li><strong>Time:</strong> ${appointment.time}</li>
      <li><strong>Session Type:</strong> ${appointment.sessionType}</li>
    </ul>`;

  await sendEmail({
    toEmail: client.email, toName: client.name,
    subject: 'Appointment Cancelled - Counselling',
    html: `<h3>Appointment Cancelled</h3><p>Hello <strong>${client.name}</strong>, your session with <strong>${counselor.name}</strong> was cancelled by <strong>${who}</strong>.</p>${details}<p>${refundMessage}</p>`,
  });
  await sendEmail({
    toEmail: counselor.email, toName: counselor.name,
    subject: 'Appointment Cancelled - Counselling',
    html: `<h3>Appointment Cancelled</h3><p>Hello <strong>${counselor.name}</strong>, the session with <strong>${client.name}</strong> was cancelled by <strong>${who}</strong>. The time slot is open again.</p>${details}`,
  });
}

exports.updateStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const { status } = req.body;
    if (!['confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const userId = req.user.id.toString();
    const isCounselor = appointment.counselorId.toString() === userId;
    const isClient = appointment.clientId.toString() === userId;

    if (!isCounselor && !isClient) {
      return res.status(403).json({ message: 'Not authorized for this appointment' });
    }

    if ((status === 'confirmed' || status === 'completed') && !isCounselor) {
      return res.status(403).json({ message: 'Only the counselor can do that' });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'This appointment is already cancelled' });
    }

  
    let refundMessage = '';
    if (status === 'cancelled') {
      if (appointment.status === 'completed') {
        return res.status(400).json({ message: 'A completed session cannot be cancelled' });
      }

      const cancelledBy = isCounselor ? 'counselor' : 'client';

      if (appointment.paymentStatus === 'paid') {
        if (isFullRefund(appointment, cancelledBy)) {
          const payment = await Payment.findOne({ appointmentId: appointment._id, status: 'paid' });
          
          if (payment && payment.razorpayPaymentId && payment.razorpayPaymentId.startsWith('pay_')) {
            try {
              await razorpay.payments.refund(payment.razorpayPaymentId, {
                amount: Math.round(payment.amount * 100),
                notes: { appointmentId: appointment._id.toString(), cancelledBy },
              });
              payment.status = 'refunded';
              await payment.save();
              appointment.paymentStatus = 'refunded';
              appointment.refundStatus = 'refunded';
              appointment.refundAmount = payment.amount;
              refundMessage = `A full refund of ₹${payment.amount} has been started.`;
            } catch (refundErr) {
              console.error('Razorpay API error:', refundErr?.error?.description || refundErr.message);
              appointment.refundStatus = 'manual';
              refundMessage = 'Session cancelled. Automated refund failed, so the refund will be handled manually.';
            }
          } else {
            appointment.refundStatus = 'manual';
            refundMessage = 'Session cancelled. Payment record was manual or test data.';
          }
        } else {
          appointment.refundStatus = 'not_eligible';
          refundMessage = `This session starts in less than ${FULL_REFUND_HOURS} hours, so it is not eligible for a refund.`;
        }
      }

    
      const profile = await CounselorProfile.findOne({ userId: appointment.counselorId });
      if (profile) {
        const slot = profile.availableSlots.find(s => s.date === appointment.date && s.time === appointment.time);
        if (slot) {
          slot.isBooked = false;
          await profile.save();
        }
      }

      appointment.cancelledBy = cancelledBy;
      appointment.cancelledAt = new Date();

      sendCancelEmails(appointment, cancelledBy, refundMessage || 'No payment was made for this session.').catch(e =>
        console.error('Failed to send cancellation emails:', e.message)
      );
    }
    appointment.status = status;
    await appointment.save();
    res.json({ ...appointment.toObject(), refundMessage });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};