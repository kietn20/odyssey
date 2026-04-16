// File: web/dashboard/src/App.tsx
// Purpose: Main application component to display the drone dashboard.

import React, { useState, useEffect } from "react";
import "./App.css";
import TelemetryTable from "./components/TelemetryTable";
import FleetMap from "./components/FleetMap";
import MissionPlanner from "./components/MissionPlanner";

const WEBSOCKET_URL = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;
const COMMAND_API_URL = "/api/command";
const MISSIONS_API_URL = "/api/missions";

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
	const [connectionStatus, setConnectionStatus] = useState("Connecting...");
	const [telemetryData, setTelemetryData] = useState<
		Map<string, TelemetryData>
	>(new Map());
	const [missionName, setMissionName] = useState("");
	const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

	useEffect(() => {
		console.log("Attempting to connect to WebSocket...");
		const ws = new WebSocket(WEBSOCKET_URL);

		ws.onopen = () => {
			console.log("WebSocket connection established.");
			setConnectionStatus("Connected");
		};

		ws.onclose = () => {
			console.log("WebSocket connection closed.");
			setConnectionStatus("Disconnected");
		};

		ws.onerror = (error) => {
			console.error("WebSocket error:", error);
			setConnectionStatus("Error");
		};

		ws.onmessage = (event) => {
			try {
				const data: TelemetryData = JSON.parse(event.data);
				setTelemetryData((prevMap) =>
					new Map(prevMap).set(data.droneId, data),
				);
			} catch (error) {
				console.error("Failed to parse incoming message:", event.data);
			}
		};

		// React will run this function when the component is "unmounted" (removed from the screen) to prevent memory leaks.
		return () => {
			ws.close();
		};
	}, []);

	const handleSendCommand = async (droneId: string, command: string) => {
		console.log(`Sending command '${command}' to drone ${droneId}`);
		try {
			const response = await fetch(COMMAND_API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
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
			console.log("C2 Service responded:", result);
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
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: missionName,
					waypoints: waypoints,
				}),
			});

			if (!response.ok) {
				// If the server returns an error, we'll get the text and show it.
				const errorText = await response.text();
				throw new Error(
					`Failed to save mission: ${response.status} ${errorText}`,
				);
			}

			const savedMission = await response.json();
			console.log("Successfully saved mission:", savedMission);

			// Optionally, show a success message to the user
			alert(
				`Mission "${savedMission.name}" saved with ID ${savedMission.id}!`,
			);

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

	const handleMapClick = (latlng: { lat: number; lng: number }) => {
		const newWaypoint = { latitude: latlng.lat, longitude: latlng.lng };
		// We use the functional form of setState to ensure we are always
		// working with the latest version of the waypoints array.
		setWaypoints((prevWaypoints) => [...prevWaypoints, newWaypoint]);
	};

	const activeDrone = Array.from(telemetryData.values())[0];

	return (
		<div className="App">
			<div className="header-bar">
				<div
					className="logo"
					style={{
						color: "#ff8c00",
						fontWeight: "bold",
						fontSize: "1.2rem",
					}}
				>
					<span style={{ marginRight: 8 }}>🚀</span>ODYSSEY
				</div>
				<div
					className="search-bar"
					style={{
						background: "#333",
						padding: "4px 12px",
						borderRadius: 4,
						width: "300px",
					}}
				>
					<input
						type="text"
						placeholder="search"
						style={{
							background: "transparent",
							border: "none",
							color: "white",
							width: "100%",
							outline: "none",
						}}
					/>
				</div>
				<div
					className="global-vitals"
					style={{
						display: "flex",
						gap: "20px",
						alignItems: "center",
					}}
				>
					<span>🌬️ 7 m/s</span>
					<span>📏 243.4 ha</span>
					<span>🌡️ 36°C</span>
					<span>🕒 14:20 PM</span>
					<div
						className="avatar"
						style={{
							width: 30,
							height: 30,
							background: "#555",
							borderRadius: "50%",
						}}
					></div>
				</div>
			</div>

			<div className="top-panel" style={{ display: "flex" }}>
				{/* Active Assets */}
				<div
					className="panel-module"
					style={{
						border: "1px solid #444",
						padding: 10,
						borderRadius: 4,
						minWidth: 200,
					}}
				>
					<div style={{ fontSize: "0.8rem", color: "#aaa" }}>
						Active Assets
					</div>
					<div
						style={{
							marginTop: 8,
							padding: 8,
							background: "#333",
							borderRadius: 4,
						}}
					>
						{activeDrone ? activeDrone.droneId : "No Active Asset"}
					</div>
				</div>

				{/* Mission Monitor */}
				<div
					className="panel-module"
					style={{
						border: "1px solid #444",
						padding: 10,
						borderRadius: 4,
						flex: 1,
					}}
				>
					<div style={{ fontSize: "0.8rem", color: "#aaa" }}>
						MISSION MONITOR
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginTop: 8,
						}}
					>
						<div>
							{activeDrone ? activeDrone.droneId : "ODYSSEY"} <span style={{ color: "#4CAF50" }}>{activeDrone ? activeDrone.status : "IDLE"}</span>
						</div>
						<div style={{ display: "flex", gap: 15 }}>
							<div style={{ textAlign: "center" }}>
								<div>00:00</div>
								<div
									style={{
										fontSize: "0.7rem",
										color: "#888",
									}}
								>
									START
								</div>
							</div>
							<div style={{ textAlign: "center" }}>
								<div>03:30</div>
								<div
									style={{
										fontSize: "0.7rem",
										color: "#888",
									}}
								>
									ELAPSED
								</div>
							</div>
							<div style={{ textAlign: "center" }}>
								<div>00:00</div>
								<div
									style={{
										fontSize: "0.7rem",
										color: "#888",
									}}
								>
									END
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Active Mission Plan */}
				<div
					className="panel-module"
					style={{
						border: "1px solid #444",
						padding: 10,
						borderRadius: 4,
						flex: 1,
					}}
				>
					<div style={{ fontSize: "0.8rem", color: "#aaa" }}>
						ACTIVE MISSION PLAN
					</div>
					<div
						style={{
							marginTop: 8,
							display: "flex",
							flexWrap: "wrap",
							gap: 10,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
							}}
						>
							Mode:{" "}
							<button
								style={{
									background: "#444",
									border: "none",
									color: "white",
									padding: "4px 8px",
								}}
							>
								Manual
							</button>
							<button
								style={{
									background: "#222",
									border: "1px solid #444",
									color: "white",
									padding: "4px 8px",
								}}
							>
								Auto
							</button>
						</div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
							}}
						>
							Lens:{" "}
							<button
								style={{
									background: "#444",
									border: "none",
									color: "white",
									padding: "4px 8px",
								}}
							>
								Precision
							</button>
							<button
								style={{
									background: "#222",
									border: "1px solid #444",
									color: "white",
									padding: "4px 8px",
								}}
							>
								Wide
							</button>
						</div>
					</div>
				</div>

				{/* Live Geospatial Data */}
				<div
					className="panel-module"
					style={{
						border: "1px solid #444",
						padding: 10,
						borderRadius: 4,
						flex: 1,
					}}
				>
					<div style={{ fontSize: "0.8rem", color: "#aaa" }}>
						LIVE GEOSPATIAL DATA
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 8,
							marginTop: 8,
						}}
					>
						<div>Altitude: {activeDrone ? activeDrone.altitude.toFixed(1) : "0.0"} m</div>
						<div>{activeDrone ? new Date(activeDrone.timestamp).toLocaleTimeString() : "--:--:--"}</div>
						<div>Latitude: {activeDrone ? activeDrone.latitude.toFixed(4) : "0.0"}</div>
						<div>Longitude: {activeDrone ? activeDrone.longitude.toFixed(4) : "0.0"}</div>
					</div>
				</div>

				{/* Fleet Actions */}
				<div
					className="panel-module"
					style={{
						border: "1px solid #444",
						padding: 10,
						borderRadius: 4,
						minWidth: 200,
					}}
				>
					<div style={{ fontSize: "0.8rem", color: "#aaa" }}>
						FLEET ACTIONS
					</div>
					<div
						style={{
							marginTop: 8,
							display: "flex",
							flexDirection: "column",
							gap: 8,
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center"
							}}
						>
							Ping{" "}
							<button
								onClick={() => activeDrone && handleSendCommand(activeDrone.droneId, "PING")}
								style={{
									background: "transparent",
									border: "1px solid #4CAF50",
									color: "#4CAF50",
									padding: "4px 10px",
									borderRadius: 4,
									cursor: "pointer"
								}}
							>
								Ping
							</button>
						</div>
						<button
							onClick={() => activeDrone && handleSendCommand(activeDrone.droneId, "RTL")}
							style={{
								background: "#444",
								border: "none",
								color: "white",
								padding: "8px",
								borderRadius: 4,
								width: "100%",
								cursor: "pointer"
							}}
						>
							Return to Base
						</button>
					</div>
				</div>

				{/* Drone Mock View */}
				<div
					className="panel-module"
					style={{
						border: "1px solid #444",
						padding: 10,
						borderRadius: 4,
						minWidth: 200,
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
					}}
				>
					<div
						style={{
							textAlign: "center",
							background: "#333",
							height: 60,
							borderRadius: 4,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						Drone img
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							marginTop: 8,
							fontSize: "0.8rem",
							color: "#aaa",
						}}
					>
						<span>🔋 {activeDrone?.batteryLevel ? activeDrone.batteryLevel.toFixed(1) : "4364"} / 4666 mAh</span>
						<span>🌡️ 0°C</span>
					</div>
				</div>
			</div>

			<div className="main-viewport">
				<FleetMap
					drones={telemetryData}
					waypoints={waypoints}
					onMapClick={handleMapClick}
					onClearMission={handleClearMission}
					onSaveMission={handleSaveMission}
				/>
			</div>

			<div className="right-drawer">
				<div
					className="drawer-tabs"
					style={{
						display: "flex",
						justifyContent: "space-around",
						paddingBottom: 10,
						borderBottom: "1px solid #444",
						marginBottom: 20,
					}}
				>
					<span>Layers</span>
					<span>Users</span>
					<span>Plans</span>
					<span>Settings</span>
				</div>
				<div className="mission-list" style={{ marginBottom: 20 }}>
					<div
						style={{
							background: "#333",
							padding: 10,
							borderRadius: 4,
							marginBottom: 8,
							borderLeft: "4px solid #ff8c00",
						}}
					>
						Mission 1
					</div>
					<div style={{ padding: 10, color: "#888" }}>
						Mission 2 (idle)
					</div>
				</div>
				<MissionPlanner
					missionName={missionName}
					setMissionName={setMissionName}
					waypoints={waypoints}
					onSaveMission={handleSaveMission}
					onClearMission={handleClearMission}
				/>
				<div
					className="minimap"
					style={{
						background: "#333",
						height: 150,
						borderRadius: 4,
						marginTop: 20,
						marginBottom: 20,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					Map Thumbnail
				</div>
				<div className="event-logs" style={{ fontSize: "0.8rem" }}>
					<div
						style={{
							color: "#aaa",
							marginBottom: 8,
							fontWeight: "bold",
						}}
					>
						EVENTS
					</div>
					<div style={{ padding: 4 }}>Enter Geofence [12:45]</div>
					<div style={{ padding: 4 }}>Waypoint Reached [12:46]</div>
				</div>
			</div>
		</div>
	);
}

export default App;
