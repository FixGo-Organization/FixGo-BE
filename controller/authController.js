const User = require('../models/userModel');
const Mechanic = require('../models/mechanicModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { geocodeAddress } = require('../utils/geocode');

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, role, address, experience, skills, workingHours, birthday } =
      req.body;

    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: 'Email đã tồn tại!' });

    const hashedPassword = await bcrypt.hash(password, 10);

    let geoData = null;
    if (role === 'mechanic' && address) {
      try {
        geoData = await geocodeAddress(address);
      } catch (err) {
        console.error('Geocode error:', err && err.message ? err.message : err);
        return res.status(400).json({ message: 'Địa chỉ không hợp lệ' });
      }
    }

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      birthday: birthday ? new Date(birthday) : undefined,
      ...(role === "mechanic" && {
        rawAddress: address,
        address: geoData.formatted_address,
        experience,
        skills,
        workingHours,
        location: {
          type: 'Point',
          coordinates: [geoData.location.lng, geoData.location.lat],
        },
      }),
    });

    await newUser.save();

    // create mechanic record if user is a mechanic
    if (role === "mechanic") {
      await Mechanic.create({
        userId: newUser._id,
        skills: skills || [],
        experienceYears: experience || 0,
        availability: true,
      });
    }

    res.status(201).json({ message: 'Đăng ký thành công!', user: newUser });
  } catch (err) {
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