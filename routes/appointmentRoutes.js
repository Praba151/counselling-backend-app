const express = require('express');
const router = express.Router();
const { bookAppointment, getMyAppointments, updateStatus } = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/book', protect, bookAppointment);
router.get('/mine', protect, getMyAppointments);
router.put('/:id/status', protect, updateStatus);

module.exports = router;