const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minlength: 3 },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { 
      type: String, 
      enum: ["customer", "mechanic", "garageOwner", "garageEmployee", "admin"], 
      default: "customer" 
    },
    avatar: { type: String, default: "" },
    rawAddress: { type: String },
    address: { type: String },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
