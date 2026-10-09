const express = require('express');
const router = express.Router();
const {
  createNote,
  getNotesByAppointment,
  updateNote,
  deleteNote,
  downloadAttachment,
} = require('../controllers/sessionNotesController');
const { protect, counselorOnly } = require('../middleware/authMiddleware');
const { uploadNoteFile } = require('../middleware/uploadMiddleware');

router.post('/', protect, counselorOnly, uploadNoteFile, createNote);
router.get('/file/:noteId', protect, downloadAttachment); 
router.get('/:appointmentId', protect, getNotesByAppointment);
router.put('/:noteId', protect, counselorOnly, updateNote);
router.delete('/:noteId', protect, counselorOnly, deleteNote);

module.exports = router;