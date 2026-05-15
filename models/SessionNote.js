const mongoose = require('mongoose');

const sessionNoteSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  counselorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  noteText: { type: String },
  fileAttachment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SessionNote', sessionNoteSchema);