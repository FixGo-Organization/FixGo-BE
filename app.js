const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const serviceBookingRoutes = require('./routes/serviceBookingRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const userRoutes = require('./routes/userRoutes');
const garageRoutes = require('./routes/garageRoutes');
const membershipRoutes = require('./routes/membershipRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

// store io and a simple map
const socketUserMap = {}; // { userId: socketId } - ephemeral
app.set('io', io);
app.set('socketUserMap', socketUserMap);

// socket handlers
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  // client should emit 'register' with current userId after connect
  socket.on('register', (userId) => {
    if (!userId) return;
    socketUserMap[userId] = socket.id;
    console.log('registered', userId, socket.id);
  });

  socket.on('disconnect', () => {
    // remove mapping
    for (const [userId, sId] of Object.entries(socketUserMap)) {
      if (sId === socket.id) {
        delete socketUserMap[userId];
        break;
      }
    }
    console.log('socket disconnected', socket.id);
  });
});

// routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', serviceBookingRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/garages', garageRoutes);
app.use('/api/memberships', membershipRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/chats', chatRoutes);

// connect DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✔ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('✖ DB Error:', err));

