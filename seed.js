const mongoose = require("mongoose");
const User = require("./models/userModel");
const Mechanic = require("./models/mechanicModel");
const Service = require("./models/serviceModel"); // nhớ tạo model Service { name, price }
const Booking = require("./models/bookingModel");

async function seed() {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/FixGo");
    console.log("✅ Connected to DB");

    // clear collections

    console.log("🧹 Cleared collections");

    // customers
    const customers = await User.insertMany([
      {
        name: "Nguyen Van A",
        email: "a@example.com",
        phone: "0901111111",
        password: "123456",
        role: "customer",
        address: "Hà Nội",
        location: { type: "Point", coordinates: [105.814444, 21.028511] },
      },
      {
        name: "Nguyen Van B",
        email: "b@example.com",
        phone: "0902222222",
        password: "123456",
        role: "customer",
        address: "HCM",
        location: { type: "Point", coordinates: [106.660172, 10.762622] },
      },
    ]);
    console.log("👤 Customers created:", customers.map(c => c.email));

    // mechanics (users)
    const mechanicUsers = await User.insertMany([
      {
        name: "Tho Sua 1",
        email: "m1@example.com",
        phone: "0903333333",
        password: "123456",
        role: "mechanic",
        address: "Hà Nội",
        location: { type: "Point", coordinates: [105.815, 21.03] },
      },
      {
        name: "Tho Sua 2",
        email: "m2@example.com",
        phone: "0904444444",
        password: "123456",
        role: "mechanic",
        address: "HCM",
        location: { type: "Point", coordinates: [106.67, 10.77] },
      },
    ]);

    // mechanic profiles
    const mechanicProfiles = await Mechanic.insertMany([
      { userId: mechanicUsers[0]._id, skills: ["Vá lốp"], experienceYears: 3 },
      { userId: mechanicUsers[1]._id, skills: ["Thay nhớt"], experienceYears: 5 },
    ]);
    console.log("🔧 Mechanics created:", mechanicUsers.map(m => m.name));

    // services
    const services = await Service.insertMany([
      { name: "Vá lốp", price: 50000 },
      { name: "Thay nhớt", price: 150000 },
      { name: "Kéo xe", price: 300000 },
    ]);
    console.log("🛠 Services created:", services.map(s => s.name));

    // bookings
    const bookings = await Booking.insertMany([
      {
        customerId: customers[0]._id,
        mechanicId: mechanicProfiles[0]._id,
        serviceId: services[0]._id,
        location: { type: "Point", coordinates: [105.814444, 21.028511] },
        status: "đang chờ",
        scheduledAt: new Date(),
        price: 50000,
      },
      {
        customerId: customers[1]._id,
        mechanicId: mechanicProfiles[1]._id,
        serviceId: services[1]._id,
        location: { type: "Point", coordinates: [106.660172, 10.762622] },
        status: "đang sửa",
        scheduledAt: new Date(),
        price: 150000,
      },
    ]);
    console.log("📦 Bookings created:", bookings.map(b => b._id.toString()));

    console.log("🎉 Seed done!");
  } catch (err) {
    console.error("❌ Seed error", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected");
  }
}

seed();
