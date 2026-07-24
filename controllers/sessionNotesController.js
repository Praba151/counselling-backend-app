const SessionNote = require('../models/SessionNote');
const Appointment = require('../models/Appointment');


const isAuthorized = (appointment, userId) => {
  if (!appointment) return false;
  return (
    appointment.clientId.toString() === userId.toString() ||
    appointment.counselorId.toString() === userId.toString()
  );
};

exports.createNote = async (req, res) => {
  const { appointmentId, clientId, noteText } = req.body;
  const fileAttachment = req.file ? req.file.filename : null;
  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    
    if (appointment.counselorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You are not the counselor for this appointment' });
    }

    const note = await SessionNote.create({
      appointmentId,
      counselorId: req.user.id,
      clientId,
      noteText,
      fileAttachment
    });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getNotesByAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    
    if (!isAuthorized(appointment, req.user.id)) {
      return res.status(403).json({ message: 'You are not authorized to view these notes' });
    }

    const notes = await SessionNote.find({ appointmentId: req.params.appointmentId });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};