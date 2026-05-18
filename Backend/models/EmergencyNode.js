const mongoose = require('mongoose');

const emergencyNodeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Trauma Center', 'Police', 'Towing', 'Mechanic'], 
    required: true 
  },
  contactNumber: { type: String, default: "Not Available" },
  source: { type: String, default: "OpenStreetMap" }, // Proves global applicability
  location: {
    type: {
      type: String,
      enum: ['Point'], 
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude] format required for GeoJSON
      required: true
    }
  }
}, { timestamps: true });

// CRITICAL: The 2dsphere index allows lightning-fast offline radius caching
emergencyNodeSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('EmergencyNode', emergencyNodeSchema);