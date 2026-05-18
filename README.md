# 🛰️ EchoNet SOS: Autonomous Emergency Command Grid

💾 **Production Status:** Core System Engine Frozen (v1.0.0 Stable)  
🏆 **Project Purpose:** IIT Madras Road Safety Hackathon 2026 Submission  
🔒 **Architecture:** Full-Stack Decoupled MERN Node Engine + IoT Hardware Interface Matrix

---

## 📌 Executive Summary
EchoNet SOS is a tactical, low-latency emergency command dashboard engineered to eliminate critical infrastructure delays during the **"Golden Hour"** of trauma response. The platform transforms scattered smart city sensor inputs into a unified, high-visibility spatial intelligence command board. 

By orchestrating simulated automated computer vision cameras, edge telemetry nodes, and autonomous drone dispatch vectors, EchoNet SOS ensures emergency services reach accident sites instantly—even under complete network blackout conditions.

---

## ⚡ Core Operational Pillars

### 🤖 1. AI Crash Intercept Matrix
* **Automated Surveillance Feeds:** Employs an isolated, hardware-accelerated Picture-in-Picture (PiP) CCTV monitor component tracking localized camera intersections.
* **Pixel Tensor Simulation:** Uses a continuous multi-state loop that simulates real-time vehicle deformation matching, allowing dispatchers to witness automated incident isolation frames with dynamic tracking overlays (e.g., `CRASH: 98% MATCH`).

### 🛸 2. Tactical UAV Reconnaissance Protocol
* **Aerial First-Responder Deployment:** Automatically handles immediate state switches to launch a reconnaissance drone straight from the local command headquarters pin out to the geographical incident coordinate.
* **Night-Vision Optics:** Embeds a simulated tactical infrared/night-vision video element inside the control dashboard tracking dynamic telemetry constraints including fluctuating speed (`SPD`) and altitude (`ALT`) envelopes.

### 🛡️ 3. "Unbreakable" Edge-Cached Survival Matrix
* **Total Infrastructure Blackout Isolation:** Built specifically to survive network dropouts, cable severing, or complete cloud database failures.
* **Offline Client Storage:** Intercepts outgoing data payloads during internet connection drops and serializes infrastructure additions directly into an explicit browser cache layer, keeping spatial mapping loops completely functional offline.

### 📡 4. Embedded Hardware Ingestion Interface
* **Microcontroller Telemetry Architecture:** Outfitted with structural pipeline parameters designed to listen for data transmission arrays coming from remote edge microcontrollers (such as the ESP32-CAM).
* **Impact Verification Envelopes:** Tracks incoming telemetry parameters to capture severe structural shock events (e.g., `14.2G G-Force Acceleration Spike`), validating incidents and dispatching response networks instantly.

### 🗺️ 5. Geospatial Routing & Dossier Compiling
* **Haversine Distance Metrics:** Employs high-precision coordinate geometry calculation logic to parse arrays of infrastructure assets and pinpoint the absolute closest medical, police, or roadside recovery team without computational lag.
* **Dynamic PDF Dossier Compiling:** Integrates a serverless screen capture layout system that bundles active map routing states and dispatch metrics into a localized, downloadable legal incident archive via client-side binary compilation.

---

## 🛠️ Complete Technical Stack

| Architecture Layer | Core Technology | Strategic System Execution |
| :--- | :--- | :--- |
| **User Interface** | React.js (v18) | Component-driven reactive command layouts. |
| **Development Engine** | Vite | Ultra-fast localized development environment & module bundling. |
| **Spatial Mapping** | React-Leaflet & OSM | Inverted dark-mode hardware-accelerated map grids and polylines. |
| **Real-Time Pipeline** | Socket.io-client | Live persistent event sockets for automated incident injection. |
| **Data Analytics** | Recharts Core | Live, color-coded situational metric bar chart tracking asset loads. |
| **Dossier Compiler** | html2canvas & jsPDF | Local DOM binary parsing to output printable validation documents. |
| **Server Engine** | Node.js & Express.js | Low-overhead REST API routing layer and asynchronous packet listener. |
| **Database Tier** | MongoDB & Mongoose | Schematized document store for structural nodes and coordinate logging. |

---

## 📂 Project Architecture Mapping

```text
EchoNet_SOS/
├── .gitignore           # Global asset lock (node_modules, local keys)
├── README.md            # Master system operations guide
├── Backend/
│   ├── models/          # Schema enforcement components
│   ├── routes/          # Express API route endpoints
│   ├── seed.js          # Pre-packaged smart city infrastructure generation array
│   └── server.js        # Node.js gateway entry point & live Socket.io loop
└── Frontend/
    ├── index.html       # Primary application access layer
    ├── vite.config.js   # Module compilation configurations
    ├── package.json     # Client library structural rules
    └── src/
        ├── main.jsx     # Vite React DOM orchestration script
        ├── App.jsx      # Master Command Grid interface controller
        └── utils/       # Geometrical routing calculation formulas
```

---

## 🚀 Deployment Instructions

### System Environment Requirements
* **Node.js** (v16.x or superior engine runtime)
* **MongoDB Core** (Active local system daemon or a remote cloud Atlas URI)

### 1. Repository Setup
```bash
git clone https://github.com/sahil-muneer/EchoNet_SOS.git
cd EchoNet_SOS
```

### 2. Launching the Backend Server Core
```bash
cd Backend
npm install
```

Generate an isolated environment file named `.env` in the root of the `Backend/` folder:
```text
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

Boot the server instance:
```bash
npm start
```

### 3. Launching the Control Dashboard UI
Open a secondary terminal workspace and load the layout assets:
```bash
cd Frontend
npm install
```

Generate an environment configuration file named `.env` in the root of the `Frontend/` folder:
```text
VITE_API_BASE_URL=http://localhost:5000/api
```

Execute the application frame:
```bash
npm run dev
```

Navigate your local browser window to `http://localhost:5173` to initialize the operational Command Matrix.

---

> 💡 **Operational Guideline:** Upon interface mounting, immediately click the yellow **"Init Demo Grid"** button on the control column. This pulls the synchronized infrastructure node network directly into your localized dashboard matrix.