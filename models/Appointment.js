const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  counselorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  counselorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'CounselorProfile' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  sessionType: { type: String, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  videoRoomUrl: { type: String }, 
  paymentStatus: { type: String, enum: ['unpaid', 'paid' , 'refunded'], default: 'unpaid' },
  cancelledBy: { type: String, enum: ['client', 'counselor'] },
  cancelledAt: { type: Date },
  refundStatus: { type: String, enum: ['none', 'refunded', 'not_eligible', 'manual'], default: 'none' },
  refundAmount: { type: Number },
  amountPaid: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);