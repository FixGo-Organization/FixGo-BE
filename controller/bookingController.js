const ServiceBooking = require('../models/bookingModel.js');
const User = require('../models/userModel.js'); // mechanics are users

// Tạo yêu cầu sửa xe
exports.createBooking = async (req, res) => {
  try {
    const booking = await ServiceBooking.create(req.body);
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Lấy danh sách thợ gần đó
exports.getNearbyMechanics = async (req, res) => {
  try {
    const { lat, lng, distance = 5 } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const distanceMeters = parseFloat(distance) * 1000; // distance param in km

    // Use geospatial query (requires 2dsphere index on User.location)
    const mechanics = await User.find({
      role: 'mechanic',
      status: 'online',
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lngNum, latNum] },
          $maxDistance: distanceMeters
        }
      }
    }).select('name phone rating location services servicePrices');

    res.json(mechanics);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Đặt thợ cho đơn
exports.assignMechanic = async (req, res) => {
  try {
    const { bookingId, mechanicId } = req.body;
    const booking = await ServiceBooking.findByIdAndUpdate(
      bookingId,
      { mechanic: mechanicId, status: 'đã nhận' },
      { new: true }
    );
    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Cập nhật trạng thái đơn
exports.updateStatus = async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    const booking = await ServiceBooking.findByIdAndUpdate(
      bookingId,
      { status },
      { new: true }
    );
    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all bookings (for testing/admin)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await ServiceBooking.find().populate('user mechanic');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
