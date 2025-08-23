// File: web/dashboard/src/components/MissionPlanner.tsx

import React from 'react';
import './MissionPlanner.css';

// Define the shape of our Waypoint object for TypeScript
interface Waypoint {
    latitude: number;
    longitude: number;
}

interface MissionPlannerProps {
    missionName: string;
    setMissionName: (name: string) => void;
    waypoints: Waypoint[];
    onSaveMission: () => void;
    onClearMission: () => void;
}

const MissionPlanner: React.FC<MissionPlannerProps> = ({
    missionName,
    setMissionName,
    waypoints,
    onSaveMission,
    onClearMission
}) => {
    return (
        <div className="mission-planner">
            <span className='mission-planner-title'>Mission Planner</span>
            <div className="mission-planner-form">
                <div className="form-group">
                    <label htmlFor="missionName">Mission Name</label>
                    <input
                        id="missionName"
                        type="text"
                        value={missionName}
                        onChange={(e) => setMissionName(e.target.value)}
                        placeholder="e.g., Perimeter Scan Alpha"
                    />
                </div>
                <div className="form-group">
                    <label>Waypoints ({waypoints.length})</label>
                    <ol className="waypoints-list">
                        {waypoints.length > 0 ? (
                            waypoints.map((wp, index) => (
                                <li key={index}>
                                    {index + 1}: {wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}
                                </li>
                            ))
                        ) : (
                            <li>Click on the map to add waypoints...</li>
                        )}
                    </ol>
                </div>
                <div className="planner-buttons">
                    <button className="action-button rtb" onClick={onClearMission}>
                        Clear
                    </button>
                    <button className="action-button" onClick={onSaveMission}>
                        Save Mission
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MissionPlanner;