const Rating = require('../models/ratingModel');
const User = require('../models/userModel.js');

// Create a rating
exports.createRating = async (req, res) => {
  try {
    const { rater, mechanic, booking, score, comment } = req.body;
    if (!rater || !mechanic || !score) {
      return res.status(400).json({ error: 'rater, mechanic and score are required' });
    }
    if (score < 1 || score > 5) {
      return res.status(400).json({ error: 'score must be between 1 and 5' });
    }

    // Optionally validate users exist
    const [raterUser, mechanicUser] = await Promise.all([
      User.findById(rater),
      User.findById(mechanic)
    ]);
    if (!raterUser) return res.status(404).json({ error: 'Rater not found' });
    if (!mechanicUser) return res.status(404).json({ error: 'Mechanic not found' });

    const rating = await Rating.create({ rater, mechanic, booking, score, comment });
    res.status(201).json(rating);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get ratings for a mechanic
exports.getRatingsByMechanic = async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const ratings = await Rating.find({ mechanic: mechanicId })
      .populate('rater', 'name email phone')
      .populate('booking');
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get average rating and count for a mechanic
exports.getMechanicStats = async (req, res) => {
  try {
    const { mechanicId } = req.params;
    const stats = await Rating.aggregate([
      { $match: { mechanic: require('mongoose').Types.ObjectId(mechanicId) } },
      {
        $group: {
          _id: '$mechanic',
          avgScore: { $avg: '$score' },
          count: { $sum: 1 }
        }
      }
    ]);
    if (!stats || stats.length === 0) return res.json({ avgScore: 0, count: 0 });
    return res.json({ avgScore: stats[0].avgScore, count: stats[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get ratings for a booking
exports.getRatingsByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const ratings = await Rating.find({ booking: bookingId }).populate('rater', 'name');
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
