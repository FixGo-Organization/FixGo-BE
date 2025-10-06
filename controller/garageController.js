const Garage = require("../models/garageModel");

exports.createGarage = async (req, res) => {
  try {
    const garage = await Garage.create(req.body);
    res.status(201).json(garage);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllGarages = async (req, res) => {
  try {
    const garages = await Garage.find();
    res.json(garages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getGarageById = async (req, res) => {
  try {
    const garage = await Garage.findById(req.params.id);
    if (!garage) return res.status(404).json({ error: "Garage not found" });
    res.json(garage);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateGarage = async (req, res) => {
  try {
    const garage = await Garage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(garage);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteGarage = async (req, res) => {
  try {
    await Garage.findByIdAndDelete(req.params.id);
    res.json({ message: "Garage deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
