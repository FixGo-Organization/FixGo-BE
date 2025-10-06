const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");

// Tạo chat mới
exports.createChat = async (req, res) => {
  try {
    const chat = await Chat.create(req.body);
    res.status(201).json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Lấy danh sách chat của user
exports.getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.params.userId })
      .populate("participants", "name avatar")
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Gửi message
exports.sendMessage = async (req, res) => {
  try {
    const { chatId, senderId, content } = req.body;
    const message = await Message.create({ chatId, senderId, content });
    await Chat.findByIdAndUpdate(chatId, { lastMessage: content, lastMessageAt: new Date() });
    res.status(201).json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Lấy message theo chatId
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .populate("senderId", "name avatar")
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
