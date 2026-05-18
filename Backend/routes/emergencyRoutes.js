const express = require('express');
const router = express.Router();
// const EmergencyNode = require('../models/EmergencyNode');

// GET: Fetch emergency nodes within a 100km radius for Offline Caching
router.post('/cache-radius', async (req, res) => {
  const { latitude, longitude, radiusKm } = req.body;

  try {
    // ROUND 1 SIMULATION: Mocking the OpenStreetMap Overpass API response
    // In production, this queries the 2dsphere MongoDB index or the live OSM API.
    const simulatedGlobalData = [
      { id: 1, name: "City General Trauma Center", category: "Trauma Center", lat: latitude + 0.01, lng: longitude + 0.01, distance: "1.2 km" },
      { id: 2, name: "Highway Patrol Outpost", category: "Police", lat: latitude - 0.02, lng: longitude + 0.015, distance: "2.5 km" },
      { id: 3, name: "24/7 Rapid Towing", category: "Towing", lat: latitude + 0.05, lng: longitude - 0.03, distance: "5.8 km" }
    ];

    console.log(`[Offline Engine] Caching ${simulatedGlobalData.length} nodes for coords: ${latitude}, ${longitude}`);

    res.status(200).json({
      success: true,
      message: "Spatial data successfully fetched for predictive offline caching.",
      data: simulatedGlobalData
    });
  } catch (error) {
    console.error("Routing Error:", error);
    res.status(500).json({ success: false, message: "Server Error during spatial query." });
  }
});

module.exports = router;