const User = require("../models/User");
const Booking = require("../models/Booking");
const Service = require("../models/Service"); // nếu có bảng Service chứa giá

// ✅ 1. Tổng hợp số liệu dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    const bookings = await Booking.find()
      .populate("customerId", "name email")
      .populate("mechanicId", "name")
      .populate("garageId", "name")
      .populate("serviceId", "name price");

    // Đếm theo trạng thái
    const activeStatuses = ["đã nhận", "đang di chuyển", "đang sửa"];
    const activeBookings = bookings.filter(b => activeStatuses.includes(b.status)).length;
    const completedBookings = bookings.filter(b => b.status === "hoàn thành").length;

    // Doanh thu (nếu serviceId có price)
    const totalRevenue = bookings.reduce((sum, b) => {
      const servicePrice = b.serviceId?.price || 0;
      return sum + servicePrice;
    }, 0);

    res.status(200).json({
      totalUsers,
      activeBookings,
      completedBookings,
      revenue: totalRevenue
    });
  } catch (err) {
    console.error("❌ Error fetching dashboard stats:", err);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

// ✅ 2. Lấy danh sách bookings chi tiết
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("customerId", "name email phone")
      .populate("mechanicId", "name")
      .populate("garageId", "name")
      .populate("serviceId", "name price");
    res.status(200).json(bookings);
  } catch (err) {
    console.error("❌ Error fetching bookings:", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

// ✅ 3. Tính tổng doanh thu (chỉ tính booking hoàn thành)
exports.getRevenue = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "hoàn thành" })
      .populate("serviceId", "price");
    const totalRevenue = bookings.reduce((sum, b) => {
      const price = b.serviceId?.price || 0;
      return sum + price;
    }, 0);
    res.status(200).json({ total: totalRevenue });
  } catch (err) {
    console.error("❌ Error fetching revenue:", err);
    res.status(500).json({ error: "Failed to fetch revenue" });
  }
};
