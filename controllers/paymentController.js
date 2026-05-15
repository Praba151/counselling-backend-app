const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
exports.createOrder = async (req, res) => {
  const { appointmentId, amount } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${appointmentId}`
    });

    await Payment.create({
      clientId: req.user.id,
      appointmentId,
      razorpayOrderId: order.id,
      amount: amount * 100,
      status: 'created'
    });

    res.json({ orderId: order.id, amount: order.amount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.verifyPayment = async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, appointmentId } = req.body;
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body).digest('hex');

  if (expectedSignature === razorpaySignature) {
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      { razorpayPaymentId, status: 'paid' }
    );
    await Appointment.findByIdAndUpdate(appointmentId, { paymentStatus: 'paid', status: 'confirmed' });
    res.json({ success: true, message: 'Payment verified' });
  } else {
    res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
};