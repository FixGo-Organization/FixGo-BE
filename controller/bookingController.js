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
}};