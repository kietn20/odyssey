# File: simulators/drone/main.py
# Purpose: Simulates a single drone sending telemetry data.

import uuid
import json
import time
import random
import requests
from datetime import datetime, timezone

# --- Configuration ---
# This is the starting position for our drone.
# (Latitude/Longitude for Los Angeles City Hall)
STARTING_LATITUDE = 34.052235
STARTING_LONGITUDE = -118.243683

# How often the drone sends a telemetry update, in seconds
TELEMETRY_INTERVAL_SECONDS = 2

TELEMETRY_ENDPOINT = "http://localhost:8080/telemetry"

class DroneSimulator:
    """
    Represents a single drone. It maintains its state and simulates
    movement and battery drain over time.
    """
    def __init__(self, drone_id):
        self.drone_id = drone_id
        self.latitude = STARTING_LATITUDE
        self.longitude = STARTING_LONGITUDE
        self.altitude = 100.0  # meters
        self.battery_level = 1.0  # 1.0 = 100%
        self.status = "idle"

    def simulate_movement(self):
        """
        Updates the drone's position, altitude, and battery level
        to simulate a flight.
        """
        # Change status to flying if it has enough battery
        if self.status == "idle" and self.battery_level > 0.1:
            self.status = "flying"

        if self.status == "flying":
            # Simulate slight random movement
            self.latitude += random.uniform(-0.0005, 0.0005)
            self.longitude += random.uniform(-0.0005, 0.0005)
            self.altitude += random.uniform(-1, 1)

            # Simulate battery drain
            self.battery_level -= 0.001 # Drain 0.1% per update
            
            # If battery is low, set status to returning to base
            if self.battery_level <= 0.1:
                self.status = "returning_to_base"

        # Ensure battery and altitude don't go into unrealistic negative values
        self.battery_level = max(0, self.battery_level)
        self.altitude = max(0, self.altitude)

    def get_telemetry_data(self):
        """
        Packages the drone's current state into a dictionary
        """
        return {
            "droneId": str(self.drone_id),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "latitude": self.latitude,
            "longitude": self.longitude,
            "altitude": self.altitude,
            "batteryLevel": round(self.battery_level, 4),
            "status": self.status,
        }

def main():
    """
    Main function to run the simulation.
    """
    drone_id = uuid.uuid4() # Generate a random unique identifier
    drone = DroneSimulator(drone_id)

    print(f"🚀 Starting drone simulator for drone ID: {drone.drone_id}")
    print(f"📡 Sending telemetry to {TELEMETRY_ENDPOINT}")
    
    try:
        while True:
            drone.simulate_movement()
            telemetry = drone.get_telemetry_data()

            try: 
                requests.post(TELEMETRY_ENDPOINT, json=telemetry, timeout=1)
                print(f"Sent telemetry: {telemetry['status']}, Battery: {telemetry['batteryLevel']:.3f}")
            except requests.exceptions.RequestException as e:
                print(f"Error sending telemetry: {e}")

            time.sleep(TELEMETRY_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down drone simulator.")

if __name__ == "__main__":
    main()