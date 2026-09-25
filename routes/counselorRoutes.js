const express = require('express');
const router = express.Router();
const { getAllCounselors, getCounselorById, upsertProfile, getMyClients } = require('../controllers/counselorController');
const { protect, counselorOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', getAllCounselors);
router.get('/clients/mine', protect, counselorOnly, getMyClients);
router.get('/:id', getCounselorById);
router.post('/profile', protect, counselorOnly,upload.single('photo'), upsertProfile);

module.exports = router;