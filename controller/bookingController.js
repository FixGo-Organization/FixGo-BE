const ServiceBooking = require('../models/bookingModel.js');
const User = require('../models/userModel.js'); // mechanics are users
const Mechanic = require('../models/mechanicModel');

// utility: lấy io và socketMap từ app
const getIoAndMap = (req) => {
  const io = req.app.get('io');
  const socketUserMap = req.app.get('socketUserMap'); // { userId: socketId }
  return { io, socketUserMap };
};


// Tạo yêu cầu sửa xe và thông báo cho thợ gần đó
exports.createBooking = async (req, res) => {
  try {
    // lấy customerId từ req.userId nếu dùng auth; fallback về req.body.customerId
    const customerId = req.userId || req.body.customerId;
    if (!customerId) return res.status(400).json({ error: 'customerId is required' });

    // validate location
    const { location } = req.body;
    if (!location || !Array.isArray(location.coordinates) || location.coordinates.length !== 2)
      return res.status(400).json({ error: 'location.coordinates [lng, lat] required' });

    // tạo booking mới
    const bookingData = {
      ...req.body,
      customerId,
      location
    };
    const booking = await ServiceBooking.create(bookingData);

    // tìm các thợ gần vị trí customer (1km)
    const maxDistance = req.body.notifyDistanceMeters ? Number(req.body.notifyDistanceMeters) : 1000;
    const [lng, lat] = booking.location.coordinates;

    // tìm users có role mechanic, có location, và Mechanic.availability join simple:
    // filter User.role === 'mechanic' and location near
    const nearbyMechanics = await User.find({
      role: "mechanic",
      "location.coordinates": { $exists: true },
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: maxDistance,
        },
      },
    }).select('_id name phone location online');

    // emit tới từng mechanic (nếu có socket map)
    const { io, socketUserMap } = getIoAndMap(req);
    nearbyMechanics.forEach(m => {
      const socketId = socketUserMap && socketUserMap[m._id.toString()];
      const payload = { booking, mechanicId: m._id };
      if (socketId && io) {
        io.to(socketId).emit('new_booking', payload);
      }
    });

    // fallback broadcast small info (optional)
    if (io) io.emit('booking_created', { bookingId: booking._id });

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
      // status: 'online',
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lngNum, latNum] },
          $maxDistance: distanceMeters
        }
      }
    }).select('name phone rating location services servicePrices online');

    res.json(mechanics);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Đặt thợ cho đơn
exports.assignMechanic = async (req, res) => {
  try {
    const { bookingId, mechanicId } = req.body;
    if (!bookingId || !mechanicId)
      return res.status(400).json({ error: 'bookingId and mechanicId required' });

    console.log('>>> [DEBUG] attempting to assign mechanic', mechanicId, 'to booking', bookingId);

    // 1. validate mechanic existence + availability
    const mechanic = await Mechanic.findOne({ userId: mechanicId });
    if (!mechanic) {
      console.log('>>> [DEBUG] failed to assign mechanic: ', mechanicId, 'to booking', bookingId, ' - mechanic not found');
      return res.status(404).json({ error: 'Mechanic not found' });
    }
    if (mechanic.availability === false) {
      console.log('>>> [DEBUG] failed to assign mechanic: ', mechanicId, 'to booking', bookingId, ' - mechanic not available');
      return res.status(400).json({ error: 'Mechanic is not available' });
    }
    // 2. validate booking existence + status
    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) {
      console.log('>>> [DEBUG] failed to assign mechanic: ', mechanicId, 'to booking', bookingId, ' - booking not found');
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status != 'chờ thợ') {
      console.log('>>> [DEBUG] failed to assign mechanic: ', mechanicId, 'to booking', bookingId, ' - invalid booking status:', booking.status);
      return res.status(400).json({
        error: `Cannot assign mechanic. Booking status must be 'chờ thợ', current status is '${booking.status}'.`
      });
    }

    // 3. update booking with mechanicId + change status to 'đã nhận'
    const updatedBooking = await ServiceBooking.findByIdAndUpdate(
      bookingId,
      { mechanicId, status: 'đã nhận' },
      { new: true }
    ).populate('customerId mechanicId serviceId');

    // 4. update mechanic availability to false (busy)
    const updatedMechanic = await Mechanic.findOneAndUpdate(
      { userId: mechanicId },
      { availability: false },
      { new: true }
    );

    // 5. notify users via socket
    const io = req.app.get('io');
    const socketUserMap = req.app.get('socketUserMap');
    if (io && socketUserMap) {
      const mechSocket = socketUserMap[mechanicId];
      const custSocket = socketUserMap[booking.customerId.toString()];
      if (mechSocket) io.to(mechSocket).emit('booking_assigned', { booking: updatedBooking });
      if (custSocket) io.to(custSocket).emit('your_booking_updated', { booking: updatedBooking });
    }

    // 6. return booking + mechanic status
    console.log('>>> [DEBUG] successfully assigned mechanic', mechanicId, 'to booking', bookingId);
    res.json({
      booking: updatedBooking,
      availability: updatedMechanic?.availability ?? null
    });

  } catch (err) {
    console.error('Error assigning mechanic:', err);
    res.status(400).json({ error: err.message });
  }
};

// Cập nhật trạng thái đơn
exports.updateStatus = async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    if (!bookingId || !status) return res.status(400).json({ error: 'bookingId and status required' });

    // 1. fetch booking
    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // 2. prevent further changes if status == 'hoàn thành'/'hủy'
    if (['hoàn thành', 'hủy'].includes(booking.status)) {
      return res.status(400).json({
        error: `Booking is already "${booking.status}" and cannot be changed anymore.`
      });
    }

    // 3. prepare update
    const update = { status };
    if (status === 'hoàn thành') update.completedAt = new Date();

    // 4. update booking
    const updatedBooking = await ServiceBooking.findByIdAndUpdate(
      bookingId,
      update,
      { new: true }
    ).populate('customerId mechanicId');

    // 5. if status == "hoàn thành" => set mechanic available true
    let updatedMechanic = false;
    if (status === 'hoàn thành' && (updatedBooking.mechanicId || req.body.mechanicId)) {
      const mechId = updatedBooking.mechanicId?._id || req.body.mechanicId;
      updatedMechanic = await Mechanic.findOneAndUpdate(
        { userId: updatedBooking.mechanicId._id },
        { availability: true },
        { new: true } // ensure to return updated data
      );
    }

    // 6. emit live update to both customer and mechanic
    const io = req.app.get('io');
    const socketUserMap = req.app.get('socketUserMap');
    if (io && socketUserMap) {
      const custSocket = socketUserMap[updatedBooking.customerId._id.toString()];
      const mechSocket = updatedBooking.mechanicId ? socketUserMap[updatedBooking.mechanicId._id.toString()] : null;
      if (custSocket) io.to(custSocket).emit('booking_status_updated', { booking: updatedBooking });
      if (mechSocket) io.to(mechSocket).emit('booking_status_updated', { booking: updatedBooking });
    }

    // 7. respond with updated booking + mechanic availability
    res.json({
      booking: updatedBooking,
      mechanic: updatedMechanic || null
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all bookings (for testing/admin)
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await ServiceBooking.find()
      .populate('customerId', 'name phone')
      .populate('mechanicId', 'name phone')
      .populate('serviceId', 'name price');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
