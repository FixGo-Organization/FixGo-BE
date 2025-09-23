import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minlength: 3 },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "mechanic"], default: "customer" },


    address: { type: String },
    experience: { type: String },
    skills: [{ type: String }],
    workingHours: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
