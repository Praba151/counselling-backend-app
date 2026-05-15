const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  amount: { type: Number }, 
  status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);