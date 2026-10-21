const CounselorProfile = require('../models/CounselorProfile');
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
  let { bio, expertise, sessionTypes, pricePerSession, availableSlots } = req.body;
  const photoUrl = req.file ? req.file.filename : undefined;


  if (expertise && !Array.isArray(expertise)) expertise = [expertise];
  if (sessionTypes && !Array.isArray(sessionTypes)) sessionTypes = [sessionTypes];
  if (typeof availableSlots === 'string') {
    try { availableSlots = JSON.parse(availableSlots); } catch { availableSlots = []; }
  }

  try {
    let profile = await CounselorProfile.findOne({ userId: req.user.id });
    if (profile) {
      profile.bio = bio;
      profile.expertise = expertise;
      profile.sessionTypes = sessionTypes;
      profile.pricePerSession = pricePerSession;
      profile.availableSlots = availableSlots;
      if (photoUrl) profile.photoUrl = photoUrl;
      await profile.save();
    } else {
      profile = await CounselorProfile.create({ userId: req.user.id, bio, expertise, sessionTypes, pricePerSession, availableSlots, photoUrl });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.setSlotBlocked = async (req, res) => {
  try {
    const { date, time, blocked } = req.body;
    if (!date || !time || typeof blocked !== 'boolean') {
      return res.status(400).json({ message: 'date, time and blocked (true/false) are required' });
    }

    const profile = await CounselorProfile.findOneAndUpdate(
      { userId: req.user.id, availableSlots: { $elemMatch: { date, time, isBooked: false } } },
      { $set: { 'availableSlots.$.isBlocked': blocked } },      { returnDocument: 'after' }
    );
    if (!profile) {
      return res.status(409).json({ message: 'Slot not found, or it is already booked. Cancel the booking first.' });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.setDayBlocked = async (req, res) => {
  try {
    const { date, blocked } = req.body;
    if (!date || typeof blocked !== 'boolean') {
      return res.status(400).json({ message: 'date and blocked (true/false) are required' });
    }

    const profile = await CounselorProfile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: { 'availableSlots.$[s].isBlocked': blocked } },      { arrayFilters: [{ 's.date': date, 's.isBooked': false }], returnDocument: 'after' }
    );
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });  }
};