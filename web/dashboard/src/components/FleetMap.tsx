// File: web/dashboard/src/components/FleetMap.tsx
// Purpose: A React component to display drone positions on a live map.

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet'; import './FleetMap.css';
import { LatLngExpression } from 'leaflet';

interface TelemetryData {
    droneId: string;
    latitude: number;
    longitude: number;
    status: string;
}

interface Waypoint {
    latitude: number;
    longitude: number;
}

interface FleetMapProps {
    drones: Map<string, TelemetryData>;
    waypoints: Waypoint[];
    onMapClick: (latlng: { lat: number, lng: number }) => void;
}

const MapClickHandler: React.FC<{ onClick: (latlng: { lat: number, lng: number }) => void }> = ({ onClick }) => {
    useMapEvents({
        click(e) {
            onClick(e.latlng);
        },
    });
    return null;
};

const FleetMap: React.FC<FleetMapProps> = ({ drones, waypoints, onMapClick }) => {
    const initialPosition: [number, number] = [34.0522, -118.2437];

    // Convert our Waypoint array to the format Leaflet's Polyline expects.
    const waypointPositions: LatLngExpression[] = waypoints.map(wp => [wp.latitude, wp.longitude]);

    return (
        <MapContainer center={initialPosition} zoom={13} scrollWheelZoom={true}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onClick={onMapClick} />

            {Array.from(drones.values()).map((drone) => (
                <Marker key={drone.droneId} position={[drone.latitude, drone.longitude]}>
                    <Popup>
                        Drone ID: {drone.droneId} <br /> Status: {drone.status}
                    </Popup>
                </Marker>
            ))}

            {/* Render markers for each waypoint in our draft mission */}
            {waypoints.map((waypoint, index) => (
                <Marker
                    key={`wp-${index}`}
                    position={[waypoint.latitude, waypoint.longitude]}
                >
                    <Popup>Waypoint {index + 1}</Popup>
                </Marker>
            ))}

            {waypoints.length > 1 && (
                <Polyline pathOptions={{ color: 'blue' }} positions={waypointPositions} />
            )}

        </MapContainer>
    );
};

export default FleetMap;