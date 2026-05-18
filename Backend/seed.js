require('dotenv').config();
const mongoose = require('mongoose');

// --- SCHEMA DEFINITION ---
const emergencyNodeSchema = new mongoose.Schema({
  name: String,
  category: String,
  contactNumber: String,
  location: {
    type: { type: String, default: "Point" },
    coordinates: [Number], // [longitude, latitude]
  }
});

// Create model (checks if already exists to avoid errors)
const EmergencyNode = mongoose.models.EmergencyNode || mongoose.model('EmergencyNode', emergencyNodeSchema);

const seedData = async () => {
  try {
    console.log("Connecting to MongoDB Atlas using Standard Driver...");
    
    // Optimized for the long shard-based MONGO_URI
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      family: 4 // Bypasses IPv6/DNS Handshake issues
    });
    
    console.log("✅ Connected! Purging existing nodes...");
    await EmergencyNode.deleteMany({});

    const nodes = [
      {
        name: "St. John's Medical College Hospital",
        category: "Trauma Center",
        contactNumber: "080 2206 5000",
        location: {
          type: "Point",
          coordinates: [77.6192, 12.9275] 
        }
      },
      {
        name: "Koramangala Police Station",
        category: "Police",
        contactNumber: "080 2294 2570",
        location: {
          type: "Point",
          coordinates: [77.6210, 12.9352]
        }
      }
    ];

    console.log("Inserting Bengaluru node data...");
    await EmergencyNode.insertMany(nodes);
    
    console.log("✅ Real Bengaluru nodes added to Cloud successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding Error:");
    console.error(err.message);
    process.exit(1);
  }
};

seedData();