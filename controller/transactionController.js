const Transaction = require("../models/transactionModel");

exports.createTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.create(req.body);
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find().populate("userId");
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
