require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load models. userModel may be ES module (export default) or CommonJS. Handle both.
let User;
const Service = require('./models/serviceModel');
const ServiceBooking = require('./models/serviceBookingModel');
const Rating = require('./models/ratingModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/FixGo';

async function connect() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
}

async function seed() {
  try {
    await connect();

    // Load User model robustly: prefer dynamic import (ESM), then commonjs wrapper, then require
    try {
      try {
        const mod = await import('./models/userModel.js');
        User = mod.default || mod;
      } catch (esmErr) {
        try {
          User = require('./models/userModel.js');
        } catch (cjsWrapperErr) {
          User = require('./models/userModel');
        }
      }
    } catch (err) {
      console.error('Failed to load User model:', err);
      throw err;
    }

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Service.deleteMany({}),
      ServiceBooking.deleteMany({}),
      Rating.deleteMany({})
    ]);
    console.log('Cleared collections');

    // Create users
    const passwordHash = await bcrypt.hash('password123', 8);
    const users = await User.create([
      { name: 'Khach Hang A', email: 'a@example.com', phone: '0909000001', password: passwordHash },
      { name: 'Khach Hang B', email: 'b@example.com', phone: '0909000002', password: passwordHash }
    ]);
    console.log('Created users:', users.map(u => u.email));

    // Create services
    const services = await Service.create([
      { name: 'Vá lốp', description: 'Vá lốp tại chỗ', defaultPrice: 50000 },
      { name: 'Thay nhớt', description: 'Thay nhớt + kiểm tra tổng quát', defaultPrice: 120000 },
      { name: 'Kéo xe', description: 'Kéo xe cứu hộ', defaultPrice: 300000 }
    ]);
    console.log('Created services:', services.map(s => s.name));

    // Create mechanics as Users with role 'mechanic'
    const mechanics = await User.create([
      {
        name: 'Tho Sua 1',
        email: 'ms1@example.com',
        phone: '0911000001',
        password: passwordHash,
        role: 'mechanic',
        documents: { cmnd: '111111111' },
        services: [services[0]._id, services[1]._id],
        servicePrices: [
          { service: services[0]._id, price: 60000 },
          { service: services[1]._id, price: 150000 }
        ],
        rating: 4.7,
        location: { type: 'Point', coordinates: [106.70098, 10.77653] },
        status: 'online',
        working: false
      },
      {
        name: 'Tho Sua 2',
        email: 'ms2@example.com',
        phone: '0911000002',
        password: passwordHash,
        role: 'mechanic',
        documents: { cmnd: '222222222' },
        services: [services[0]._id, services[2]._id],
        servicePrices: [
          { service: services[0]._id, price: 55000 },
          { service: services[2]._id, price: 350000 }
        ],
        rating: 4.3,
        location: { type: 'Point', coordinates: [106.69500, 10.78000] },
        status: 'online',
        working: false
      }
    ]);
    console.log('Created mechanics:', mechanics.map(m => m.name));

    // Create bookings
    const bookings = await ServiceBooking.create([
      {
        user: users[0]._id,
        location: { type: 'Point', coordinates: [106.69800, 10.77700] },
        vehicleType: 'xe máy',
        issueType: 'xịt lốp',
        note: 'Gần cổng trường',
        mechanic: mechanics[0]._id,
        status: 'đang sửa'
      },
      {
        user: users[1]._id,
        location: { type: 'Point', coordinates: [106.70200, 10.77500] },
        vehicleType: 'ô tô',
        issueType: 'hết bình',
        note: '',
        status: 'chờ thợ'
      }
    ]);
    console.log('Created bookings:', bookings.map(b => b._id));

      // Create sample ratings
      const ratings = await Rating.create([
        {
          rater: users[0]._id,
          mechanic: mechanics[0]._id,
          booking: bookings[0]._id,
          score: 5,
          comment: 'Làm nhanh, nhiệt tình'
        },
        {
          rater: users[1]._id,
          mechanic: mechanics[1]._id,
          score: 4,
          comment: 'Khá tốt'
        }
      ]);
      console.log('Created ratings:', ratings.map(r => r.score));

    console.log('Seeding finished');
  } catch (err) {
    console.error('Seed error', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
    process.exit(0);
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
