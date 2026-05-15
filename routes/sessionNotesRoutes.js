const express = require('express');
const router = express.Router();
const { createNote, getNotesByAppointment } = require('../controllers/sessionNotesController');
const { protect, counselorOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/', protect, counselorOnly, upload.single('file'), createNote);
router.get('/:appointmentId', protect, getNotesByAppointment);

module.exports = router;