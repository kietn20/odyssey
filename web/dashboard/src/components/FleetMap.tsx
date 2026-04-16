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
    onClearMission?: () => void;
    onSaveMission?: () => void;
}

const MapClickHandler: React.FC<{ onClick: (latlng: { lat: number, lng: number }) => void }> = ({ onClick }) => {
    useMapEvents({
        click(e) {
            onClick(e.latlng);
        },
    });
    return null;
};

const FleetMap: React.FC<FleetMapProps> = ({ drones, waypoints, onMapClick, onClearMission, onSaveMission }) => {
    const initialPosition: [number, number] = [34.0522, -118.2437];

    // Convert our Waypoint array to the format Leaflet's Polyline expects.
    const waypointPositions: LatLngExpression[] = waypoints.map(wp => [wp.latitude, wp.longitude]);

    return (
        <div className="map-wrapper">
            {/* Left sidebar tools */}
            <div className="map-tools-sidebar">
                <div className="map-tool-icon" title="Map Settings">⚙️</div>
                <div className="map-tool-icon" title="Layers">🗺️</div>
                <div className="map-tool-icon" title="Draw Range">📏</div>
                <div className="map-tool-icon" title="Polygon Select">🔷</div>
                <div className="map-tool-icon" title="Add Waypoint">📍</div>
            </div>

            {/* Waypoint Context Popover */}
            {waypoints.length > 0 && (
                <div className="waypoints-overlay">
                    <div className="waypoints-header">Waypoints ({waypoints.length})</div>
                    <div className="waypoint-list">
                        {waypoints.map((wp, i) => (
                            <div key={i} className="waypoint-item">
                                {i + 1}: {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                            </div>
                        ))}
                    </div>
                    <div className="waypoints-actions">
                        <button className="btn-clear" onClick={onClearMission}>Clear</button>
                        <button className="btn-save" onClick={onSaveMission}>Save Mission</button>
                    </div>
                </div>
            )}

            <MapContainer center={initialPosition} zoom={13} scrollWheelZoom={true}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution="&copy; <a href='https://carto.com/attributions'>CARTO</a>"
                />

                <MapClickHandler onClick={onMapClick} />

                {Array.from(drones.values()).map((drone) => (
                    <Marker key={drone.droneId} position={[drone.latitude, drone.longitude]}>
                        <Popup className="drone-popup-content">
                            <strong>{drone.droneId}</strong><br/>
                            <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{drone.status}</span>
                        </Popup>
                    </Marker>
                ))}

                {waypoints.map((waypoint, index) => (
                    <Marker
                        key={`wp-${index}`}
                        position={[waypoint.latitude, waypoint.longitude]}
                    >
                        <Popup className="drone-popup-content">Waypoint {index + 1}</Popup>
                    </Marker>
                ))}

                {waypoints.length > 1 && (
                    <Polyline pathOptions={{ color: '#0088ff', weight: 3 }} positions={waypointPositions} />
                )}
            </MapContainer>
        </div>
    );
};

export default FleetMap;