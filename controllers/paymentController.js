const Razorpay = require('razorpay');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function sendViaBrevo({ toEmail, toName, subject, html }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'MindBridge Counseling', email: process.env.EMAIL_USER },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Brevo API error (${response.status}): ${errText}`);
  }
}

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
    console.error('Create Order Error:', err);
    res.status(500).json({ message: 'Order creation failed', error: err.message });
  }
};

const verifyPayment = async (req, res) => {
  console.log('🚀 VERIFY PAYMENT ROUTE HIT! Payload:', req.body);
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, appointmentId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !appointmentId) {
      return res.status(400).json({ message: 'Missing payment parameters' });
    }

    const body = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await Payment.findOneAndUpdate({ razorpayOrderId }, { status: 'failed' });
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    const videoRoomUrl = `https://meet.jit.si/session-${appointmentId}`;

    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        paymentStatus: 'paid',
        status: 'confirmed',
        razorpayPaymentId,
        videoRoomUrl,
      },
      { returnDocument: 'after' }
    )
      .populate('clientId', 'name email')
      .populate('counselorId', 'name email');

    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { razorpayPaymentId, status: 'paid' }
    );

    const clientEmail = appointment.clientId?.email;
    const clientName = appointment.clientId?.name || 'Client';
    const counselorName = appointment.counselorId?.name || 'Counselor';

    console.log('📧 Attempting to send confirmation email to:', clientEmail);

    if (clientEmail) {
      try {
        await sendViaBrevo({
          toEmail: clientEmail,
          toName: clientName,
          subject: '✅ Booking Confirmed — Counselling App',
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
            ${videoRoomUrl ? `<p>🎥 <a href="${videoRoomUrl}">Click here to join your video call</a></p>` : ''}
            <p>See you soon!</p>
          `,
        });
        console.log('✅ Confirmation email sent successfully to:', clientEmail);
      } catch (emailErr) {
        console.error('❌ Email send failed:', emailErr.message);
      }
    }

    return res.json({ message: 'Payment verified and booking confirmed', appointment });

  } catch (err) {
    console.error('❌ Verification Exception:', err);
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