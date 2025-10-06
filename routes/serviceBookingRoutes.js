const express = require('express');
const router = express.Router();
const serviceBookingController = require('../controller/bookingController');

router.post('/create', serviceBookingController.createBooking);
router.get('/mechanics', serviceBookingController.getNearbyMechanics);
router.post('/assign', serviceBookingController.assignMechanic);
router.post('/status', serviceBookingController.updateStatus);
router.get('/all', serviceBookingController.getAllBookings);
router.get("/bookings",serviceBookingController.getBookings);
router.patch("/:id/status", serviceBookingController.updateBookingStatus);
// router.post("/feedback", serviceBookingController.submitFeedback);
module.exports = router;
