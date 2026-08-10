const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 1️⃣ Basic email format check (must look like a real email: text@text.text)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    // 2️⃣ Optional: restrict to only Gmail addresses (remove this block if not needed)
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return res.status(400).json({ message: "Only @gmail.com email addresses are allowed" });
    }

    // 3️⃣ Basic name check — prevent junk like emails or symbols being used as a name
    const nameRegex = /^[a-zA-Z\s.]{2,50}$/;
    if (!nameRegex.test(name.trim())) {
      return res.status(400).json({ message: "Please enter a valid name (letters only)" });
    }

    // 4️⃣ Phone number check — must be exactly 10 digits (Indian mobile numbers)
    const cleanedPhone = phone.trim().replace(/\s+/g, '');
    const phoneRegex = /^[6-9]\d{9}$/; // starts with 6-9, exactly 10 digits total
    if (!phoneRegex.test(cleanedPhone)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const phoneExists = await User.findOne({ phone: cleanedPhone });
    if (phoneExists) return res.status(400).json({ message: 'This phone number is already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
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

    // 🟢 If phone is being updated, validate it here too (Edit Profile flow)
    if (phone !== undefined) {
      const cleanedPhone = phone.trim().replace(/\s+/g, '');
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(cleanedPhone)) {
        return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
      }

      const phoneExists = await User.findOne({ phone: cleanedPhone, _id: { $ne: req.user.id } });
      if (phoneExists) return res.status(400).json({ message: 'This phone number is already in use' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ...(name && { name }), ...(phone !== undefined && { phone: phone.trim().replace(/\s+/g, '') }) },
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
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Wrong password' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};