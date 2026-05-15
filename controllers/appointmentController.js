const Appointment = require('../models/Appointment');
const axios = require('axios');

exports.bookAppointment = async (req, res) => {
  const { counselorId, date, time, sessionType } = req.body;
  try {
    const dailyRes = await axios.post('https://api.daily.co/v1/rooms', 
      { properties: { exp: Math.round(Date.now() / 1000) + 3600 } }, 
      { headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` } }
    );
    const videoRoomUrl = dailyRes.data.url;

    const appointment = await Appointment.create({
      clientId: req.user.id,
      counselorId,
      date,
      time,
      sessionType,
      videoRoomUrl
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
      .populate('counselorId', 'name email');
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.updateStatus = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id, 
      { status: req.body.status }, 
      { new: true }
    );
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};