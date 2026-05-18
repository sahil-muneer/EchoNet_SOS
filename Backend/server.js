require('dotenv').config();
const express = require('express');
const http = require('http'); // 1. HTTP module for Socket.io
const { Server } = require('socket.io'); // 2. Socket.io module
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// --- WEBSOCKET SETUP (THE MISSING PIECE!) ---
const server = http.createServer(app); // Wrap Express in HTTP server

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Make sure this matches your Vite React port!
    methods: ["GET", "POST"]
  }
});

// Make 'io' available globally to all your routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json()); // Essential for the 'Deploy' button to send data

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI, { 
  family: 4 // Bypasses IPv6/DNS issues common on local networks
})
.then(() => console.log('✅ Connected to EchoNet Cloud (Atlas)'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- SCHEMA & MODEL ---
const nodeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  contactNumber: String,
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  }
});

const EmergencyNode = mongoose.model('EmergencyNode', nodeSchema);

// --- ROUTES ---

// 1. GET all nodes (Used when the map loads)
app.get('/api/nodes', async (req, res) => {
  try {
    const nodes = await EmergencyNode.find();
    res.json(nodes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. POST a new node (Used by the "Deploy Node" button)
app.post('/api/nodes', async (req, res) => {
  try {
    const { name, category, contactNumber, longitude, latitude } = req.body;
    
    const newNode = new EmergencyNode({
      name,
      category,
      contactNumber: contactNumber || "N/A",
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      }
    });

    const savedNode = await newNode.save();
    console.log(`🚀 New Node Added: ${savedNode.name}`);

    // 🔴 THE MAGIC LINE: Broadcast this exact new node to React!
    req.io.emit('emergency_alert_triggered', savedNode);

    res.status(201).json(savedNode);
  } catch (err) {
    console.error("❌ Save Error:", err.message);
    res.status(400).json({ message: err.message });
  }
});

// --- SERVER START ---
const PORT = process.env.PORT || 5000;

// IMPORTANT: Notice this is server.listen now, NOT app.listen!
server.listen(PORT, () => {
  console.log(`🛰️ EchoNet Backend & WebSockets Live on Port ${PORT}`);
});