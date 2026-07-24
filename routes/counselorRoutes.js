const express = require('express');
const router = express.Router();
const { getAllCounselors, getCounselorById, upsertProfile, getMyClients } = require('../controllers/counselorController');
const { protect, counselorOnly } = require('../middleware/authMiddleware');

router.get('/', getAllCounselors);
router.get('/clients/mine', protect, counselorOnly, getMyClients);
router.get('/:id', getCounselorById);
router.post('/profile', protect, counselorOnly, upsertProfile);

module.exports = router;