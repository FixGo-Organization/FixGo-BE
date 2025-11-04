const express = require("express");
const { getDashboardStats, getAllBookings, getRevenue } = require("../controller/dashboardController");
const router = express.Router();

router.get("/", getDashboardStats);
router.get("/bookings", getAllBookings);
router.get("/revenue", getRevenue);

module.exports = router;
