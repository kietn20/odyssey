// File: web/dashboard/src/components/TelemetryTable.tsx
// Purpose: A React component to display telemetry data in a table.

import React from 'react';
import './TelemetryTable.css';

interface TelemetryData {
    droneId: string;
    timestamp: string;
    latitude: number;
    longitude: number;
    altitude: number;
    batteryLevel: number;
    status: string;
}

// expects a 'drones' prop, which is a Map of droneId to its telemetry data
interface TelemetryTableProps {
    drones: Map<string, TelemetryData>;
    onSendCommand: (droneId: string, command: string) => void;
}

const TelemetryTable: React.FC<TelemetryTableProps> = ({ drones, onSendCommand }) => {
    return (
        <table className="telemetry-table">
            <thead>
                <tr>
                    <th>Drone ID</th>
                    <th>Status</th>
                    <th>Battery</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                    <th>Altitude</th>
                    <th>Last Update</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {Array.from(drones.values()).map((data) => (
                    <tr key={data.droneId}>
                        <td>{data.droneId}</td>
                        <td>{data.status}</td>
                        <td>{(data.batteryLevel * 100).toFixed(1)}%</td>
                        <td>{data.latitude.toFixed(6)}</td>
                        <td>{data.longitude.toFixed(6)}</td>
                        <td>{data.altitude.toFixed(1)} m</td>
                        <td>{new Date(data.timestamp).toLocaleTimeString()}</td>
                        <td>
                            <button className="action-button" onClick={() => onSendCommand(data.droneId, 'PING')}>
                            Ping
                            </button>
                            <button className="action-button rtb" onClick={() => onSendCommand(data.droneId, 'RETURN_TO_BASE')}>
                                Return to Base
                            </button></td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default TelemetryTable;