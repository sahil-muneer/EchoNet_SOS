import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { io } from 'socket.io-client'; 
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet-routing-machine';
import 'leaflet.heat'; 
import jsPDF from 'jspdf'; 
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const socketURL = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') : 'http://localhost:5000';
const socket = io(socketURL);

const DefaultIcon = L.icon({ iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const getIncidentIcon = (categoryStr) => {
  const category = categoryStr || '';
  let color = '#10b981'; 
  if (category.includes('Crash')) color = '#ef4444';
  else if (category.includes('Crime')) color = '#3b82f6';
  else if (category.includes('Fire')) color = '#f97316';
  else if (category.includes('Breakdown')) color = '#eab308';
  else if (category.includes('Fuel')) color = '#14b8a6';

  return L.divIcon({
    html: `<div class="radar-marker" style="background: ${color}; box-shadow: 0 0 15px ${color}, 0 0 30px ${color};"></div>`,
    className: 'custom-radar-container',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const DroneIcon = L.divIcon({
  html: `<div style="font-size: 28px; filter: drop-shadow(0 0 12px #a855f7); animation: float 2s ease-in-out infinite;">🛸</div>`,
  className: 'custom-drone-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const historicalAccidentData = [
  [12.9176, 77.6246, 0.8], [12.9180, 77.6250, 0.9], [12.9165, 77.6235, 0.7],
  [12.9784, 77.5694, 0.85], [12.9790, 77.5700, 0.75], [13.0358, 77.5970, 0.8]
];

const globalSosData = {
  'India': { emergency: '112', medical: '108', highway: '1033' },
  'USA / Canada': { emergency: '911', medical: '911', highway: '511' },
  'United Kingdom': { emergency: '999', medical: '111', highway: '112' },
  'Europe (EU)': { emergency: '112', medical: '112', highway: '112' },
  'Australia': { emergency: '000', medical: '000', highway: '131 444' }
};

const demoNodes = [
  { name: "Apollo Hospital Jayanagar", category: "Hospital", contactNumber: "+91 80 2297 7777", lat: 12.9226, lng: 77.5916 },
  { name: "Manipal Hospital HAL", category: "Hospital", contactNumber: "+91 80 4011 9000", lat: 12.9591, lng: 77.6474 },
  { name: "Fortis Bannerghatta", category: "Hospital", contactNumber: "+91 80 6621 4444", lat: 12.8943, lng: 77.5975 },
  { name: "Koramangala Police Station", category: "Police", contactNumber: "+91 80 2294 2571", lat: 12.9298, lng: 77.6254 },
  { name: "Indiranagar Police Station", category: "Police", contactNumber: "+91 80 2294 2545", lat: 12.9783, lng: 77.6408 },
  { name: "Jayanagar Fire Station", category: "Fire Station", contactNumber: "+91 80 2297 1515", lat: 12.9304, lng: 77.5815 },
  { name: "HSR Layout Towing & Recovery", category: "Towing Service", contactNumber: "+91 98801 23456", lat: 12.9121, lng: 77.6446 },
  { name: "Shell Fuel Station BTM", category: "Fuel Station", contactNumber: "+91 80 5555 1234", lat: 12.9165, lng: 77.6101 },
  { name: "IndianOil Central", category: "Fuel Station", contactNumber: "+91 80 5555 9876", lat: 12.9710, lng: 77.5900 }
];

const announceSystemAudio = (message) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); 
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 1.05; utterance.pitch = 0.95; 
    window.speechSynthesis.speak(utterance);
  }
};

const playEmergencySiren = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gainNode = ctx.createGain();
    osc.connect(gainNode); gainNode.connect(ctx.destination);
    
    if (type === 'Police') {
      osc.type = 'sine'; for(let i=0; i<6; i++) { osc.frequency.setValueAtTime(600, ctx.currentTime + (i*0.3)); osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + (i*0.3) + 0.15); }
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime); gainNode.gain.setValueAtTime(0, ctx.currentTime + 1.8); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.8);
    } else if (type === 'Fire') {
      osc.type = 'square'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.linearRampToValueAtTime(250, ctx.currentTime + 1.5);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.5);
    } else if (type === 'Tow') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(800, ctx.currentTime); gainNode.gain.setValueAtTime(0.1, ctx.currentTime); gainNode.gain.setValueAtTime(0, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.type = 'square'; osc.frequency.setValueAtTime(750, ctx.currentTime); osc.frequency.setValueAtTime(1150, ctx.currentTime + 0.4); osc.frequency.setValueAtTime(750, ctx.currentTime + 0.8);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime); gainNode.gain.setValueAtTime(0, ctx.currentTime + 1.2); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.2);
    }
  } catch (error) { console.error("Audio blocked:", error); }
};

function RecenterMap({ coords }) {
  const map = useMap(); 
  useEffect(() => { if (coords && !isNaN(coords.lat) && !isNaN(coords.lng)) map.flyTo([coords.lat, coords.lng], 13); }, [coords, map]); 
  return null;
}

function HeatmapLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points) return; const heatLayer = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 15, gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' } }).addTo(map);
    return () => { if (map && heatLayer) map.removeLayer(heatLayer); };
  }, [map, points]); return null;
}

function RoutingEngine({ startCoords, endCoords, lineColor, onRouteCalculated }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !startCoords || !endCoords || isNaN(startCoords[0]) || isNaN(endCoords[0])) return;
    const routingControl = L.Routing.control({
      waypoints: [L.latLng(startCoords[0], startCoords[1]), L.latLng(endCoords[0], endCoords[1])],
      lineOptions: { styles: [{ color: lineColor || '#ef4444', weight: 6, opacity: 0.85 }] }, addWaypoints: false, draggableWaypoints: false, fitSelectedRoutes: true, show: false
    }).addTo(map);
    routingControl.on('routesfound', function (e) { const summary = e.routes[0].summary; onRouteCalculated({ eta: Math.ceil(summary.totalTime / 60), realRoadKm: (summary.totalDistance / 1000).toFixed(1) }); });
    return () => { if (map && routingControl) map.removeControl(routingControl); };
  }, [map, startCoords, endCoords, lineColor]); return null;
}

