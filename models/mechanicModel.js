const mongoose = require('mongoose');

const mechanicSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    skills: [{ type: String }],
    experienceYears: { type: Number, default: 0 },
    licenseNumber: { type: String },
    ratingAverage: { type: Number, default: 0 },
    availability: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Mechanic || mongoose.model("Mechanic", mechanicSchema);
