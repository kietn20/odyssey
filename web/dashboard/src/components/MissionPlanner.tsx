// File: web/dashboard/src/components/MissionPlanner.tsx

import React from "react";
import "./MissionPlanner.css";

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
	onClearMission,
}) => {
	return (
		<div className="mission-planner">
			<div className="mission-details-header">
				<span className="mission-title">MISSION DETAILS</span>
			</div>
			<div className="mission-details-row">
				<span className="detail-label">Name:</span>
				<input
					className="detail-input"
					id="missionName"
					type="text"
					value={missionName}
					onChange={(e) => setMissionName(e.target.value)}
					placeholder="Enter name..."
				/>
			</div>
			<div className="mission-details-row">
				<span className="detail-label">Created:</span>
				<span className="detail-value">12:48 PM</span>
			</div>
			<div className="mission-details-row">
				<span className="detail-label">Author:</span>
				<span className="detail-value">[user]</span>
			</div>

			<div className="mission-details-header" style={{ marginTop: 20 }}>
				<span className="mission-title">ACTIVE ROUTE POINTS</span>
			</div>
			<div className="mission-planner-form">
				<div className="form-group">
					<label style={{ fontSize: "0.8rem", color: "#aaa" }}>
						Waypoints ({waypoints.length})
					</label>
					<ol className="waypoints-list">
						{waypoints.length > 0 ? (
							waypoints.map((wp, index) => (
								<li key={index}>
									{index + 1}: {wp.latitude.toFixed(4)},{" "}
									{wp.longitude.toFixed(4)}
								</li>
							))
						) : (
							<li style={{ color: "#888" }}>
								Click on the map to add waypoints...
							</li>
						)}
					</ol>
				</div>
			</div>
		</div>
	);
};

export default MissionPlanner;
