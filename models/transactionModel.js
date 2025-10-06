const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true },
        type: { type: String, enum: ["deposit", "withdraw", "payment", "refund"], required: true },
        status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
