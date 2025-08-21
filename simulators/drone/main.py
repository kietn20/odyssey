# File: simulators/drone/main.py
# Purpose: Simulates a single drone sending telemetry data.

import threading
import uuid
import json
import time
import random
import requests
from datetime import datetime, timezone
from flask import Flask, request, jsonify
import os

# --- Configuration ---
# This is the starting position for our drone.
# (Latitude/Longitude for Los Angeles City Hall)
STARTING_LATITUDE = 34.052235
STARTING_LONGITUDE = -118.243683
TELEMETRY_INTERVAL_SECONDS = 2
TELEMETRY_ENDPOINT = os.getenv("TELEMETRY_ENDPOINT", "http://localhost:8080/telemetry")
SIMULATOR_PORT = 9000
SIMULATOR_HOST = os.getenv("SIMULATOR_HOST", "localhost") # Default to localhost for local dev
C2_ADDRESS = os.getenv("C2_ADDRESS", "http://localhost:8081")

class DroneSimulator:
    """
    Represents a single drone. It maintains its state and simulates
    movement and battery drain over time.
    """
    def __init__(self, drone_id):
        self.drone_id = drone_id
        self.lock = threading.Lock()
        self.latitude = STARTING_LATITUDE
        self.longitude = STARTING_LONGITUDE
        self.altitude = 100.0  # meters
        self.battery_level = 1.0  # 1.0 = 100%
        self.status = "idle"

    def update_state_safely(self, new_status):
        """A thread-safe method to update the drone's status"""
        with self.lock:
            self.status = new_status
            print(f"COMMAND RECEIVED: status changed to '{self.status}'")

    def simulate_movement(self):
        """
        Updates the drone's position, altitude, and battery level
        to simulate a flight.
        """

        with self.lock:# Ensure we read a consistent state
            # If returning to base, move towards the start
            if self.status == "returning_to_base":
                lat_diff = STARTING_LATITUDE - self.latitude
                lon_diff = STARTING_LONGITUDE - self.longitude
                self.latitude += lat_diff * 0.1
                self.longitude += lon_diff * 0.1

                # If close enough, set to idle
                if abs(lat_diff) < 0.0001 and abs(lon_diff) < 0.0001:
                    self.status = "idle"
            
            elif self.status == "flying":
                # Simulate slight random movement
                self.latitude += random.uniform(-0.0005, 0.0005)
                self.longitude += random.uniform(-0.0005, 0.0005)


            # Change status to flying if it has enough battery
            if self.status == "idle" and self.battery_level > 0.1:
                self.status = "flying"

            if self.battery_level <= 0.1 and self.status != "idle":
                self.status = "returning_to_base"

            # Simulate battery drain unless idle
            if self.status != "idle":
                self.battery_level -= 0.001
            
            self.battery_level = max(0, self.battery_level)

    def get_telemetry_data(self):
        """
        Packages the drone's current state into a dictionary
        """
        with self.lock:
            return {
                "droneId": str(self.drone_id),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "latitude": self.latitude,
                "longitude": self.longitude,
                "altitude": self.altitude,
                "batteryLevel": round(self.battery_level, 4),
                "status": self.status,
            }

# --- Telemetry Loop (Worker Thread) ---
def run_telemetry_loop(drone, stop_event):
    """This function runs in a separate thread to send telemetry."""
    while not stop_event.is_set():
        drone.simulate_movement()
        telemetry = drone.get_telemetry_data()
        try:
            requests.post(TELEMETRY_ENDPOINT, json=telemetry, timeout=1)
            print(f"Sent: {telemetry['status']}, Battery: {telemetry['batteryLevel']:.3f}")
        except requests.exceptions.RequestException:
            pass
        time.sleep(TELEMETRY_INTERVAL_SECONDS)

# --- Command Server (Main Thread) ---
def create_app(drone):
    """Creates the Flask web server application."""
    app = Flask(__name__)

    @app.route('/command', methods=['POST'])
    def command():
        data = request.get_json()
        if not data or 'command' not in data:
            return jsonify({"status": "error", "message": "Invalid command payload"}), 400 
        
        cmd = data['command']
        if cmd == 'RETURN_TO_BASE':
            drone.update_state_safely('returning_to_base')
            return jsonify({"status":"ok", "message": "Command received: RETURN_TO_BASE"  })
        elif cmd == 'PING':
            print("COMMAND RECEIVED: PING")
            return jsonify({"status": "ok", "message": "Pong!"}) 

    return app


# --- Main Execution ---
if __name__ == "__main__":
    """
    Main function to run the simulation.
    """
    drone_id = uuid.uuid4()
    drone = DroneSimulator(drone_id)

    print(f"🚀 Starting drone simulator for drone ID: {drone.drone_id}")
    
    my_address = f"http://{SIMULATOR_HOST}:{SIMULATOR_PORT}"
    
    registration_url = f"{C2_ADDRESS}/api/register"
    max_retries = 5
    retry_delay = 3 # in secs
    registered = False

    for attempt in range(max_retries):
        try:
            print(f"✅ Attempting to register with C2 service (Attempt {attempt + 1}/{max_retries})...")            
            response = requests.post(registration_url, json={
                "droneId": str(drone_id),
                "address": my_address
            }, timeout=2)

            if response.status_code == 200:
                print("✅ Registration successful.")
                registered = True
                break # exit the loop on success

        except requests.exceptions.RequestException as e:
            print(f"🟡 Registration attempt failed: {e}")
    
        print(f"🟡 Retrying in {retry_delay} seconds...")
        time.sleep(retry_delay)

    if not registered:
        print("❌ Could not register with C2 service after several attempts. Exiting.")
        exit(1) # Exit the script if registration fails, this is a fatal error
    
    print(f"📡 Telemetry sending to {TELEMETRY_ENDPOINT}")
    print(f"🎮 Listening for commands on {my_address}")

    # Use a threading Event to signal shutdown
    stop_event = threading.Event()

    # Start the telemetry loop in a background thread
    telemetry_thread = threading.Thread(target=run_telemetry_loop, args=(drone, stop_event))
    telemetry_thread.daemon = True # Allows main thread to exit even if this one is running
    telemetry_thread.start()

    # Start the Flask server in the main thread (it's a blocking call)
    flask_app = create_app(drone)
    try:
        flask_app.run(host='0.0.0.0', port=SIMULATOR_PORT, debug=False)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down simulator...")
        stop_event.set()
        telemetry_thread.join() # Wait for telemetry thread to finish cleanly