const CounselorProfile = require('../models/CounselorProfile');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

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

exports.getMyClients = async (req, res) => {
  try {
    const appointments = await Appointment.find({ counselorId: req.user.id })
      .populate('clientId', 'name email phone createdAt')
      .sort('-date');

    const clientsMap = {};
    appointments.forEach((appt) => {
      const client = appt.clientId;
      if (!client) return;
      const id = client._id.toString();
      if (!clientsMap[id]) {
        clientsMap[id] = {
          _id: client._id,
          name: client.name,
          email: client.email,
          phone: client.phone || '',
          clientSince: client.createdAt,
          sessions: [],
        };
      }
      clientsMap[id].sessions.push({
        _id: appt._id,
        date: appt.date,
        time: appt.time,
        sessionType: appt.sessionType,
        status: appt.status,
        paymentStatus: appt.paymentStatus,
      });
    });

    res.json(Object.values(clientsMap));
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