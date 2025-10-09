
const User = require('../models/userModel');
const Mechanic = require('../models/mechanicModel');
const Mechanic = require('../models/mechanicModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { geocodeAddress } = require('../utils/geocode');

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { 
      name, email, phone, password, role, address, 
      experience, skills, workingHours, birthday 
    } = req.body;

    // Kiểm tra email đã tồn tại
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "Email đã tồn tại!" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    let geoData = null;
    if (role === 'mechanic' && address) {
      try {
        geoData = await geocodeAddress(address);
      } catch (err) {
        console.error('Geocode error:', err?.message || err);
        return res.status(400).json({ message: 'Địa chỉ không hợp lệ' });
      }
    }

    // Tạo user
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      birthday: birthday ? new Date(birthday) : undefined,
      birthday: birthday ? new Date(birthday) : undefined,
      ...(role === "mechanic" && {
        rawAddress: address,
        address: geoData.formatted_address,
        location: {
          type: 'Point',
          coordinates: [geoData.location.lng, geoData.location.lat],
        },
      }),
    });

    // Nếu là mechanic, lấy geo và tạo document Mechanic
    if (role === "mechanic") {
      if (!address) return res.status(400).json({ message: "Cần địa chỉ để đăng ký thợ" });

      let geoData;
      try {
        geoData = await geocodeAddress(address);
      } catch (err) {
        console.error("Geocode error:", err?.message || err);
        return res.status(400).json({ message: "Địa chỉ không hợp lệ" });
      }

      newUser.address = geoData.formatted_address;
      newUser.location = {
        type: "Point",
        coordinates: [geoData.location.lng, geoData.location.lat],
      };
    }

    await newUser.save();

    // Nếu là thợ thì tạo record trong bảng Mechanic
    let mechanic = null;
    if (role === "mechanic") {
      mechanic = new Mechanic({
        userId: newUser._id,
        skills,
        experienceYears: experience || 0,
        availability: true,
      });
      await mechanic.save();
    }

    res.status(201).json({ 
      message: 'Đăng ký thành công!', 
      user: newUser,
      mechanic
    });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};


// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email không tồn tại!" });

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu!" });

    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Trả về đầy đủ field
    res.json({
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        birthday: user.birthday || "",
        language: user.language || "Việt Nam",
        role: user.role,
        avatar: user.avatar || "",
        rating: user.rating || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ============ CHECK PHONE ============
exports.checkPhone = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: 'Phone is required' });

    const user = await User.findOne({ phone });
    res.json({ exists: !!user });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// ============ RESET PASSWORD ============
exports.resetPassword = async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    if (!phone || !newPassword)
      return res.status(400).json({ message: 'Phone and newPassword are required' });

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: 'Số điện thoại chưa đăng ký' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công!' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};