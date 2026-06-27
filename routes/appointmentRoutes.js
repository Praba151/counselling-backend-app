const express = require('express');
const router = express.Router();
const { bookAppointment, getMyAppointments, updateStatus, cancelAppointment } = require('../controllers/appointmentController'); // add cancelAppointment
const { protect } = require('../middleware/authMiddleware');

router.post('/book', protect, bookAppointment);
router.get('/mine', protect, getMyAppointments);
router.put('/:id/status', protect, updateStatus);
router.delete('/:id', protect, cancelAppointment); // ← ADD THIS LINE

module.exports = router;