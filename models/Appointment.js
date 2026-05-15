const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  counselorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  sessionType: { type: String, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
  videoRoomUrl: { type: String }, 
  paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);