const mongoose = require('mongoose');

const garageEmployeeSchema = new mongoose.Schema(
  {
    garageId: { type: mongoose.Schema.Types.ObjectId, ref: "Garage", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    skills: [{ type: String }],
    roleInGarage: { type: String, default: "mechanic" },
    availability: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.GarageEmployee || mongoose.model("GarageEmployee", garageEmployeeSchema);
