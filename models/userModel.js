import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minlength: 3 }, 
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },


    role: { 
      type: String, 
      enum: ["customer", "mechanic", "garage"], 
      default: "customer" 
    },


    avatar: { type: String, default: "" },
    birthday: { type: Date },
    language: { type: String, default: "Việt Nam" },
    rating: { type: Number, default: 0 },

  
    experience: { type: String },
    skills: [{ type: String }],
    workingHours: { type: String },

    garageName: { type: String },
    services: [{ type: String }],
    priceRange: { type: String },
    mechanicCount: { type: Number, default: 0 },


    rawAddress: { type: String },
    address: { type: String },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true }
);


userSchema.index({ location: "2dsphere" });

export default mongoose.model("User", userSchema);
