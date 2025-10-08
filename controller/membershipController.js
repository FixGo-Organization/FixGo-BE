const Membership = require("../models/membershipPackageModel");

exports.createMembership = async (req, res) => {
  try {
    const membership = await Membership.create(req.body);
    res.status(201).json(membership);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllMemberships = async (req, res) => {
  try {
    const memberships = await Membership.find();
    res.json(memberships);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMembershipById = async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership) return res.status(404).json({ error: "Membership not found" });
    res.json(membership);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateMembership = async (req, res) => {
  try {
    const membership = await Membership.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(membership);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteMembership = async (req, res) => {
  try {
    await Membership.findByIdAndDelete(req.params.id);
    res.json({ message: "Membership deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
