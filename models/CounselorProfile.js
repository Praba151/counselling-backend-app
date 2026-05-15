const mongoose = require('mongoose');

const counselorProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bio: { type: String },
  expertise: [{ type: String }],
  sessionTypes: [{ type: String }],
  pricePerSession: { type: Number, default: 500 },
  availableSlots: [{ 
    date: String, 
    time: String, 
    isBooked: { type: Boolean, default: false } 
  }],
  rating: { type: Number, default: 0 }
});

module.exports = mongoose.model('CounselorProfile', counselorProfileSchema);