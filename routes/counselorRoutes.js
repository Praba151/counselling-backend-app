const express = require('express');
const router = express.Router();
const { getAllCounselors, getCounselorById, upsertProfile } = require('../controllers/counselorController');
const { protect, counselorOnly } = require('../middleware/authMiddleware');

router.get('/', getAllCounselors);
router.get('/:id', getCounselorById);
router.post('/profile', protect, counselorOnly, upsertProfile);

module.exports = router;