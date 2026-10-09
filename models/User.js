const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required:true,unique:true },

  role: { type: String, enum: ['client', 'counselor'], default: 'client' },
  resetCodeHash: { type: String, select: false },
  resetCodeExpires: { type: Date, select: false },
  resetCodeAttempts: { type: Number, default: 0, select: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);