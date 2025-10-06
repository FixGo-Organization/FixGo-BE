const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    basePrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Service || mongoose.model("Service", serviceSchema);
