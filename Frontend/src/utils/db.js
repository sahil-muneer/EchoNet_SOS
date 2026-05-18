import Dexie from 'dexie';

// Initialize local browser database
export const db = new Dexie('EchoNetOfflineDB');

// Create a table for emergency nodes
db.version(1).stores({
  emergencyNodes: '++id, name, category, lat, lng, distance' 
});