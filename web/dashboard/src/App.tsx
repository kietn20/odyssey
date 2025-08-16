// File: web/dashboard/src/App.tsx
// Purpose: Main application component to display the drone dashboard.

import React, { useState, useEffect } from 'react';
import './App.css';

const WEBSOCKET_URL = 'ws://localhost:8080/ws';

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

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
    </div>
  );
}

export default App;