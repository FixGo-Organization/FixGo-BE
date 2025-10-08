const customerController = require('../controller/customerController');
const express = require('express');
const router = express.Router();


router.post('/looking-for-mechanics', customerController.lookingForMechanics);

module.exports = router;

