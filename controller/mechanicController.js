const Mechanic = require('../models/mechanicModel');
const User = require('../models/userModel');

// Lấy tất cả thợ online ở gần (ĐÃ SỬA LỖI $project)
exports.getAllMechanics = async (req, res) => {
    try {
        const { availability, latitude, longitude } = req.query;
        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and longitude are required" });
        }
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        const pipeline = [
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [lng, lat] },
                    distanceField: 'distance',
                    maxDistance: 30000,
                    spherical: true
                }
            },
            {
                $lookup: {
                    from: 'mechanics',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'mechanicInfo'
                }
            },
            {
                $match: {
                    'mechanicInfo': { $ne: [] },
                    'mechanicInfo.availability': availability === 'true'
                }
            },
            {
                $project: {
                    // --- SỬA LỖI Ở ĐÂY ---
                    _id: { $arrayElemAt: ['$mechanicInfo._id', 0] },
                    // ---
                    userId: '$_id',
                    name: '$name',
                    avatar: '$avatar',
                    rawAddress: '$rawAddress',
                    location: '$location',
                    distance: '$distance',
                    skills: { $arrayElemAt: ['$mechanicInfo.skills', 0] },
                    experienceYears: { $arrayElemAt: ['$mechanicInfo.experienceYears', 0] },
                    ratingAverage: { $arrayElemAt: ['$mechanicInfo.ratingAverage', 0] },
                    availability: { $arrayElemAt: ['$mechanicInfo.availability', 0] },
                }
            }
        ];
        const mechanics = await User.aggregate(pipeline);
        res.status(200).json({
            status: 'success',
            results: mechanics.length,
            data: mechanics
        });
    } catch (err) {
        console.error("Aggregation Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Cập nhật vị trí (giữ lại phiên bản hiệu quả nhất)
exports.updateLocation = async (req, res) => {
    try {
        const { userId, location } = req.body;
        if (!userId || !location?.type || !Array.isArray(location.coordinates)) {
            return res.status(400).json({ message: "Invalid request body" });
        }
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: { location: location } },
            { new: true }
        );
        if (!updatedUser) {
            return res.status(404).json({ message: "User (Mechanic) not found with this ID" });
        }
        res.json({ message: "User location updated successfully", user: updatedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


// Lấy mechanic theo id (có kèm user info)
exports.getMechanicById = async (req, res) => {
  try {
    const mechanic = await Mechanic.findOne(req.params.userId).populate("userId");
    if (!mechanic) return res.status(404).json({ error: 'Mechanic not found' });
    res.json(mechanic);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// PUT /mechanics/:userId/status
exports.updateStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isOnline } = req.body;

    const mechanic = await Mechanic.findOneAndUpdate(
      { userId },
      { availability: isOnline },
      { new: true }
    );

    if (!mechanic) return res.status(404).json({ message: "Mechanic not found" });

    res.json({ message: "Status updated", mechanic });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};