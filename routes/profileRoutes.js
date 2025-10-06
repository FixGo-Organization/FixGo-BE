const express = require("express");
const router = express.Router();
const profileController = require("../controller/profileController");

// GET profile theo userId
router.get("/:userId", profileController.getProfile);

// PUT update profile
router.put("/:userId", profileController.updateProfile);

module.exports = router;
