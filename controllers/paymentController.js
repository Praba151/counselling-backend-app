const Razorpay = require('razorpay');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const CounselorProfile = require('../models/CounselorProfile');
const { sendEmail: sendViaBrevo } = require('../utils/mailer');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



const createOrder = async (req, res) => {
  try {
  
    const { appointmentId } = req.body;
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (appointment.clientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not your appointment' });
    }
    if (appointment.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'This appointment is already paid' });
    }
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ message: 'This appointment was cancelled' });
    }

    const profile = await CounselorProfile.findOne({ userId:appointment.counselorId} );
    if (!profile) return res.status(404).json({ message: 'Counselor profile not found' });

    const amount = Number(profile.pricePerSession);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid session price' });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), 
      currency: 'INR',
      receipt: `receipt_${appointmentId}`,
    });

    await Payment.create({
      clientId: req.user.id,
      appointmentId,
      razorpayOrderId: order.id,
      amount,
      status: 'created',
    });

    res.json({ orderId: order.id, amount: order.amount });
  } catch (err) {
    console.error('Create Order Error:', err?.error || err);
    const reason = err?.error?.decription || err.message || 'unknown error';
    res.status(500).json({ message: 'Order creation failed' + reason });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, appointmentId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !appointmentId) {
      return res.status(400).json({ message: 'Missing payment parameters' });
    }

    
    const payment = await Payment.findOne({
      razorpayOrderId,
      appointmentId,
      clientId: req.user.id,
    });
    if (!payment) {
      return res.status(400).json({ message: 'Payment does not match this appointment' });
    }

    
    if (payment.status === 'paid') {
      const existing = await Appointment.findById(appointmentId)
        .populate('clientId', 'name email')
        .populate('counselorId', 'name email');
      return res.json({ message: 'Payment already verified', appointment: existing });
    }

    
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      payment.status = 'failed';
      await payment.save();
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const videoRoomUrl = `https://meet.jit.si/session-${appointmentId}-${crypto.randomBytes(8).toString('hex')}`;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        paymentStatus: 'paid',
        status: 'confirmed',
        amountPaid: payment.amount,
        videoRoomUrl,
      },
      { returnDocument: 'after' }
    )
      .populate('clientId', 'name email')
      .populate('counselorId', 'name email');

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.status = 'paid';
    await payment.save();

    const clientEmail = appointment.clientId?.email;
    const clientName = appointment.clientId?.name || 'Client';
    const counselorName = appointment.counselorId?.name || 'Counselor';

    if (clientEmail) {
      try {
        await sendViaBrevo({
          toEmail: clientEmail,
          toName: clientName,
          subject: 'Booking Confirmed — Counselling App',
          html: `
            <h2>Your session is confirmed!</h2>
            <p>Hi ${clientName},</p>
            <p>Your counseling session has been booked and payment received.</p>
            <ul>
              <li><strong>Counselor:</strong> ${counselorName}</li>
              <li><strong>Date:</strong> ${appointment.date}</li>
              <li><strong>Time:</strong> ${appointment.time}</li>
              <li><strong>Session Type:</strong> ${appointment.sessionType}</li>
            </ul>
            ${videoRoomUrl ? `<p> <a href="${videoRoomUrl}">Click here to join your video call</a></p>` : ''}
            <p>See you soon!</p>
          `,
        });
        console.log(' Confirmation email sent successfully to:', clientEmail);
      } catch (emailErr) {
        console.error(' Email send failed:', emailErr.message);
      }
    }

    return res.json({ message: 'Payment verified and booking confirmed', appointment });

  } catch (err) {
    console.error(' Verification Exception:', err);
    return res.status(500).json({ message: 'Verification failed', error: err.message });
  }
};

const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ clientId: req.user.id })
      .populate('appointmentId')
      .sort('-createdAt');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createOrder, verifyPayment, getMyPayments };