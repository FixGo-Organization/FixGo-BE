import express from "express";
import { register, login,checkPhone,resetPassword } from "../controller/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/check-phone", checkPhone);
router.post("/reset-password", resetPassword);
export default router;
