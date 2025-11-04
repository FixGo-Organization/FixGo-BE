const express = require("express");
const { getDashboardStats, getAllBookings, getRevenue } = require("../controllers/dashboardController");
const router = express.Router();

router.get("/", getDashboardStats);
router.get("/bookings", getAllBookings);
router.get("/revenue", getRevenue);

module.exports = router;
