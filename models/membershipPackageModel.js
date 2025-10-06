const mongoose = require('mongoose');
const membershipPackageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    durationInDays: { type: Number, required: true }, // ví dụ: 30 ngày
  },
  { timestamps: true }
);

module.exports = mongoose.models.MembershipPackage || mongoose.model("MembershipPackage", membershipPackageSchema);
