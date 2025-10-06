const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // ai tham gia
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },  // liên kết với booking (nếu chat khi đặt thợ)
    lastMessage: { type: String }, // lưu tin nhắn cuối để show nhanh
  },
  { timestamps: true }
);

module.exports = mongoose.models.Chat || mongoose.model("Chat", chatSchema);
