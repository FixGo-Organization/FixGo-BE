const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema(
    {
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        mechanicId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, default: null }, // mechanics are stored in User
        garageId: { type: mongoose.Schema.Types.ObjectId, ref: "Garage" },
        serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], required: true }, // [lng, lat]
            address: { type: String, required: false } // Add address field
        },
        description: { type: String, required: false }, // Add description field
        status: {
            type: String,
            enum: ['đang chờ', 'đã nhận', 'đang di chuyển', 'đang sửa', 'hoàn thành', 'hủy'],
            default: 'đang chờ'
        },
        vehicleInfo: {
            type: String, 
        },
        scheduledAt: { type: Date },
        completedAt: { type: Date },
    },
    { timestamps: true }
);

bookingSchema.index({ location: "2dsphere" });

module.exports = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
