const express = require('express');
const router = express.Router();
const serviceController = require('../controller/serviceController');

router.post("/services", serviceController.createService);
router.get("/services", serviceController.getAllServices);
router.get("/services/:id", serviceController.getServiceById);
router.put("/services/:id", serviceController.updateService);
router.delete("/services/:id", serviceController.deleteService);

module.exports = router;
