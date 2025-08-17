// File: web/dashboard/src/App.tsx
// Purpose: Main application component to display the drone dashboard.

import React, { useState, useEffect } from 'react';
import './App.css';

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
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryData | null>(null);

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

    ws.onmessage = (event) => {
      try {
        const data: TelemetryData = JSON.parse(event.data);
        setLatestTelemetry(data);
      } catch (error) {
        console.error("Failed to parse incoming message:", event.data)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('Error');
    };

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
      <main>
        {/* We now render the latest telemetry data if it exists. */}
        {latestTelemetry ? (
          <div className="telemetry-display">
            <h2>Latest Telemetry</h2>
            {/* The <pre> tag is great for displaying formatted code or JSON */}
            <pre>{JSON.stringify(latestTelemetry, null, 2)}</pre>
          </div>
        ) : (
          <p>Awaiting first telemetry packet...</p>
        )}
      </main>
    </div>
  );
}

export default App;