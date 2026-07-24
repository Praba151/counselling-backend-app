const Appointment = require('../models/Appointment');
const CounselorProfile = require('../models/CounselorProfile');

exports.bookAppointment = async (req, res) => {
  const { counselorId, date, time, sessionType } = req.body;
  try {
    
    const profile = await CounselorProfile.findOne({ userId: counselorId });
    if (!profile) return res.status(404).json({ message: 'Counselor profile not found' });

    const slot = profile.availableSlots.find(s => s.date === date && s.time === time);
    if (!slot) return res.status(400).json({ message: 'Selected slot is not available' });
    if (slot.isBooked) return res.status(409).json({ message: 'This slot has just been booked by someone else. Please pick another.' });

  
    slot.isBooked = true;
    await profile.save();

    const appointment = await Appointment.create({
      clientId: req.user.id,
      counselorId,
      date,
      time,
      sessionType
    });
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    const filter = req.user.role === 'client'
      ? { clientId: req.user.id }
      : { counselorId: req.user.id };

    const appointments = await Appointment.find(filter)
      .populate('clientId', 'name email')
      .populate('counselorId', 'name email')
      .sort('-createdAt');
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    const { status } = req.body;
    const userId = req.user.id.toString();
    const isCounselor = appointment.counselorId.toString() === userId;
    const isClient = appointment.clientId.toString() === userId;

    if (!isCounselor && !isClient) {
      return res.status(403).json({ message: 'Not authorized for this appointment' });
    }
    
    if ((status === 'confirmed' || status === 'completed') && !isCounselor) {
      return res.status(403).json({ message: 'Only the counselor can do that' });
    }


    if (status === 'cancelled' && appointment.status !== 'cancelled') {
      const profile = await CounselorProfile.findOne({ userId: appointment.counselorId });
      if (profile) {
        const slot = profile.availableSlots.find(s => s.date === appointment.date && s.time === appointment.time);
        if (slot) {
          slot.isBooked = false;
          await profile.save();
        }
      }
    }

    appointment.status = status;
    await appointment.save();
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};