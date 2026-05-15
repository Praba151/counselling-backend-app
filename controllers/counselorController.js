const CounselorProfile = require('../models/CounselorProfile');
const User = require('../models/User');

exports.getAllCounselors = async (req, res) => {
  try {
    const profiles = await CounselorProfile.find().populate('userId', 'name email');
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getCounselorById = async (req, res) => {
  try {
    const profile = await CounselorProfile.findOne({ userId: req.params.id }).populate('userId', 'name email');
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.upsertProfile = async (req, res) => {
  const { bio, expertise, sessionTypes, pricePerSession, availableSlots } = req.body;
  try {
    let profile = await CounselorProfile.findOne({ userId: req.user.id });
    if (profile) {
      profile.bio = bio;
      profile.expertise = expertise;
      profile.sessionTypes = sessionTypes;
      profile.pricePerSession = pricePerSession;
      profile.availableSlots = availableSlots;
      await profile.save();
    } else {
      profile = await CounselorProfile.create({ userId: req.user.id, bio, expertise, sessionTypes, pricePerSession, availableSlots });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};