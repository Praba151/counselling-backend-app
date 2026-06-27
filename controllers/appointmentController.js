const Appointment = require('../models/Appointment');
const CounselorProfile = require('../models/CounselorProfile');

exports.bookAppointment = async (req, res) => {
  const { counselorId, date, time, sessionType } = req.body;
  try {
    if (!counselorId || !date || !time || !sessionType)
      return res.status(400).json({ message: 'Please fill all fields' });
    const existing = await Appointment.findOne({
      counselorId, date, time,
      status: { $in: ['pending', 'confirmed'] }
    });
    if (existing)
      return res.status(400).json({ message: 'This slot is already booked. Please choose another.' });
    await CounselorProfile.updateOne(
      { userId: counselorId, 'availableSlots.date': date, 'availableSlots.time': time },
      { $set: { 'availableSlots.$.isBooked': true } }
    );

    const appointment = await Appointment.create({ clientId: req.user.id, counselorId, date, time, sessionType });
    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ message: 'Booking failed. Please try again.' });
  }
};

exports.getMyAppointments = async (req, res) => {
  try {
    const filter = req.user.role === 'client' ? { clientId: req.user.id } : { counselorId: req.user.id };
    const appointments = await Appointment.find(filter)
      .populate('clientId', 'name email')
      .populate('counselorId', 'name email')
      .sort({ createdAt: -1 }); // ADDED: newest first
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!valid.includes(status))
      return res.status(400).json({ message: 'Invalid status' });

    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (appointment.status === 'completed')
      return res.status(400).json({ message: 'Cannot cancel a completed appointment' });
    await CounselorProfile.updateOne(
      { userId: appointment.counselorId, 'availableSlots.date': appointment.date, 'availableSlots.time': appointment.time },
      { $set: { 'availableSlots.$.isBooked': false } }
    );

    appointment.status = 'cancelled';
    await appointment.save();
    res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};