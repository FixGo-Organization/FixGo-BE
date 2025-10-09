const express = require('express');
const router = express.Router();
const serviceBookingController = require('../controller/bookingController');

router.post('/create-specific', serviceBookingController.createSpecificBooking);
router.post('/create-emergency', serviceBookingController.createEmergencyBooking);
router.get('/mechanics', serviceBookingController.getNearbyMechanics);
router.get('/:bookingId', serviceBookingController.getBookingById);
router.post('/assign', serviceBookingController.assignMechanic);
router.post('/assignMechanic', serviceBookingController.requestSpecificMechanic);
router.post('/reject', serviceBookingController.rejectMechanic);
router.post('/rejectMechanic', serviceBookingController.mechanicRejectBooking);

router.post('/status', serviceBookingController.updateStatus);
router.get('/all', serviceBookingController.getAllBookings);
router.get('/mechanic/:mechanicId', serviceBookingController.getMechanicBookings);

router.get("/",serviceBookingController.getBookings);
router.patch("/:id/status", serviceBookingController.updateBookingStatus);
// router.post("/feedback", serviceBookingController.submitFeedback);

module.exports = router;
