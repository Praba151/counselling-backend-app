const express = require('express');
const router = express.Router();
const { bookAppointment, getMyAppointments, updateStatus } = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');
const Appointment = require('../models/Appointment');
const CounselorProfile = require('../models/CounselorProfile');

router.post('/book', protect, bookAppointment);
router.get('/mine', protect, getMyAppointments);
router.put('/:id/status', protect, updateStatus);

router.get('/check/:id', protect, async (req, res) => {
  try {
    const counselorParamId = req.params.id;

    
    const counselorProfile = await CounselorProfile.findById(counselorParamId);
    const counselorUserId = counselorProfile ? counselorProfile.userId : null;


    const appointment = await Appointment.findOne({
      clientId: req.user._id,
      $or: [
        { counselorId: counselorParamId },
        { counselorUserId: counselorParamId },
        ...(counselorUserId ? [{ counselorId: counselorUserId }, { counselorUserId: counselorUserId }] : [])
      ],
      status: { $ne: 'cancelled' }
    }).sort({ createdAt: -1 });

    res.json({ appointment: appointment || null });
  } catch (err) {
    res.status(500).json({ message: 'Error checking appointment state', error: err.message });
  }
});

module.exports = router;