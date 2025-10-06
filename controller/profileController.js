const User = require("../models/userModel");
const Mechanic = require("../models/mechanicModel");
const bcrypt = require("bcrypt");

// Lấy profile (cả mechanic data nếu là mechanic)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    let mechanicData = null;
    if (user.role === "mechanic") {
      mechanicData = await Mechanic.findOne({ userId }).lean();
    }

    res.json({ ...user, mechanicData });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { name, phone, language, birthday, avatar, skills, workingHours, address } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    // Update thông tin cơ bản
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (language) user.language = language;
    if (birthday) user.birthday = new Date(birthday);
    if (avatar) user.avatar = avatar;
    if (address) user.address = address;

    await user.save();

    // Nếu là mechanic, update thêm mechanicData
    if (user.role === "mechanic") {
      let mechanic = await Mechanic.findOne({ userId });
      if (!mechanic) {
        mechanic = new Mechanic({ userId });
      }
      if (skills) mechanic.skills = skills;
      if (workingHours) mechanic.workingHours = workingHours;
      await mechanic.save();
    }

    res.json({ message: "Cập nhật profile thành công", user });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};
