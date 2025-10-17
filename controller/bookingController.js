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
    console.error("❌ Error creating booking:", err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
};

// Lấy danh sách thợ gần đó
exports.getNearbyMechanics = async (req, res) => {
  try {
    const { lat, lng, distance = 20 } = req.query;
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
    if (booking.status != 'đang chờ') {
      console.log('>>> [DEBUG] failed to assign mechanic: ', mechanicId, 'to booking', bookingId, ' - invalid booking status:', booking.status);
      return res.status(400).json({
        error: `Cannot assign mechanic. Booking status must be 'đang chờ', current status is '${booking.status}'.`
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

// customer directly requests a chosen mechanic
exports.requestSpecificMechanic = async (req, res) => {
  try {
    const { bookingId, mechanicId } = req.body;
    if (!bookingId || !mechanicId)
      return res.status(400).json({ error: 'bookingId and mechanicId required' });

    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // attach temporarily for reference
    booking.preferredMechanicId = mechanicId;
    await booking.save();

    // notify that mechanic
    const io = req.app.get('io');
    const socketUserMap = req.app.get('socketUserMap');
    if (io && socketUserMap) {
      const mechSocket = socketUserMap[mechanicId];
      if (mechSocket)
        io.to(mechSocket).emit('direct_booking_request', { booking });
    }

    res.json({ message: 'Booking sent to chosen mechanic', booking });
  } catch (err) {
    console.error('Error requesting specific mechanic:', err);
    res.status(400).json({ error: err.message });
  }
};

// customer rejects mechanic offer
exports.rejectMechanic = async (req, res) => {
  try {
    const { bookingId, mechanicId } = req.body;
    if (!bookingId || !mechanicId)
      return res.status(400).json({ error: 'bookingId and mechanicId required' });

    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // reset mechanic
    booking.mechanicId = null;
    booking.status = 'đang chờ';
    await booking.save();

    // set mechanic available again
    await Mechanic.findOneAndUpdate({ userId: mechanicId }, { availability: true });

    // notify both sides
    const io = req.app.get('io');
    const socketUserMap = req.app.get('socketUserMap');
    if (io && socketUserMap) {
      const mechSocket = socketUserMap[mechanicId];
      const custSocket = socketUserMap[booking.customerId.toString()];
      if (mechSocket)
        io.to(mechSocket).emit('booking_rejected_by_customer', { bookingId });
      if (custSocket)
        io.to(custSocket).emit('booking_rejection_confirmed', { bookingId });
    }

    res.json({ message: 'Mechanic rejected successfully, booking reopened.' });
  } catch (err) {
    console.error('Error rejecting mechanic:', err);
    res.status(400).json({ error: err.message });
  }
};

// mechanic rejects booking
exports.mechanicRejectBooking = async (req, res) => {
  try {
    const { bookingId, mechanicId } = req.body;
    if (!bookingId || !mechanicId)
      return res.status(400).json({ error: 'bookingId and mechanicId required' });

    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // ensure status is still waiting
    if (booking.status !== 'đang chờ')
      return res.status(400).json({ error: 'Cannot reject. Booking not waiting for mechanic.' });

    const io = req.app.get('io');
    const socketUserMap = req.app.get('socketUserMap');
    if (io && socketUserMap) {
      const custSocket = socketUserMap[booking.customerId.toString()];
      if (custSocket)
        io.to(custSocket).emit('booking_rejected_by_mechanic', { bookingId, mechanicId });
    }

    res.json({ message: 'Mechanic rejected booking successfully' });
  } catch (err) {
    console.error('Error mechanic rejecting booking:', err);
    res.status(400).json({ error: err.message });
  }
};

// Cập nhật trạng thái đơn
exports.updateStatus = async (req, res) => {
  try {
    const { bookingId, status } = req.body;
    console.log('🔹 Updating booking status:', { bookingId, status });

    if (!bookingId || !status) return res.status(400).json({ error: 'bookingId and status required' });

    // 1. fetch booking
    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('🔹 Current booking status:', booking.status, '-> New status:', status);

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
    let updatedMechanic = null;
    if (status === 'hoàn thành' && updatedBooking.mechanicId) {
      const mechanicUserId = typeof updatedBooking.mechanicId === 'object'
        ? updatedBooking.mechanicId._id
        : updatedBooking.mechanicId;

      updatedMechanic = await Mechanic.findOneAndUpdate(
        { userId: mechanicUserId },
        { availability: true },
        { new: true } // ensure to return updated data
      );

      console.log('🔹 Updated mechanic availability to true for mechanic:', mechanicUserId);
    }

    // 6. emit live update to both customer and mechanic
    const io = req.app.get('io');
    const socketUserMap = req.app.get('socketUserMap');

    console.log("🔹 socketUserMap:", socketUserMap);
    console.log("🔹 Customer socket ID:", updatedBooking.customerId._id.toString(), "=>", socketUserMap[updatedBooking.customerId._id.toString()]);

    if (io && socketUserMap) {
      const custSocket = socketUserMap[updatedBooking.customerId._id.toString()];
      const mechSocket = updatedBooking.mechanicId ? socketUserMap[updatedBooking.mechanicId._id.toString()] : null;

      console.log("🔹 Emitting booking_status_updated to customer socket:", custSocket);
      console.log("🔹 Emitting booking_status_updated to mechanic socket:", mechSocket);
      console.log("🔹 Updated booking status:", updatedBooking.status);

      if (custSocket) io.to(custSocket).emit('booking_status_updated', { booking: updatedBooking });
      if (mechSocket) io.to(mechSocket).emit('booking_status_updated', { booking: updatedBooking });
    }

    // 7. respond with updated booking + mechanic availability
    res.json({
      booking: updatedBooking,
      availability: updatedMechanic?.availability ?? null
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

// get bookings for a specific mechanic with distance calculations
exports.getMechanicBookings = async (req, res) => {
  try {
    const mechanicId = req.params.mechanicId || req.userId; // from auth middleware or params
    if (!mechanicId) {
      return res.status(400).json({ error: 'Mechanic ID is required' });
    }

    // Get mechanic's location for distance calculation
    const mechanic = await User.findById(mechanicId).select('location');
    if (!mechanic || !mechanic.location) {
      return res.status(404).json({ error: 'Mechanic not found or location not set' });
    }

    const mechanicCoords = mechanic.location.coordinates; // [lng, lat]

    // Fetch bookings for this mechanic or nearby pending bookings
    const bookings = await ServiceBooking.find({
      $or: [
        { mechanicId: mechanicId }, // bookings assigned to this mechanic
        { status: 'đang chờ' } // pending bookings that can be picked up
      ]
    })
      .populate('customerId', 'name phone email avatar')
      .populate('mechanicId', 'name phone')
      .populate('serviceId', 'name price')
      .sort({ createdAt: -1 });

    // Calculate distances and format response
    const bookingsWithDistance = bookings.map(booking => {
      let distance = null;

      if (booking.location && booking.location.coordinates) {
        const customerCoords = booking.location.coordinates; // [lng, lat]

        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in kilometers
        const dLat = (customerCoords[1] - mechanicCoords[1]) * Math.PI / 180;
        const dLon = (customerCoords[0] - mechanicCoords[0]) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(mechanicCoords[1] * Math.PI / 180) * Math.cos(customerCoords[1] * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = (R * c).toFixed(2); // Distance in km
      }

      return {
        id: booking._id,
        customer: booking.customerId?.name || 'Unknown',
        email: booking.customerId?.email || '',
        phone: booking.customerId?.phone || '',
        avatar: booking.customerId?.avatar || 'https://randomuser.me/api/portraits/men/85.jpg',
        address: booking.location?.address || 'Address not provided',
        coordinates: booking.location?.coordinates || null,
        status: booking.status,
        description: booking.description || '',
        service: booking.serviceId?.name || 'Emergency Service',
        price: booking.serviceId?.price || 0,
        distance: distance ? `${distance} km` : 'Unknown',
        distanceKm: distance ? parseFloat(distance) : null,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        completedAt: booking.completedAt
      };
    });

    // Sort by distance (closest first) for pending bookings, or by date for assigned bookings
    const sortedBookings = bookingsWithDistance.sort((a, b) => {
      if (a.status === 'đang chờ' && b.status === 'đang chờ') {
        return (a.distanceKm || 999) - (b.distanceKm || 999); // closest first
      }
      return new Date(b.createdAt) - new Date(a.createdAt); // newest first
    });

    res.json(sortedBookings);
  } catch (err) {
    console.error('Error fetching mechanic bookings:', err);
    res.status(500).json({ error: err.message });
  }
};

// get bookings with pagination, filtering, searching  (for admin/customer/mechanic history)
exports.getBookings = async (req, res) => {
  try {
    const { role, userId, page = 1, limit = 10, status, search } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let filter = {}; // <-- bỏ :any

    // filter theo role
    if (role === "customer") filter.customerId = userId;
    if (role === "mechanic") filter.mechanicId = userId;

    // filter theo status nếu có
    if (status) {
      filter.status = status;
    }

    // filter theo search (tìm theo tên, email, phone, address)
    if (search) {
      const searchRegex = new RegExp(search, "i"); // i = ignore case
      filter.$or = [
        { "customerId.name": searchRegex },
        { "customerId.email": searchRegex },
        { "customerId.phone": searchRegex },
        { "customerId.address": searchRegex },
      ];
    }

    const bookings = await ServiceBooking.find(filter)
      .populate("customerId", "name email phone avatar address")
      .populate("mechanicId", "name email phone")
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const mapped = bookings.map((b) => ({
      id: b._id,
      customer: b.customerId?.name || "Ẩn danh",
      date: b.createdAt.toLocaleString("vi-VN"),
      email: b.customerId?.email || "",
      phone: b.customerId?.phone || "",
      address: b.customerId?.address || "",
      status: mapStatus(b.status),
      image:
        b.customerId?.avatar ||
        "https://randomuser.me/api/portraits/men/85.jpg",
    }));

    const total = await ServiceBooking.countDocuments(filter);

    res.json({
      data: mapped,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Chờ xác nhận", "Đang xử lý", "Hoàn thành", "Từ chối"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Trạng thái không hợp lệ" });
    }

    const booking = await ServiceBooking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking không tồn tại" });
    }

    res.json({ message: "Cập nhật thành công", booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSpecificBooking = async (req, res) => {
    try {
        const { customerId, mechanicId, location, description, status } = req.body;

        // SỬA LỖI 1: Dùng đúng tên model "ServiceBooking"
        const newBooking = new ServiceBooking({
            customerId,
            mechanicId,
            location,
            description,
            status,
        });
        await newBooking.save();

        // SỬA LỖI 2: Dùng trực tiếp `mechanicId` vì nó chính là `userId`
        const mechanicUserId = mechanicId; 
        
        const io = req.app.get('io');
        const socketUserMap = req.app.get('socketUserMap');
        const mechanicSocketId = socketUserMap[mechanicUserId];

        if (mechanicSocketId) {
            console.log(`Sending new_booking_request to mechanic (user: ${mechanicUserId}) via socket ${mechanicSocketId}`);
            io.to(mechanicSocketId).emit('new_booking_request', newBooking);
        } else {
            console.log(`Mechanic (user: ${mechanicUserId}) is not connected via socket.`);
        }

        res.status(201).json(newBooking);

    } catch (error) {
        console.error("Error in createSpecificBooking:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.createEmergencyBooking = async (req, res) => {
    try {
        const { customerId, location, description, status } = req.body;

        // SỬA LỖI 1: Dùng đúng tên model "ServiceBooking"
        const newBooking = new ServiceBooking({
            customerId,
            location,
            description,
            status,
        });
        await newBooking.save();

        const io = req.app.get('io');
        const socketUserMap = req.app.get('socketUserMap');
        const [lng, lat] = location.coordinates;

        // Tìm các User là thợ ở gần
        const nearbyUsers = await User.find({
            role: 'mechanic',
            location: {
                $nearSphere: {
                    $geometry: { type: "Point", coordinates: [lng, lat] },
                    $maxDistance: 10000 // 10km
                }
            }
        }).select('_id');

        const nearbyUserIds = nearbyUsers.map(user => user._id);

        // Lọc ra những thợ đang online
        const onlineMechanics = await Mechanic.find({
            userId: { $in: nearbyUserIds },
            availability: true
        }).select('userId');

        const onlineMechanicUserIds = onlineMechanics.map(mec => mec.userId.toString());

        console.log(`Found ${onlineMechanicUserIds.length} online mechanics nearby. Broadcasting...`);
        onlineMechanicUserIds.forEach(mechanicUserId => {
            const mechanicSocketId = socketUserMap[mechanicUserId];
            if (mechanicSocketId) {
                io.to(mechanicSocketId).emit('new_emergency_request', newBooking);
            }
        });

        res.status(201).json(newBooking);

    } catch (error) {
        console.error("Error in createEmergencyBooking:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params; // Lấy ID từ URL

        // Tìm booking bằng ID và populate thông tin của customer và mechanic
        const booking = await ServiceBooking.findById(bookingId)
            .populate('customerId', 'name avatar phone') // Lấy các trường cần thiết của customer
            .populate({
                path: 'mechanicId',
                select: 'name avatar phone location', // Lấy các trường cần thiết của mechanic (là User)
            });

        // Nếu không tìm thấy booking, trả về lỗi 404
        if (!booking) {
            return res.status(404).json({ message: 'Không tìm thấy booking.' });
        }
        
        // Trả về dữ liệu booking đã tìm thấy
        res.status(200).json(booking);

    } catch (error) {
        console.error("Lỗi khi lấy chi tiết booking:", error);
        res.status(500).json({ error: error.message });
    }
};

// // Thợ gửi feedback / rating cho khách
// exports.submitFeedback = async (req, res) => {
//   try {
//     const { bookingId, mechanicId, score, comment } = req.body;

//     const booking = await ServiceBooking.findById(bookingId).populate("customerId");

//     if (!booking) return res.status(404).json({ message: "Booking không tồn tại" });
//     if (booking.mechanicId.toString() !== mechanicId) {
//       return res.status(403).json({ message: "Bạn không phải thợ của booking này" });
//     }

//     // Tạo rating
//     const rating = new Rating({
//       rater: mechanicId,
//       mechanic: booking.mechanicId,
//       booking: bookingId,
//       score,
//       comment,
//     });
//     await rating.save();

//     // Tạo feedback cho khách hàng
//     const feedback = new feedback({
//       bookingId,
//       userId: booking.customerId._id,
//       mechanicId,
//       rating: score,
//       comment,
//     });
//     await feedback.save();

//     res.status(201).json({ message: "Feedback & Rating đã gửi", rating, feedback });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
function mapStatus(status) {
  switch (status) {
    case "pending":
      return "Chờ xác nhận";
    case "accepted":
      return "Đang xử lý";
    case "completed":
      return "Hoàn thành";
    case "rejected":
      return "Từ chối";
    default:
      return status;
  }
};
