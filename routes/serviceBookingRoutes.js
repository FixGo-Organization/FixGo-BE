const express = require('express');
const router = express.Router();
const serviceBookingController = require('../controller/bookingController');

router.post('/create', serviceBookingController.createBooking);
router.get('/mechanics', serviceBookingController.getNearbyMechanics);
router.post('/assign', serviceBookingController.assignMechanic);
router.post('/status', serviceBookingController.updateStatus);
router.get('/all', serviceBookingController.getAllBookings);

module.exports = router;
