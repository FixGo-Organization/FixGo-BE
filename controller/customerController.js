const User = require("../models/userModel");

exports.lookingForMechanics = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.body; 

    if (
      latitude === undefined ||
      longitude === undefined ||
      radius === undefined
    ) {
      return res
        .status(400)
        .json({ message: "Latitude, Longitude & Radius are required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const r = parseFloat(radius);

    const mechanics = await User.find({
      role: "mechanic",
      location: {
        $geoWithin: {
          $centerSphere: [[lng, lat], r / 20],
        },
      },
    }).select("name avatar location phone");

    res.json(mechanics);
  } catch (err) {
    console.error("✖ Error in lookingForMechanics:", err);
    res.status(500).json({ error: err.message });
  }
};
