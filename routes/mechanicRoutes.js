const express = require('express');
const mechanicController = require('../controller/mechanicController');
const router = express.Router();

// Lấy tất cả thợ online ở gần
router.get('/all', mechanicController.getAllMechanics);

// Cập nhật vị trí của một thợ (dùng userId)
router.post('/update-location', mechanicController.updateLocation);

// Cập nhật trạng thái online/offline của thợ
router.put('/:userId/status', mechanicController.updateStatus);

// Lấy thông tin chi tiết của một thợ (dùng mechanicId)
router.get('/:id', mechanicController.getMechanicById);

module.exports = router;