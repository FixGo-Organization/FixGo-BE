const express = require('express');
const garageController = require('../controller/garageController');
const router = express.Router();

router.post("/garages", garageController.createGarage);
router.get("/garages", garageController.getAllGarages);
router.get("/garages/:id", garageController.getGarageById);
router.put("/garages/:id", garageController.updateGarage);
router.delete("/garages/:id", garageController.deleteGarage);

module.exports = router;
