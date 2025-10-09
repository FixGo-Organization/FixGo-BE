const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const mechanicRoutes = require('./routes/mechanicRoutes');
const customerRoutes = require('./routes/customerRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const serviceBookingRoutes = require('./routes/serviceBookingRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const userRoutes = require('./routes/userRoutes');
const garageRoutes = require('./routes/garageRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const chatRoutes = require('./routes/chatRoutes');
const profileRoutes = require('./routes/profileRoutes')
const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL,
      process.env.EXPO_CLIENT_URL,
      "http://192.168.106.184:8081",
      "http://localhost:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store socket connections: { userId: socketId }
const socketUserMap = {};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User registers their ID
  socket.on('register', (userId) => {
    socketUserMap[userId] = socket.id;
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // Remove user from socketUserMap
    for (const [userId, socketId] of Object.entries(socketUserMap)) {
      if (socketId === socket.id) {
        delete socketUserMap[userId];
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

// Make io and socketUserMap available to routes
app.set('io', io);
app.set('socketUserMap', socketUserMap);

// Middleware
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      process.env.EXPO_CLIENT_URL,
      "http://192.168.106.184:8081",
      "http://localhost:3000"
    ],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/mechanics', mechanicRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', serviceBookingRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/garages', garageRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/profile',profileRoutes)

// connect DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✔ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on http://192.168.106.184:${PORT}`);
      console.log(`Socket.IO ready for connections`);
    });
  })
  .catch((err) => console.error('✖ DB Error:', err));
