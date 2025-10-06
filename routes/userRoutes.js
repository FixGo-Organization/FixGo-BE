const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');

router.get('/all', userController.getAllUsers);
router.get('/:userId', userController.getUserById);

module.exports = router;
