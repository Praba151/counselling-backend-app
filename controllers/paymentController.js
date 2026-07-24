const Razorpay = require('razorpay');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const nodemailer = require('nodemailer');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrder = async (req, res) => {
  try {
    const { amount, appointmentId } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    if (appointment.clientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Not your appointment' });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
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
    res.status(500).json({ message: 'Order creation failed', error: err.message });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, appointmentId } = req.body;
    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await Payment.findOneAndUpdate({ razorpayOrderId }, { status: 'failed' });
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    let videoRoomUrl = null;
    try {
      const dailyRes = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          name: `session-${appointmentId}`,
          properties: { exp: Math.floor(Date.now() / 1000) + 86400 }, // expires in 24 hours
        }),
      });
      const dailyData = await dailyRes.json();
      videoRoomUrl = dailyData.url;
    } catch (e) {
      console.log('Daily.co room creation failed:', e.message);
    }

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        paymentStatus: 'paid',
        status: 'confirmed',
        razorpayPaymentId,
        videoRoomUrl,
      },
      { new: true }
    ).populate('clientId counselorId');

    
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { razorpayPaymentId, status: 'paid' }
    );

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      await transporter.sendMail({
        from: `"MindBridge Counseling" <${process.env.EMAIL_USER}>`,
        to: appointment.clientId?.email,
        subject: '✅ Booking Confirmed — MindBridge',
        html: `
          <h2>Your session is confirmed!</h2>
          <p>Hi ${appointment.clientId?.name},</p>
          <p>Your counseling session has been booked and payment received.</p>
          <ul>
            <li><strong>Counselor:</strong> ${appointment.counselorId?.name}</li>
            <li><strong>Date:</strong> ${appointment.date}</li>
            <li><strong>Time:</strong> ${appointment.time}</li>
            <li><strong>Session Type:</strong> ${appointment.sessionType}</li>
          </ul>
          ${videoRoomUrl ? `<p>🎥 <a href="${videoRoomUrl}">Click here to join your video call</a></p>` : ''}
          <p>See you soon!</p>
        `,
      });
    } catch (emailErr) {
      console.log('Email send failed:', emailErr.message);
    }

    res.json({ message: 'Payment verified and booking confirmed', appointment });
  } catch (err) {
    res.status(500).json({ message: 'Verification failed', error: err.message });
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