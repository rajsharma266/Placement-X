const express = require('express');
const { register, login, logout, me } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const ensureDatabase = require('../middleware/ensureDatabase');

const router = express.Router();
router.post('/register', ensureDatabase, register);
router.post('/login', ensureDatabase, login);
router.post('/logout', protect, logout);
router.get('/me', protect, me);

module.exports = router;
