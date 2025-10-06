const express = require('express');
const membershipController = require('../controller/membershipController');
const router = express.Router();

router.post("/memberships", membershipController.createMembership);
router.get("/memberships", membershipController.getAllMemberships);
router.get("/memberships/:id", membershipController.getMembershipById);
router.put("/memberships/:id", membershipController.updateMembership);
router.delete("/memberships/:id", membershipController.deleteMembership);
module.exports = router;