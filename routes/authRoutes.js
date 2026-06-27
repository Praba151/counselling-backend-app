const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController'); // add getMe
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe); // ← ADD THIS LINE

module.exports = router;