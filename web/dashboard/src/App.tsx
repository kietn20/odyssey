// File: web/dashboard/src/App.tsx
// Purpose: Main application component to display the drone dashboard.

import React, { useState, useEffect } from 'react';
import './App.css';
import TelemetryTable from './components/TelemetryTable';
import FleetMap from './components/FleetMap';
import MissionPlanner from './components/MissionPlanner';

// const WEBSOCKET_URL = 'ws://localhost:8080/ws';
const WEBSOCKET_URL = 'ws://localhost:30080/ws';
// const COMMAND_API_URL = 'http://localhost:8081/api/command'
const COMMAND_API_URL = 'http://localhost:30081/api/command'
const MISSIONS_API_URL = 'http://localhost:30081/api/missions';

interface Waypoint {
  latitude: number;
  longitude: number;
}

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
  const [missionName, setMissionName] = useState("");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

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

  const handleSaveMission = async () => {
    if (!missionName || waypoints.length === 0) {
      alert("Please enter a mission name and add at least one waypoint.");
      return;
    }

    console.log("Saving mission:", { name: missionName, waypoints });

    try {
      const response = await fetch(MISSIONS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: missionName,
          waypoints: waypoints,
        }),
      });

      if (!response.ok) {
        // If the server returns an error, we'll get the text and show it.
        const errorText = await response.text();
        throw new Error(`Failed to save mission: ${response.status} ${errorText}`);
      }

      const savedMission = await response.json();
      console.log("Successfully saved mission:", savedMission);

      // Optionally, show a success message to the user
      alert(`Mission "${savedMission.name}" saved with ID ${savedMission.id}!`);

      // Clear the form for the next mission
      handleClearMission();

    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
        alert(`Error saving mission: ${error.message}`);
      } else {
        console.error("Unknown error:", error);
        alert("An unknown error occurred while saving the mission.");
      }
    }
  };

  const handleClearMission = () => {
    setMissionName("");
    setWaypoints([]);
  };

  const handleMapClick = (latlng: { lat: number, lng: number }) => {
    const newWaypoint = { latitude: latlng.lat, longitude: latlng.lng };
    // We use the functional form of setState to ensure we are always
    // working with the latest version of the waypoints array.
    setWaypoints(prevWaypoints => [...prevWaypoints, newWaypoint]);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Odyssey Mission Control</h1>
        <p>Telemetry Service Status: <strong>{connectionStatus}</strong></p>
      </header>

      <main className="main-content">
        <div className="map-container">
          <FleetMap
            drones={telemetryData}
            waypoints={waypoints}
            onMapClick={handleMapClick}
          />
        </div>

        <div className="bottom-panel">
          <div style={{ flex: 1.2 }}>
            <MissionPlanner
              missionName={missionName}
              setMissionName={setMissionName}
              waypoints={waypoints}
              onSaveMission={handleSaveMission}
              onClearMission={handleClearMission}
            />
          </div>
          <div className="table-container" style={{ flex: 2 }}> {/* Table gets more space */}
            <TelemetryTable drones={telemetryData} onSendCommand={handleSendCommand} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;