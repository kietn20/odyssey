// File: web/dashboard/src/components/FleetMap.tsx
// Purpose: A React component to display drone positions on a live map.

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import './FleetMap.css';

interface TelemetryData {
    droneId: string;
    latitude: number;
    longitude: number;
    status: string;
}

interface FleetMapProps {
    drones: Map<string, TelemetryData>;
}

const FleetMap: React.FC<FleetMapProps> = ({ drones }) => {
    const initialPosition: [number, number] = [34.0522, -118.2437]; // Fixed starting position @ Los Angeles

    return (
        <MapContainer center={initialPosition} zoom={13} scrollWheelZoom={true}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {Array.from(drones.values()).map((drone) => (
                <Marker key={drone.droneId} position={[drone.latitude, drone.longitude]}>
                    <Popup>
                        Drone ID: {drone.droneId} <br />
                        Status: {drone.status}
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
};

export default FleetMap;