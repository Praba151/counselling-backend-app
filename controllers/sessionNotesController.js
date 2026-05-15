const SessionNote = require('../models/SessionNote');
exports.createNote = async (req, res) => {
  const { appointmentId, clientId, noteText } = req.body;
  const fileAttachment = req.file ? req.file.filename : null;
  try {
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
    const notes = await SessionNote.find({ appointmentId: req.params.appointmentId });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};