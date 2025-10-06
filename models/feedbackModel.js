const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ai đánh giá
    mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: "Mechanic" },
    garageId: { type: mongoose.Schema.Types.ObjectId, ref: "Garage" },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);
