const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true }, 
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ai gửi
    content: { type: String }, // nội dung text
    type: { 
      type: String, 
      enum: ["text", "image", "file"], 
      default: "text" 
    },
    fileUrl: { type: String }, // nếu type = image/file
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);
