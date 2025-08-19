// File: services/command-service/main.go
// Purpose: Main entry point for the Command & Control (C2) service.

package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"
)

type DroneRegistry struct {
	mu sync.Mutex
	drones map[string]string
	client *http.Client
}

var registry = &DroneRegistry{
	drones: make(map[string]string),
	client: &http.Client{Timeout: 5 * time.Second},
}

type RegisterRequest struct {
	DroneID string `json:"droneId"`
	Address string `json:"address"`
}

// CommandRequest defines the structure for incoming commands from the dashboard.
type CommandRequest struct {
	DroneID string          `json:"droneId"`
	Command string          `json:"command"`
	Payload json.RawMessage `json:"payload"`
}

// CommandResponse defines the structure for our API's response.
type CommandResponse struct {
	Status  string `json:"status"`
	Command string `json:"command"`
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	registry.mu.Lock()
	registry.drones[req.DroneID] = req.Address
	registry.mu.Unlock()

	log.Printf("Registered drone %s at address %s", req.DroneID, req.Address)
	w.WriteHeader(http.StatusOK)
}

// commandHandler processes incoming command requests.
func commandHandler(w http.ResponseWriter, r *http.Request) {
	var cmdReq CommandRequest
	if err := json.NewDecoder(r.Body).Decode(&cmdReq); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	log.Printf("Received command '%s' for drone %s", cmdReq.Command, cmdReq.DroneID)

	registry.mu.Lock()
	droneAddr, ok := registry.drones[cmdReq.DroneID]
	registry.mu.Unlock()

	if !ok {
		log.Printf("Error: Drone %s not found in registry", cmdReq.DroneID)
		http.Error(w, "Drone not registered", http.StatusNotFound)
		return
	}

	droneCommandPayload, _ := json.Marshal(map[string]interface{}{
		"command": cmdReq.Command,
		"payload": cmdReq.Payload,
	})

	droneURL := droneAddr + "/command"
	resp, err := registry.client.Post(droneURL, "application/json", bytes.NewBuffer(droneCommandPayload))
	if err != nil {
		log.Printf("Error forwarding command to %s: %v", droneURL, err)
		http.Error(w, "Failed to forward command to drone", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(CommandResponse{Status: "Command sent to drone"})
	

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
	mux.HandleFunc("/api/register", registerHandler)


	log.Println("🚀 Command & Control service starting on :8081")
	if err := http.ListenAndServe(":8081", corsHandler(mux)); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}