const express = require('express');
const { register, login, checkPhone, resetPassword } = require('../controller/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/check-phone', checkPhone);
router.post('/reset-password', resetPassword);
module.exports = router;
