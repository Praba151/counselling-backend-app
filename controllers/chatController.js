const Message = require('../models/Message');
const Appointment = require('../models/Appointment');

const isAuthorizedForAppointment = (appointment, userId) => {
  if (!appointment) return false;
  return (
    appointment.clientId.toString() === userId.toString() ||
    appointment.counselorId.toString() === userId.toString()
  );
};

exports.getMessages = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    if (!isAuthorizedForAppointment(appointment, req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to view this chat' });
    }

    const messages = await Message.find({ appointmentId: req.params.appointmentId }).sort('createdAt');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.saveMessage = async ({ appointmentId, senderId, senderName, text }) => {
  return Message.create({ appointmentId, senderId, senderName, text });
};

exports.isAuthorizedForAppointment = isAuthorizedForAppointment;