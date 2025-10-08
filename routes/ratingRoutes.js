const express = require('express');
const router = express.Router();
const ratingController = require('../controller/ratingController');

// Create a rating
router.post('/create', ratingController.createRating);

// Get ratings for a mechanic
router.get('/mechanic/:mechanicId', ratingController.getRatingsByMechanic);

// Get average rating & count for a mechanic
router.get('/mechanic/:mechanicId/stats', ratingController.getMechanicStats);

// Get ratings for a booking
router.get('/booking/:bookingId', ratingController.getRatingsByBooking);

// Admin/test: get all ratings
router.get('/all', async (req, res) => {
	try {
		const Rating = require('../models/ratingModel');
		const ratings = await Rating.find().populate('rater mechanic booking');
		res.json(ratings);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

router.post("/:bookingId/feedback", ratingController.addFeedback);

module.exports = router;
