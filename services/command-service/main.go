// File: services/command-service/main.go
// Purpose: Main entry point for the Command & Control (C2) service.

package main

import (
	"encoding/json"
	"log"
	"net/http"
)

// CommandRequest defines the structure for incoming commands from the dashboard.
type CommandRequest struct {
	DroneID string          `json:"droneId"`
	Command string          `json:"command"`
	Payload json.RawMessage `json:"payload"`
}

// CommandResponse defines the structure for our API's response.
type CommandResponse struct {
	Status  string `json:"status"`
	DroneID string `json:"droneId"`
	Command string `json:"command"`
}

// commandHandler processes incoming command requests.
func commandHandler(w http.ResponseWriter, r *http.Request) {
	// 1. Ensure the request is a POST request
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	// 2. Decode the JSON body into our struct
	var cmd CommandRequest
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// 3. For now, we just log the command to the console.
	log.Printf("Received command '%s' for drone ID %s", cmd.Command, cmd.DroneID)

	// 4. Create and send a success response
	response := CommandResponse{
		Status:  "Command received",
		DroneID: cmd.DroneID,
		Command: cmd.Command,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error sending response: %v", err)
	}
}

func main() {
	corsHandler := func(h http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*") // In production, be more specific!
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == "OPTIONS" {
				return
			}
			h.ServeHTTP(w, r)
		})
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/api/command", commandHandler)

	log.Println("🚀 Command & Control service starting on :8081")
	if err := http.ListenAndServe(":8081", corsHandler(mux)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}