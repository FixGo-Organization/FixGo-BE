const mongoose = require('mongoose');

const garageSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    ratingAverage: { type: Number, default: 0 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

garageSchema.index({ location: "2dsphere" });

module.exports = mongoose.models.Garage || mongoose.model("Garage", garageSchema);
