const express = require('express');
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
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => console.error('✖ DB Error:', err));