function DroneFlight({ start, end, isFlying, onArrived }) {
  const [position, setPosition] = useState(null);
  useEffect(() => { if (Array.isArray(start) && !isNaN(start[0]) && !isNaN(start[1])) { setPosition(start); } }, [start]);
  useEffect(() => {
    if (!isFlying || !start || !end) return;
    let step = 0; const totalSteps = 60; 
    const interval = setInterval(() => {
      step++; const ratio = step / totalSteps;
      const lat = start[0] + (end[0] - start[0]) * ratio;
      const lng = start[1] + (end[1] - start[1]) * ratio;
      setPosition([lat, lng]);
      if (step >= totalSteps) { clearInterval(interval); onArrived(); }
    }, 50);
    return () => clearInterval(interval);
  }, [isFlying, start, end, onArrived]);

  if (!isFlying || !position || isNaN(position[0]) || isNaN(position[1])) return null;
  return <Marker position={position} icon={DroneIcon} />;
}

function MapClicker({ setFormData }) {
  useMapEvents({ click(e) { setFormData(prev => ({ ...prev, lat: e.latlng.lat.toFixed(6), lng: e.latlng.lng.toFixed(6) })); } });
  return null;
}

function App() {
  const [nodes, setNodes] = useState([]);
  const [userLocation, setUserLocation] = useState({ lat: 12.9716, lng: 77.5946 }); 
  const [activeRoute, setActiveRoute] = useState(null); 
  const [showHeatmap, setShowHeatmap] = useState(false); 
  const [routeMetrics, setRouteMetrics] = useState(null); 
  const [isOffline, setIsOffline] = useState(!navigator.onLine); 
  const [isListening, setIsListening] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: 'Hospital', contact: '', lat: '', lng: '' });
  const [activeRegion, setActiveRegion] = useState('India');

  const [hwLog, setHwLog] = useState("[SYSTEM] Awaiting ESP32-CAM Node Link...");
  const [isHwActive, setIsHwActive] = useState(false);

  const [droneStart, setDroneStart] = useState(null);
  const [droneEnd, setDroneEnd] = useState(null);
  const [isDroneFlying, setIsDroneFlying] = useState(false);
  const [droneArrived, setDroneArrived] = useState(false);

  const [aiLog, setAiLog] = useState("[AI CORE] Feed Intercept Matrix Standing By...");
  const [aiZoneCoords, setAiZoneCoords] = useState(null);
  const [isAiScanning, setIsAiScanning] = useState(false);

  const [activeVideoFeed, setActiveVideoFeed] = useState(null); 

  const safeNodesArray = Array.isArray(nodes) ? nodes : [];

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => { setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }); },
        (error) => { console.warn("Background location guess failed.", error); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const forceLocateMe = () => {
    const loadingToast = toast.loading("📡 Pinging GPS satellites...", { theme: "dark" });
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          toast.dismiss(loadingToast); toast.success("🎯 High-accuracy GPS lock acquired!", { theme: "dark" });
        },
        (error) => {
          toast.dismiss(loadingToast); toast.error("⚠️ Browser blocked GPS. Please drag your blue pin manually to your exact location.", { theme: "dark", autoClose: 5000 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else { toast.dismiss(loadingToast); toast.error("⚠️ Hardware GPS not found.", { theme: "dark" }); }
  };

  const syncDatabaseNodes = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/nodes`);
      if (!response.ok) throw new Error("Backend offline");
      const dbData = await response.json();
      if (Array.isArray(dbData)) {
        setNodes(dbData); localStorage.setItem('echonet_nodes_cache', JSON.stringify(dbData)); return dbData;
      }
    } catch (err) {
      const offlineCache = localStorage.getItem('echonet_nodes_cache');
      if (offlineCache) {
        try { const parsed = JSON.parse(offlineCache); if (Array.isArray(parsed)) { setNodes(parsed); return parsed; } } catch(e) {}
      }
    }
    return [];
  };

  const injectDemoGrid = async () => {
    const currentLiveNodes = await syncDatabaseNodes();
    const generatedNodes = demoNodes.map(node => ({
      _id: "DEMO_" + Math.random().toString(36).substring(7),
      name: node.name, category: node.category, contactNumber: node.contactNumber, location: { type: 'Point', coordinates: [node.lng, node.lat] }
    }));
    const uniqueGenerated = generatedNodes.filter(dNode => !currentLiveNodes.some(lNode => lNode.name === dNode.name));
    const mergedGrid = [...currentLiveNodes, ...uniqueGenerated];
    setNodes(mergedGrid); localStorage.setItem('echonet_nodes_cache', JSON.stringify(mergedGrid));
    setHwLog("[SYSTEM] Merged server database with localized testing networks."); toast.success("📡 Smart City assets synchronized successfully!", { theme: "dark" });
  };

  const triggerDispatch = (incidentNode, allNodes) => {
    let targetCategory = ''; let uiColor = ''; let sirenType = ''; let agencyName = '';
    const incidentCategory = incidentNode.category || '';
    
    if (incidentCategory.includes('Crash')) { targetCategory = 'Hospital'; uiColor = '#ef4444'; sirenType = 'Ambulance'; agencyName = 'Medical Unit'; }
    else if (incidentCategory.includes('Crime')) { targetCategory = 'Police'; uiColor = '#3b82f6'; sirenType = 'Police'; agencyName = 'Police Unit'; }
    else if (incidentCategory.includes('Fire Breakout')) { targetCategory = 'Fire Station'; uiColor = '#f97316'; sirenType = 'Fire'; agencyName = 'Fire Engine'; }
    else if (incidentCategory.includes('Breakdown')) { targetCategory = 'Towing Service'; uiColor = '#eab308'; sirenType = 'Tow'; agencyName = 'Tow Truck'; }
    else if (incidentCategory.includes('Out of Fuel')) { targetCategory = 'Fuel Station'; uiColor = '#14b8a6'; sirenType = 'Tow'; agencyName = 'Mobile Fuel Assist'; }
    else return; 

    playEmergencySiren(sirenType);
    const cleanCategory = incidentCategory.replace(/[^a-zA-Z\s]/g, "").trim();
    announceSystemAudio(`Alert. ${cleanCategory} detected. ${agencyName} dispatch sequence initiated.`);

    const assets = allNodes.filter(n => (n.category || '') === targetCategory && n.location && n.location.coordinates);
    if (assets.length > 0) {
      toast.error(`${incidentCategory}: ${incidentNode.name || 'Unknown Location'} mapped. Dispatching nearest ${agencyName}.`, { position: "top-right", autoClose: 8000, theme: "dark" });
      let closestAsset = assets[0];
      let minDistance = parseFloat(calculateDistance(incidentNode.location.coordinates[1], incidentNode.location.coordinates[0], closestAsset.location.coordinates[1], closestAsset.location.coordinates[0]));
      
      assets.forEach(asset => {
        const d = parseFloat(calculateDistance(incidentNode.location.coordinates[1], incidentNode.location.coordinates[0], asset.location.coordinates[1], asset.location.coordinates[0]));
        if (d < minDistance) { minDistance = d; closestAsset = asset; }
      });
      
      setRouteMetrics(isOffline ? { eta: Math.ceil((minDistance / 30) * 60) + 2, realRoadKm: (minDistance * 1.3).toFixed(1) } : null);
      
      setActiveRoute({
        incidentName: incidentNode.name || 'Incident', assetName: closestAsset.name || 'Asset', agency: agencyName, distance: minDistance.toFixed(2),
        assetCoords: [closestAsset.location.coordinates[1], closestAsset.location.coordinates[0]], crashCoords: [incidentNode.location.coordinates[1], incidentNode.location.coordinates[0]], color: uiColor
      });

      setDroneStart([userLocation.lat, userLocation.lng]);
      setDroneEnd([incidentNode.location.coordinates[1], incidentNode.location.coordinates[0]]);
    } else { 
      setActiveRoute(null); setRouteMetrics(null); setDroneStart(null); setDroneEnd(null);
      toast.warning(`⚠️ No ${targetCategory} found in the network! Spawn infrastructure nodes first.`, { theme: "dark" }); 
      announceSystemAudio(`Error. No ${targetCategory} found in network grid.`);
    }
  };

  const simulateHardwareImpact = () => {
    setDroneArrived(false); setIsDroneFlying(false); setAiZoneCoords(null); setActiveVideoFeed(null);
    let requiredAsset = "Hospital";
    const assetExists = safeNodesArray.some(n => (n.category || '') === requiredAsset);
    if (!assetExists) return toast.warning("⚠️ Infrastructure not seeded! Please click 'Init Demo Grid' before simulating hardware.", { theme: "dark" });

    setIsHwActive(true);
    const mockLocations = [
      { name: "Sector Alpha (Central)", lat: 12.9716, lng: 77.5946 }, { name: "Sector Bravo (Indiranagar)", lat: 12.9640, lng: 77.6380 },
      { name: "Sector Charlie (Koramangala)", lat: 12.9352, lng: 77.6244 }, { name: "Sector Delta (Jayanagar)", lat: 12.9284, lng: 77.5880 }
    ];
    const randomLoc = mockLocations[Math.floor(Math.random() * mockLocations.length)];
    const randomEvent = "💥 Medical Crash";

    setHwLog(`[ALERT] ESP32-CAM G-FORCE THRESHOLD EXCEEDED (14.2G)\n[ALERT] Source: ${randomLoc.name}\n[ALERT] Event: Crash\n[ALERT] Transmitting packets...`);
    
    const fakeCrashNode = { _id: "HW_MOCK_" + Math.random().toString(36).substring(5), name: `ESP32-CAM Sensor: ${randomLoc.name}`, category: randomEvent, contactNumber: "TELEMETRY OVERRIDE", location: { type: 'Point', coordinates: [randomLoc.lng, randomLoc.lat] } };
    setTimeout(() => { const updated = [...safeNodesArray, fakeCrashNode]; setNodes(updated); triggerDispatch(fakeCrashNode, updated); setIsHwActive(false); }, 1200);
  };

  const triggerAiVisualIntercept = () => {
    setDroneArrived(false); setIsDroneFlying(false); setAiZoneCoords(null); setActiveVideoFeed(null);
    const selection = { camId: "Traffic Cam_08 (MG Road Core)", lat: 12.9754, lng: 77.6068, event: "💥 Medical Crash", info: "Structural deformation 92%", alert: "CRASH ISOLATED", asset: "Hospital" };
    
    const assetExistsOnMap = safeNodesArray.some(n => (n.category || '') === selection.asset);
    if (!assetExistsOnMap) return toast.warning(`⚠️ Infrastructure Node Missing! Click 'Init Demo Grid' to load the base ${selection.asset} assets first.`, { theme: "dark" });

    setIsAiScanning(true); setAiZoneCoords([selection.lat, selection.lng]);
    setActiveVideoFeed('CCTV');

    setAiLog(`[AI CORE] Syncing stream with ${selection.camId}...\n[AI ENGINE] Processing real-time pixel tensors...`);
    announceSystemAudio("Activating AI visual matrix. Scanning traffic feeds.");

    setTimeout(() => {
      setAiLog(`[AI CORE] ${selection.alert}!\n[CV DATA] Target Identification: ${selection.event.substring(2)}\n[CV DATA] Processing Metrics: ${selection.info}\n[CV DATA] Vector: [${selection.lat.toFixed(4)}, ${selection.lng.toFixed(4)}]`);
      const aiDetectedNode = { _id: "AI_INTC_MOCK_" + Math.random().toString(36).substring(5), name: `AI Cam Intelligence: ${selection.camId}`, category: selection.event, contactNumber: "AUTOMATED CV ALGORITHM", location: { type: 'Point', coordinates: [selection.lng, selection.lat] } };
      const updated = [...safeNodesArray, aiDetectedNode]; setNodes(updated); triggerDispatch(aiDetectedNode, updated); setIsAiScanning(false); toast.success(`🤖 AI CV Intercept Core: Isolated ${selection.event.substring(2)} Threat Frame!`, { theme: "dark" });
    }, 3000); 
  };

  const deployDroneRecon = () => {
    if (!droneStart || !droneEnd) return toast.warning("⚠️ No active incident vector to scan.", { theme: "dark" });
    setIsDroneFlying(true); setDroneArrived(false); 
    setActiveVideoFeed('UAV');

    setHwLog(prev => prev + `\n[UAV] Launching Drone Alpha-01 Intercept Vector...`); 
    toast.info("🛸 Drone Alpha-01 launched. En-route to sector coordinates.", { theme: "dark" });
    announceSystemAudio("Aerial drone recon launched. Connecting to live optics.");
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return (R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(2);
  };

  const chartedNodeDistribution = useMemo(() => {
    const counts = { Hospital: 0, Police: 0, 'Fire Station': 0, 'Fuel Station': 0, 'Incident': 0, 'Utility': 0 };
    if (!Array.isArray(safeNodesArray)) return [];
    safeNodesArray.forEach(node => {
      if (node && node.category) {
        const cat = node.category || '';
        if (cat.includes('Crash') || cat.includes('Crime') || cat.includes('Fire Breakout') || cat.includes('Breakdown')) counts['Incident']++;
        else if (cat.includes('Towing') || cat.includes('Puncture') || cat.includes('Out of Fuel')) counts['Utility']++;
        else if (counts[cat] !== undefined) counts[cat]++;
      }
    });
    return [ { name: 'Medical', Count: counts.Hospital }, { name: 'Police', Count: counts.Police }, { name: 'Fire Stn', Count: counts['Fire Station'] }, { name: 'Fuel', Count: counts['Fuel Station'] }, { name: 'Incidents', Count: counts['Incident'] }, { name: 'Utility', Count: counts['Utility'] } ];
  }, [safeNodesArray]);

  const getChartColor = (name) => {
    const colors = { 'Medical': '#ef4444', 'Police': '#3b82f6', 'Fire Stn': '#f97316', 'Fuel': '#14b8a6', 'Incidents': '#eab308', 'Utility': '#8b5cf6' };
    return colors[name] || '#10b981';
  };

  const handleVoiceCommand = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return toast.error("🎤 Voice recognition not supported.", { theme: "dark" });
    const recognition = new SpeechRecognition(); recognition.lang = 'en-US';
    recognition.onstart = () => { setIsListening(true); toast.info("🎙️ Listening... Say 'Hospital', 'Police', or 'Fuel'", { autoClose: 3000, theme: "dark" }); };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase(); setIsListening(false);
      if (transcript.includes("hospital") || transcript.includes("medical")) { setFormData(prev => ({ ...prev, category: 'Hospital' })); toast.success(`✅ "Hospital" selected.`, { theme: "dark" }); }
      else if (transcript.includes("police") || transcript.includes("cop")) { setFormData(prev => ({ ...prev, category: 'Police' })); toast.success(`✅ "Police" selected.`, { theme: "dark" }); }
      else if (transcript.includes("fire station") || transcript.includes("fire")) { setFormData(prev => ({ ...prev, category: 'Fire Station' })); toast.success(`✅ "Fire Station" selected.`, { theme: "dark" }); }
      else if (transcript.includes("crash") || transcript.includes("accident")) { setFormData(prev => ({ ...prev, category: '💥 Medical Crash' })); toast.success(`✅ "Medical Crash" selected.`, { theme: "dark" }); }
      else if (transcript.includes("robbery") || transcript.includes("crime")) { setFormData(prev => ({ ...prev, category: '🚨 Security/Crime' })); toast.success(`✅ "Crime" selected.`, { theme: "dark" }); }
      else if (transcript.includes("fuel") || transcript.includes("petrol") || transcript.includes("gas")) { setFormData(prev => ({ ...prev, category: '⛽ Out of Fuel / Stranded' })); toast.success(`✅ "Out of Fuel" selected.`, { theme: "dark" }); }
      else { toast.warning(`❓ Unknown Command: "${transcript}"`, { theme: "dark" }); }
    };
    recognition.onerror = () => { setIsListening(false); }; recognition.onend = () => { setIsListening(false); }; recognition.start();
  };

  useEffect(() => {
    syncDatabaseNodes();
    const handleAlert = (newNode) => {
      if (!newNode || !newNode.location || !newNode.location.coordinates) return;
      const cachedStr = localStorage.getItem('echonet_nodes_cache'); let currentNodes = cachedStr ? JSON.parse(cachedStr) : [];
      if (!Array.isArray(currentNodes)) currentNodes = []; if (currentNodes.some(node => node._id === newNode._id)) return;
      const updatedNodes = [...currentNodes, newNode]; setNodes(updatedNodes); localStorage.setItem('echonet_nodes_cache', JSON.stringify(updatedNodes)); triggerDispatch(newNode, updatedNodes);
    };
    socket.on('emergency_alert_triggered', handleAlert);
    const goOnline = () => { setIsOffline(false); toast.success("🌐 Connection restored.", { theme: "dark" }); };
    const goOffline = () => { setIsOffline(true); toast.warning("⚠️ Offline. Using local mesh cache.", { autoClose: false, theme: "dark" }); };
    window.addEventListener('online', goOnline); window.addEventListener('offline', goOffline);
    return () => { socket.off('emergency_alert_triggered', handleAlert); window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  const exportIncidentPDF = async () => {
    if (!activeRoute) return;
    const mapElement = document.getElementById('map-viewport-container');
    const compilingToast = toast.info("🔄 Capturing spatial routing vectors...", { autoClose: false, theme: "dark" });
    try {
      const canvas = await html2canvas(mapElement, { useCORS: true, allowTaint: true, ignoreElements: (el) => el.classList.contains('leaflet-control-zoom') });
      const mapImageSrc = canvas.toDataURL('image/png'); const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, 210, 38, 'F'); pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.text('ECHONET SOS COMMAND CENTER', 14, 16);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.text(`OFFICIAL INCIDENT DISPATCH DOSSIER | ${activeRoute.agency.toUpperCase()}`, 14, 24);
      pdf.setTextColor(15, 23, 42); pdf.setFontSize(11); let baselineY = 45;
      const metrics = [
        ['Incident Type:', activeRoute.incidentName], ['Dispatched Asset:', activeRoute.assetName],
        ['Calculated Path:', `${activeRoute.distance} Kilometers`],
        ['Incident Location:', `Lat: ${activeRoute.crashCoords[0].toFixed(4)}, Lng: ${activeRoute.crashCoords[1].toFixed(4)}`],
        ['Asset Location:', `Lat: ${activeRoute.assetCoords[0].toFixed(4)}, Lng: ${activeRoute.assetCoords[1].toFixed(4)}`]
      ];
      metrics.forEach(([label, val]) => { pdf.setFont('helvetica', 'bold'); pdf.text(label, 16, baselineY); pdf.setFont('helvetica', 'normal'); pdf.text(val, 85, baselineY); baselineY += 8; });
      pdf.addImage(mapImageSrc, 'PNG', 14, baselineY + 10, 182, 95); pdf.save(`Incident_Dossier_${activeRoute.incidentName.replace(/\s+/g, '_')}.pdf`);
      toast.dismiss(compilingToast); toast.success("✅ Dossier downloaded!");
    } catch (err) { toast.dismiss(compilingToast); toast.error("❌ Layout rendering failed."); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng || isNaN(formData.lat) || isNaN(formData.lng)) { return toast.error("⚠️ Click the map to set GPS coordinates before deploying!", { position: "top-center", theme: "dark", autoClose: 5000 }); }
    const payload = { name: formData.name, category: formData.category, contactNumber: formData.contact, longitude: parseFloat(formData.lng), latitude: parseFloat(formData.lat) };

    const fallbackLocalSave = () => {
      const mockOfflineNode = { _id: "LOCAL_" + Math.random().toString(36).substring(7), name: payload.name, category: payload.category, contactNumber: payload.contactNumber, location: { type: 'Point', coordinates: [payload.longitude, payload.latitude] } };
      const updatedNodes = [...safeNodesArray, mockOfflineNode]; setNodes(updatedNodes); localStorage.setItem('echonet_nodes_cache', JSON.stringify(updatedNodes));
      const cat = payload.category || '';
      if (cat.includes('Crash') || cat.includes('Crime') || cat.includes('Fire Breakout') || cat.includes('Breakdown') || cat.includes('Out of Fuel')) { triggerDispatch(mockOfflineNode, updatedNodes); } 
      else { toast.success(`📝 ${payload.category} mapped directly via Edge Cache.`, { theme: "dark" }); }
      setFormData({ name: '', category: 'Hospital', contact: '', lat: '', lng: '' });
    };

    if (isOffline) return fallbackLocalSave();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/nodes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (response.ok) {
        setFormData({ name: '', category: 'Hospital', contact: '', lat: '', lng: '' });
        const freshNodes = await syncDatabaseNodes();
        const cat = payload.category || '';
        if (cat.includes('Crash') || cat.includes('Crime') || cat.includes('Fire Breakout') || cat.includes('Breakdown') || cat.includes('Out of Fuel')) { 
          const justAddedNode = freshNodes.find(n => n.name === payload.name && n.category === payload.category);
          if (justAddedNode) triggerDispatch(justAddedNode, freshNodes);
        }
      } else { fallbackLocalSave(); }
    } catch(err) { toast.warning("📡 Server unreachable. Switching to Edge Cache...", { theme: "dark", autoClose: 2000 }); fallbackLocalSave(); }
  };

  const validNodesForMap = useMemo(() => safeNodesArray.filter(node => node && node.location && node.location.coordinates && !isNaN(node.location.coordinates[0]) && !isNaN(node.location.coordinates[1])), [safeNodesArray]);
  const isRouteValid = activeRoute && Array.isArray(activeRoute.assetCoords) && Array.isArray(activeRoute.crashCoords) && !isNaN(activeRoute.assetCoords[0]) && !isNaN(activeRoute.crashCoords[0]);

  const inputStyle = { width: '100%', padding: '12px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', boxSizing: 'border-box', outline: 'none', transition: 'all 0.3s ease' };
  const cardStyle = { background: 'linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.9) 100%)', backdropFilter: 'blur(12px)', padding: '18px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' };

  return (
    <div className={isRouteValid ? "defcon-active" : ""} style={{ display: 'flex', height: '100vh', background: '#020617', color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <ToastContainer limit={3} />
      
      <div style={{ width: '420px', padding: '30px', overflowY: 'auto', background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(20px)', borderRight: '1px solid rgba(255,255,255,0.05)', zIndex: 1000, boxShadow: '10px 0 30px rgba(0,0,0,0.5)' }}>
        <h1 style={{ color: '#ef4444', margin: '0 0 5px 0', textShadow: '0 0 20px rgba(239, 68, 68, 0.5)', letterSpacing: '1px' }}>EchoNet SOS</h1>
        <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '2px' }}>Emergency Command Grid {isOffline && <span style={{color: '#eab308', fontWeight: 'bold', textShadow: '0 0 10px #eab308'}}>(OFFLINE)</span>}</p>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '25px' }}>
          <button className="neon-btn" type="button" onClick={() => setShowHeatmap(!showHeatmap)} style={{ flex: 1, background: showHeatmap ? '#eab308' : 'rgba(59, 130, 246, 0.1)', color: showHeatmap ? 'black' : '#3b82f6', border: `1px solid ${showHeatmap ? '#eab308' : '#3b82f6'}`, padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{showHeatmap ? '⚠️ Hide Risk Heatmap' : '📊 Load Heatmap'}</button>
          <button className="neon-btn" type="button" onClick={injectDemoGrid} style={{ flex: 1, background: 'rgba(139, 92, 246, 0.1)', color: '#a855f7', border: '1px solid #a855f7', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📡 Init Demo Grid</button>
        </div>
        
        <button className="neon-btn" type="button" onClick={forceLocateMe} style={{ width: '100%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid #10b981', padding: '14px', borderRadius: '8px', marginBottom: '30px', cursor: 'pointer', fontWeight: 'bold', textShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}>📍 Target My Live Location</button>

        {isRouteValid && (
          <div style={{ ...cardStyle, border: `1px solid ${activeRoute.color}`, boxShadow: `0 0 20px ${activeRoute.color}40`, marginBottom: '30px' }}>
            <h5 style={{ margin: '0 0 15px 0', color: activeRoute.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{activeRoute.agency} Dispatch Active</h5>
            <button className="neon-btn" type="button" onClick={deployDroneRecon} style={{ width: '100%', background: '#a855f7', border: 'none', padding: '12px', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>🛸 Launch Aerial Drone Recon</button>
            <button className="neon-btn" type="button" onClick={exportIncidentPDF} style={{ width: '100%', background: activeRoute.color, border: 'none', padding: '12px', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>📥 Download Dossier</button>
            <button className="neon-btn" type="button" onClick={() => { setActiveRoute(null); setRouteMetrics(null); setDroneStart(null); setDroneEnd(null); setIsDroneFlying(false); setDroneArrived(false); setAiZoneCoords(null); setActiveVideoFeed(null); }} style={{ width: '100%', background: 'transparent', border: '1px solid #64748b', color: '#94a3b8', padding: '10px', borderRadius: '6px', cursor: 'pointer' }}>Clear Route</button>
          </div>
        )}

        <div style={{ ...cardStyle, borderTop: '2px solid #06b6d4' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: '0', color: '#06b6d4', textShadow: '0 0 10px rgba(6, 182, 212, 0.5)' }}>🤖 AI Crash Intercept Core</h4>
            <span style={{ fontSize: '0.7rem', color: isAiScanning ? '#ef4444' : '#06b6d4', fontWeight: 'bold', letterSpacing: '1px' }}>{isAiScanning ? 'MATRIX SCAN' : 'FEED LIVE'}</span>
          </div>
          <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '12px', borderRadius: '6px', height: '65px', overflowY: 'hidden', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
            <pre style={{ margin: 0, fontSize: '0.7rem', color: '#06b6d4', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{aiLog}</pre>
          </div>
          <button className="neon-btn" type="button" onClick={triggerAiVisualIntercept} style={{ width: '100%', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid #06b6d4', padding: '10px', marginTop: '15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Trigger AI Visual Engine</button>
        </div>

        <div style={{ ...cardStyle, borderTop: '2px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: '0', color: '#8b5cf6', textShadow: '0 0 10px rgba(139, 92, 246, 0.5)' }}>📡 Hardware Telemetry</h4>
            <span style={{ fontSize: '0.7rem', color: isHwActive ? '#ef4444' : '#10b981', fontWeight: 'bold', letterSpacing: '1px' }}>{isHwActive ? 'TRANSMITTING' : 'LINK READY'}</span>
          </div>
          <input placeholder="ESP32-CAM IP: 192.168.1.45" style={{...inputStyle, fontSize: '0.8rem', opacity: 0.5, cursor: 'not-allowed'}} disabled />
          <div style={{ background: 'rgba(2, 6, 23, 0.8)', padding: '12px', borderRadius: '6px', marginTop: '12px', height: '65px', overflowY: 'hidden', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
            <pre style={{ margin: 0, fontSize: '0.7rem', color: '#a855f7', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{hwLog}</pre>
          </div>
          <button className="neon-btn" type="button" onClick={simulateHardwareImpact} style={{ width: '100%', background: 'rgba(139, 92, 246, 0.1)', color: '#a855f7', border: '1px solid #a855f7', padding: '10px', marginTop: '15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Simulate Telemetry Event</button>
        </div>

        <form onSubmit={handleSubmit} style={{ ...cardStyle, borderTop: '2px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4 style={{ margin: '0', color: '#10b981', textShadow: '0 0 10px rgba(16, 185, 129, 0.5)' }}>Add Infrastructure / Incident</h4>
            <button className="neon-btn" type="button" onClick={isOffline ? () => toast.warning("⚠️ Cloud AI Offline.", { theme: "dark" }) : handleVoiceCommand} style={{ background: isOffline ? 'rgba(255,255,255,0.1)' : 'rgba(239, 68, 68, 0.2)', border: isOffline ? 'none' : '1px solid #ef4444', borderRadius: '50%', width: '40px', height: '40px', cursor: isOffline ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: isListening && !isOffline ? '0 0 15px #ef4444' : 'none' }} title="Voice Dispatch">🎙️</button>
          </div>
          <input placeholder="Name (e.g. Apollo / Agara Crash)" style={inputStyle} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          <input placeholder="Contact No. (e.g. +91 98765...)" style={{...inputStyle, marginTop: '12px'}} value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} />
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <input placeholder="Lat" style={inputStyle} value={formData.lat} readOnly /><input placeholder="Lng" style={inputStyle} value={formData.lng} readOnly />
          </div>
          <select style={{...inputStyle, marginTop: '12px', color: '#94a3b8', borderLeft: '4px solid #10b981'}} value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
            <optgroup label="Establish Infrastructure">
              <option value="Hospital">🏥 Hospital</option>
              <option value="Police">🚓 Police Station</option>
              <option value="Fire Station">🚒 Fire Station</option>
              <option value="Towing Service">🛞 Towing / Garage</option>
              <option value="Fuel Station">⛽ Fuel Station / EV Charging</option>
            </optgroup>
            <optgroup label="Deploy Emergency">
              <option value="💥 Medical Crash">💥 Medical Crash (Dispatches Amb)</option>
              <option value="🚨 Security/Crime">🚨 Crime (Dispatches Police)</option>
              <option value="🔥 Fire Breakout">🔥 Fire (Dispatches Fire Engine)</option>
              <option value="🛞 Vehicle Breakdown">🛞 Breakdown (Dispatches Towing)</option>
              <option value="⛽ Out of Fuel / Stranded">⛽ Out of Fuel (Dispatches Fuel Assist)</option>
            </optgroup>
          </select>
          <button className="neon-btn" type="submit" style={{ width: '100%', background: '#10b981', border: 'none', padding: '14px', marginTop: '20px', borderRadius: '8px', color: '#020617', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}>{isOffline ? 'Cache Node Offline' : 'Deploy To Map'}</button>
        </form>

        <div style={{ ...cardStyle }}>
          <h4 style={{ margin: '0 0 20px 0', color: '#eab308' }}>Command Center Analytics</h4>
          <div style={{ width: '100%', height: 140 }}>
            <ResponsiveContainer>
              <BarChart data={chartedNodeDistribution}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(2, 6, 23, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', backdropFilter: 'blur(10px)' }} itemStyle={{ color: '#10b981' }}/>
                {/* 🛡️ RE-ADDED: Safe Smart Color Mapping */}
                <Bar dataKey="Count" radius={[4, 4, 0, 0]}>
                  {chartedNodeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getChartColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <h4 style={{ color: '#94a3b8', marginBottom: '15px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Active Nodes Nearby</h4>
        {safeNodesArray.map(node => {
          if (!node || !node.location || !node.location.coordinates) return null;
          const dist = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, node.location.coordinates[1], node.location.coordinates[0]) : "...";
          const category = node.category || '';
          const isIncident = category.includes('Crash') || category.includes('Crime') || category.includes('Fire Breakout') || category.includes('Breakdown') || category.includes('Out of Fuel');
          let borderColor = '#10b981'; 
          if (category.includes('Medical Crash')) borderColor = '#ef4444'; 
          if (category.includes('Crime')) borderColor = '#3b82f6'; 
          if (category.includes('Fire Breakout')) borderColor = '#f97316'; 
          if (category.includes('Breakdown')) borderColor = '#eab308'; 
          if (category.includes('Out of Fuel')) borderColor = '#14b8a6';
          return (
            <div key={node._id} className="neon-btn" style={{ background: 'rgba(30,41,59,0.4)', padding: '15px', borderRadius: '8px', marginBottom: '10px', borderLeft: `4px solid ${borderColor}`, borderTop: '1px solid rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: isIncident ? borderColor : 'white' }}>{node.name || 'Unknown'}</span><span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{dist} km</span>
              </div>
              <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '6px', textTransform: 'uppercase' }}>{category}</div>
            </div>
          );
        })}
      </div>

      <div id="map-viewport-container" style={{ flex: 1, position: 'relative', background: '#020617', overflow: 'hidden' }}>
        
        {isAiScanning && (
          <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(6, 182, 212, 0.05)', zIndex: 999, pointerEvents: 'none'}}>
             <div className="ai-sweep-laser"></div>
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#06b6d4', fontSize: '2rem', opacity: 0.5, letterSpacing: '5px' }}>[ ANALYZING TENSORS ]</div>
          </div>
        )}

        {/* 🛡️ RE-ADDED: Immediate Tile Fetching */}
        <MapContainer center={[12.9716, 77.5946]} zoom={12} style={{ height: '100%', width: '100%', background: '#020617' }} whenReady={(map) => map.target.invalidateSize()}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapClicker setFormData={setFormData} />
          
          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]} draggable={true} eventHandlers={{ dragend: (e) => { const marker = e.target; const position = marker.getLatLng(); setUserLocation({ lat: position.lat, lng: position.lng }); toast.info("📍 Command Center coordinates locked manually.", { theme: "dark" }); }, }}>
              <Popup><strong style={{color:'#1e293b'}}>Command Center</strong><br/>(Drag to adjust accuracy)</Popup>
            </Marker>
          )}
          
          {validNodesForMap.map(node => {
            const category = node.category || '';
            const isIncident = category.includes('Crash') || category.includes('Crime') || category.includes('Fire Breakout') || category.includes('Breakdown') || category.includes('Out of Fuel');
            return (
              <Marker key={node._id} position={[node?.location?.coordinates[1], node?.location?.coordinates[0]]} icon={isIncident ? getIncidentIcon(category) : DefaultIcon}>
                <Popup>
                  <strong style={{ fontSize: '1.1em', color: '#1e293b' }}>{node.name || 'Unknown'}</strong><br/><span style={{ color: '#64748b', fontWeight: 'bold' }}>{category}</span>
                  {node.contactNumber && (<div style={{ marginTop: '5px', padding: '5px', background: '#f8fafc', borderRadius: '4px', border: '1px solid #cbd5e1' }}><span style={{ color: '#10b981', fontWeight: 'bold' }}>📞 {node.contactNumber}</span></div>)}
                </Popup>
              </Marker>
            );
          })}

          {isRouteValid && !isOffline && ( <RoutingEngine startCoords={activeRoute.assetCoords} endCoords={activeRoute.crashCoords} lineColor={activeRoute.color} onRouteCalculated={(metrics) => setRouteMetrics(metrics)} /> )}
          {isRouteValid && isOffline && ( <Polyline positions={[activeRoute.assetCoords, activeRoute.crashCoords]} color={activeRoute.color} weight={4} dashArray="10, 15" /> )}
          {showHeatmap && <HeatmapLayer points={historicalAccidentData} />}
          <RecenterMap coords={userLocation} />

          {isDroneFlying && droneStart && droneEnd && (
            <DroneFlight start={droneStart} end={droneEnd} isFlying={isDroneFlying} onArrived={() => { setIsDroneFlying(false); setDroneArrived(true); setHwLog(prev => prev + "\n[UAV] Arrived at vector site. Pulse radar active."); }} />
          )}
          {droneArrived && droneEnd && <Polyline positions={[droneStart || [12.9716, 77.5946], droneEnd]} color="#a855f7" weight={2} dashArray="5, 8" opacity={0.6} />}

          {aiZoneCoords && (
            <Circle center={aiZoneCoords} radius={400} pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.15, weight: 2, dashArray: "10, 10" }} />
          )}
        </MapContainer>

        {isRouteValid && routeMetrics && (
          <div className="defcon-scanner-box" style={{ position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)', border: `1px solid ${activeRoute.color}`, borderRadius: '12px', padding: '20px 30px', display: 'flex', alignItems: 'center', gap: '25px', boxShadow: `0 15px 35px rgba(0,0,0,0.5), 0 0 20px ${activeRoute.color}40`, overflow: 'hidden' }}>
            <div className="scan-line" style={{ background: activeRoute.color }}></div>
            <div style={{ position: 'relative', display: 'flex', height: '20px', width: '20px' }}>
              <span style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', position: 'absolute', display: 'inline-flex', height: '100%', width: '100%', borderRadius: '50%', backgroundColor: activeRoute.color, opacity: 0.75 }}></span>
              <span style={{ position: 'relative', display: 'inline-flex', borderRadius: '50%', height: '20px', width: '20px', backgroundColor: activeRoute.color }}></span>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{activeRoute.agency} Intercept Vector</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>⏱️ ETA: <span style={{ color: activeRoute.color, textShadow: `0 0 10px ${activeRoute.color}` }}>{routeMetrics.eta} Mins</span> <span style={{ color: '#64748b', fontSize: '1rem', marginLeft: '12px' }}>({routeMetrics.realRoadKm} km)</span></div>
            </div>
          </div>
        )}

        {activeVideoFeed && (
          <div style={{
            position: 'absolute', bottom: '40px', right: '40px', zIndex: 1000, 
            width: '320px', height: '220px', background: '#000', borderRadius: '12px', 
            border: `2px solid ${activeVideoFeed === 'CCTV' ? '#06b6d4' : '#a855f7'}`,
            boxShadow: `0 0 30px ${activeVideoFeed === 'CCTV' ? '#06b6d4' : '#a855f7'}40`,
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '6px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 'bold', letterSpacing: '1px' }}>
                {activeVideoFeed === 'CCTV' ? '🔴 LIVE: ESP32-CAM [TRAFFIC GRID]' : '🟢 LIVE: UAV ALPHA-01 [NIGHT VISION]'}
              </span>
              <button onClick={() => setActiveVideoFeed(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✖</button>
            </div>
            
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#111' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
                zIndex: 2, pointerEvents: 'none'
              }}></div>
              
              {activeVideoFeed === 'CCTV' ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#1e293b', position: 'relative' }}>
                  <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>Acquiring stream...</div>
                  <div className="bounding-box" style={{ position: 'absolute', width: '80px', height: '60px', border: '2px solid #ef4444', top: '40%', left: '40%', zIndex: 3 }}>
                    <span style={{ position: 'absolute', top: '-18px', left: '-2px', background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '2px 4px', fontWeight: 'bold' }}>CRASH: 98% MATCH</span>
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#064e3b', position: 'relative', filter: 'contrast(1.5) brightness(1.2)' }}>
                   <div className="drone-crosshair" style={{ position: 'absolute', width: '40px', height: '40px', border: '2px solid #10b981', borderRadius: '50%', zIndex: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <div style={{ width: '4px', height: '4px', background: '#10b981', borderRadius: '50%' }}></div>
                      <div style={{ position: 'absolute', top: '-10px', width: '2px', height: '10px', background: '#10b981' }}></div>
                      <div style={{ position: 'absolute', bottom: '-10px', width: '2px', height: '10px', background: '#10b981' }}></div>
                      <div style={{ position: 'absolute', left: '-10px', width: '10px', height: '2px', background: '#10b981' }}></div>
                      <div style={{ position: 'absolute', right: '-10px', width: '10px', height: '2px', background: '#10b981' }}></div>
                   </div>
                   <span style={{ position: 'absolute', bottom: '10px', left: '10px', color: '#10b981', fontSize: '0.6rem', fontFamily: 'monospace', zIndex: 4 }}>ALT: 400M | SPD: 45KM/H</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        @keyframes radar-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.8); }
          70% { box-shadow: 0 0 0 25px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        @keyframes defcon-border-pulse {
          0% { box-shadow: inset -10px 0 30px -10px rgba(239, 68, 68, 0); }
          50% { box-shadow: inset -30px 0 50px -10px rgba(239, 68, 68, 0.3); }
          100% { box-shadow: inset -10px 0 30px -10px rgba(239, 68, 68, 0); }
        }
        @keyframes scan-animation {
          0% { top: -100%; opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { top: 200%; opacity: 0; }
        }
        @keyframes ai-map-sweep {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 100%; opacity: 0.4; }
          100% { top: 0%; opacity: 0.8; }
        }
        @keyframes box-flicker {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes crosshair-pan {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(20px, -15px); }
          50% { transform: translate(-10px, 20px); }
          75% { transform: translate(-25px, -5px); }
        }
        
        .leaflet-layer, .leaflet-control-zoom-in, .leaflet-control-zoom-out, .leaflet-control-attribution {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-container { background: #020617 !important; }
        
        .radar-marker { width: 100%; height: 100%; border-radius: 50%; border: 2px solid white; animation: radar-pulse 1.5s infinite ease-out; }
        .neon-btn { transition: all 0.3s ease; }
        .neon-btn:hover { transform: translateY(-2px); filter: brightness(1.2); }
        .defcon-active > div:first-child { animation: defcon-border-pulse 2s infinite; border-right: 1px solid rgba(239, 68, 68, 0.5) !important; }
        .defcon-scanner-box { position: relative; }
        .scan-line { position: absolute; width: 100%; height: 3px; left: 0; box-shadow: 0 0 10px currentColor; animation: scan-animation 2.5s linear infinite; }
        .ai-sweep-laser { position: absolute; width: 100%; height: 4px; background: #06b6d4; box-shadow: 0 0 20px #06b6d4, 0 0 40px #06b6d4; animation: ai-map-sweep 1.5s infinite ease-in-out; }
        
        .bounding-box { animation: box-flicker 0.8s infinite; }
        .drone-crosshair { animation: crosshair-pan 8s infinite ease-in-out; }

        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #020617; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
}

export default App;