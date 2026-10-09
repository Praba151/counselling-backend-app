const fs = require('fs');
const path = require('path');
const SessionNote = require('../models/SessionNote');
const Appointment = require('../models/Appointment');

const PRIVATE_DIR = path.resolve('private_uploads');
const LEGACY_DIR = path.resolve('uploads'); 

const isAuthorized = (appointment, userId) => {
  if (!appointment) return false;
  return (
    appointment.clientId.toString() === userId.toString() ||
    appointment.counselorId.toString() === userId.toString()
  );
};


const removeFile = (filename) => {
  if (!filename) return;
  for (const dir of [PRIVATE_DIR, LEGACY_DIR]) {
    const full = path.join(dir, path.basename(filename));
    if (fs.existsSync(full)) {
      fs.unlink(full, () => {});
      return;
    }
  }
};

exports.createNote = async (req, res) => {
  const { appointmentId, noteText } = req.body; 
  const fileAttachment = req.file ? req.file.filename : null;
  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      removeFile(fileAttachment);
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.counselorId.toString() !== req.user.id.toString()) {
      removeFile(fileAttachment);
      return res.status(403).json({ message: 'You are not the counselor for this appointment' });
    }

    const note = await SessionNote.create({
      appointmentId,
      counselorId: req.user.id,
      clientId: appointment.clientId, 
      noteText,
      fileAttachment,
    });
    res.status(201).json(note);
  } catch (err) {
    removeFile(fileAttachment);
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


exports.updateNote = async (req, res) => {
  try {
    const note = await SessionNote.findById(req.params.noteId);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.counselorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own notes' });
    }

    note.noteText = req.body.noteText;
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.deleteNote = async (req, res) => {
  try {
    const note = await SessionNote.findById(req.params.noteId);
    if (!note) return res.status(404).json({ message: 'Note not found' });
    if (note.counselorId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own notes' });
    }

    removeFile(note.fileAttachment);
    await note.deleteOne();
    res.json({ message: 'Note deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadAttachment = async (req, res) => {
  try {
    const note = await SessionNote.findById(req.params.noteId);
    if (!note || !note.fileAttachment) return res.status(404).json({ message: 'File not found' });

    const userId = req.user.id.toString();
    const allowed =
      note.clientId.toString() === userId || note.counselorId.toString() === userId;
    if (!allowed) return res.status(403).json({ message: 'You are not authorized to view this file' });

    const name = path.basename(note.fileAttachment); 
    const privatePath = path.join(PRIVATE_DIR, name);
    const legacyPath = path.join(LEGACY_DIR, name);
    const filePath = fs.existsSync(privatePath)
      ? privatePath
      : fs.existsSync(legacyPath)
      ? legacyPath
      : null;
    if (!filePath) return res.status(404).json({ message: 'File not found on server' });

    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};