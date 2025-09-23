import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";

dotenv.config();
const app = express();

// middleware
app.use(
  cors({
    origin: true, 
    credentials: true,
  })
);
app.use(express.json());

// routes
app.use("/api/auth", authRoutes);

// connect DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`Server running on http://192.168.1.5:${PORT}`)
    );
  })
  .catch((err) => console.error("❌ DB Error:", err));
