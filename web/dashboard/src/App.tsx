// File: web/dashboard/src/App.tsx
// Purpose: Main application component to display the drone dashboard.

import React, { useState, useEffect } from 'react';
import './App.css';
import TelemetryTable from './components/TelemetryTable';
import FleetMap from './components/FleetMap';


const WEBSOCKET_URL = 'ws://localhost:8080/ws';

interface TelemetryData {
  droneId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number;
  batteryLevel: number;
  status: string;
}

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [telemetryData, setTelemetryData] = useState<Map<string, TelemetryData>>(new Map());

  useEffect(() => {
    console.log('Attempting to connect to WebSocket...');
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
      console.log('WebSocket connection established.');
      setConnectionStatus('Connected');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed.');
      setConnectionStatus('Disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('Error');
    };

    ws.onmessage = (event) => {
      try {
        const data: TelemetryData = JSON.parse(event.data);
        setTelemetryData(prevMap => new Map(prevMap).set(data.droneId, data));
      } catch (error) {
        console.error("Failed to parse incoming message:", event.data)
      }
    }


    // React will run this function when the component is "unmounted" (removed from the screen) to prevent memory leaks.
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Odyssey Mission Control</h1>
        <p>Telemetry Service Status: <strong>{connectionStatus}</strong></p>
      </header>

      {/* New main content layout */}≈
      <main className="main-content">
        <div className="map-container">
          <FleetMap drones={telemetryData} />
        </div>
        <div className="table-container">
          <TelemetryTable drones={telemetryData} />
        </div>
      </main>
    </div>
  );
}

export default App;