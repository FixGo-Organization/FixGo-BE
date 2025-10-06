const mopngoose = require('mongoose');

const garageServiceSchema = new mongoose.Schema(
  {
    garageId: { type: mongoose.Schema.Types.ObjectId, ref: "Garage", required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    customPrice: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.GarageService || mongoose.model("GarageService", garageServiceSchema);
