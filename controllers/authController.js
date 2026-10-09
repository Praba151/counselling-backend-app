const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendEmail } = require('../utils/mailer');

const normalizePhone = (phone) => {
  const cleaned = String(phone || '').trim().replace(/[\s-]/g, '');
  const indian = cleaned.match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
  if (indian) return indian[1];
  if (/^\+?\d{7,15}$/.test(cleaned)) return cleaned;
  return null;
};

exports.register = async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

  
    const nameRegex = /^[\p{L}\p{M}\s.'-]{2,50}$/u;   
    if (!nameRegex.test(name.trim())) {
      return res.status(400).json({ message: "Please enter a valid name (2-50 letters)" });
    }

    const cleanedPhone = normalizePhone(phone);
    if (!cleanedPhone) {
      return res.status(400).json({ message: "Please enter a valid phone number (for example 9876543210)" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const phoneExists = await User.findOne({ phone: cleanedPhone });
    if (phoneExists) return res.status(400).json({ message: 'This phone number is already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: cleanedPhone,
      password: hashed,
      role
    });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    let cleanedPhone;
    if (phone !== undefined) {
      cleanedPhone = normalizePhone(phone);
      if (!cleanedPhone) {
        return res.status(400).json({ message: "Please enter a valid phone number (for example 9876543210)" });
      }

      const phoneExists = await User.findOne({ phone: cleanedPhone, _id: { $ne: req.user.id } });
      if (phoneExists) return res.status(400).json({ message: 'This phone number is already in use' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ...(name && { name }), ...(phone !== undefined && { phone: cleanedPhone }) },
      { new: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email:email.toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Wrong password' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



const CODE_VALID_MINUTES = 10;
const MAX_WRONG_TRIES = 5;
const RESEND_AFTER_SECONDS = 60;

const hashCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

exports.forgotPassword = async (req, res) => {
  const sameReply = { message: 'If that email is registered, a 6-digit code has been sent.' };
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ message: 'Please enter your email' });

    const user = await User.findOne({ email }).select('+resetCodeExpires');
    if (!user) return res.json(sameReply);

    if (user.resetCodeExpires) {
      const sentSecondsAgo = (Date.now() - (user.resetCodeExpires.getTime() - CODE_VALID_MINUTES * 60 * 1000)) / 1000;
      if (sentSecondsAgo < RESEND_AFTER_SECONDS) return res.json(sameReply);
    }

    const code = String(crypto.randomInt(100000, 1000000));   
    user.resetCodeHash = hashCode(code);                      
    user.resetCodeExpires = new Date(Date.now() + CODE_VALID_MINUTES * 60 * 1000);
    user.resetCodeAttempts = 0;
    await user.save();

    try {
      await sendEmail({
        toEmail: user.email,
        toName: user.name,
        subject: 'Your password reset code - Counselling',
        html: `
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Your password reset code is:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#2C7A7B;">${code}</p>
          <p>This code works for <strong>${CODE_VALID_MINUTES} minutes</strong>.</p>
          <p style="font-size:12px;color:#888;">If you did not ask for this, ignore this email. Your password will not change.</p>
        `,
      });
    } catch (mailErr) {
      console.error('Password reset email failed:', mailErr.message);
    }

    res.json(sameReply);
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};



exports.resetPassword = async (req, res) => {
  const badCode = { message: 'Invalid or expired code' };
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const code = String(req.body.code || '').trim();
    const { password } = req.body;

    if (!email || !code || !password) {
      return res.status(400).json({ message: 'Email, code and new password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email }).select('+resetCodeHash +resetCodeExpires +resetCodeAttempts');
    if (!user || !user.resetCodeHash || !user.resetCodeExpires || user.resetCodeExpires < new Date()) {
      return res.status(400).json(badCode);
    }

    if (user.resetCodeAttempts >= MAX_WRONG_TRIES) {
      return res.status(400).json({ message: 'Too many wrong tries. Please request a new code.' });
    }

    const sent = Buffer.from(hashCode(code));
    const saved = Buffer.from(user.resetCodeHash);
    if (sent.length !== saved.length || !crypto.timingSafeEqual(sent, saved)) {
      user.resetCodeAttempts += 1;
      await user.save();
      const left = MAX_WRONG_TRIES - user.resetCodeAttempts;
      return res.status(400).json({ message: left > 0 ? `Wrong code. ${left} tries left.` : 'Too many wrong tries. Please request a new code.' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetCodeHash = undefined;       
    user.resetCodeExpires = undefined;
    user.resetCodeAttempts = 0;
    await user.save();

    res.json({ message: 'Password updated. You can log in now.' });
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};