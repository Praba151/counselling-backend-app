const express = require('express');
const router = express.Router();
const { getAllCounselors, getCounselorById, upsertProfile, getMyClients ,setSlotBlocked, setDayBlocked} = require('../controllers/counselorController');
const { protect, counselorOnly } = require('../middleware/authMiddleware');
const {uploadPhoto}= require('../middleware/uploadMiddleware');

router.get('/', getAllCounselors);
router.get('/clients/mine', protect, counselorOnly, getMyClients);
router.get('/:id', getCounselorById);
router.post('/profile', protect, counselorOnly,uploadPhoto, upsertProfile);
router.put('/slots/block', protect, counselorOnly, setSlotBlocked);
router.put('/slots/block-day', protect, counselorOnly, setDayBlocked);

module.exports = router;