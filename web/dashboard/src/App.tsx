// File: web/dashboard/src/App.tsx
// Purpose: Main application component to display the drone dashboard.

import React, { useState, useEffect } from 'react';
import './App.css';
import TelemetryTable from './components/TelemetryTable';
import FleetMap from './components/FleetMap';


const WEBSOCKET_URL = 'ws://localhost:8080/ws';
const COMMAND_API_URL = 'http://localhost:8081/api/command'

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

  const handleSendCommand = async (droneId: string, command: string) => {
    console.log(`Sending command '${command}' to drone ${droneId}`);
    try {
      const response = await fetch(COMMAND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // JSON.stringify converts our JavaScript object into a JSON string.
        body: JSON.stringify({
          droneId: droneId,
          command: command,
          payload: {}, // Empty for our PING command
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('C2 Service responded:', result);

    } catch (error) {
      console.error("Failed to send command:", error);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Odyssey Mission Control</h1>
        <p>Telemetry Service Status: <strong>{connectionStatus}</strong></p>
      </header>

      {/* New main content layout */}
      <main className="main-content">
        <div className="map-container">
          <FleetMap drones={telemetryData} />
        </div>
        <div className="table-container">
          <TelemetryTable drones={telemetryData} onSendCommand={handleSendCommand}/>
        </div>
      </main>
    </div>
  );
}

export default App;