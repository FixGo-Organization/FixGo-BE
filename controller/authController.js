import User from "../models/userModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ================= REGISTER =================
export const register = async (req, res) => {
  try {
    const { name, email, phone, password, role, address, experience, skills, workingHours } =
      req.body;


    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "Email đã tồn tại!" });


    const hashedPassword = await bcrypt.hash(password, 10);


    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      ...(role === "mechanic" && { address, experience, skills, workingHours }),
    });

    await newUser.save();
    res.status(201).json({ message: "Đăng ký thành công!", user: newUser });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// ================= LOGIN =================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;


    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email không tồn tại!" });


    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Sai mật khẩu!" });


    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Đăng nhập thành công!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};
// ============ CHECK PHONE ============
export const checkPhone = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: "Phone is required" });

    const user = await User.findOne({ phone });
    res.json({ exists: !!user });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};

// ============ RESET PASSWORD ============
export const resetPassword = async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    if (!phone || !newPassword)
      return res.status(400).json({ message: "Phone and newPassword are required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: "Số điện thoại chưa đăng ký" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Server error" });
  }
};