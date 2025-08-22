// File: services/telemetry-service/main.go
// Purpose: Main entry point for the telemetry ingestion and distribution service.

package main

import (
	"bytes"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// DroneTelemetry defines the structure of the telemetry data we expect to receive.
// The `json:"..."` tags are important. They tell Go's JSON package how to map
// the incoming JSON keys to our struct fields.
type DroneTelemetry struct {
	DroneID      string  `json:"droneId"`
	Timestamp    string  `json:"timestamp"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Altitude     float64 `json:"altitude"`
	BatteryLevel float64 `json:"batteryLevel"`
	Status       string  `json:"status"`
}

// The upgrader is responsible for upgrading a standard HTTP connection to a WebSocket connection.
// CheckOrigin is a function that we'll use to determine whether to allow
// a connection from a given source. For now, we allow all connections.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // WARNING: In production, you'd want to validate the origin.
	},
}

// Hub manages the set of active WebSocket clients.
type Hub struct {
	clients map[*websocket.Conn]bool
	// RWMutex is a "Read-Write Mutex". It's a lock used to protect shared
	// resources. It allows multiple "readers" to access the resource
	// simultaneously, but only one "writer". This is perfect for our use case:
	// broadcasting is a "read" action (many can happen), and adding/removing
	// clients are "write" actions (must be exclusive).
	mu sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients: make(map[*websocket.Conn]bool),
	}
}

// Global instance of our hub
var hub = NewHub()
var httpClient = &http.Client{Timeout: 5 * time.Second}

func (h *Hub) addClient(conn *websocket.Conn) {
	h.mu.Lock()         // Acquire a write lock
	defer h.mu.Unlock() // Release the lock when the function returns
	h.clients[conn] = true
	log.Printf("Client added. Total clients: %d", len(h.clients))
}

func (h *Hub) removeClient(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[conn]; ok {
		conn.Close()
		delete(h.clients, conn)
		log.Printf("Client removed. Total clients: %d", len(h.clients))
	}
}

func (h *Hub) broadcast(message []byte) {
	h.mu.RLock() // Acquire a read lock (allows multiple broadcasters)
	for client := range h.clients {
		err := client.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			log.Printf("Error writing to client: %v", err)
			go h.removeClient(client)
		}
		h.mu.RUnlock()

		// Part 2: Forward the message to the Persistence Service
		// We do this in a goroutine so it doesn't block broadcasting to the UI
		go func() {
			// The URL uses the stable Kubernetes service name
			req, err := http.NewRequest("POST", "http://persistence-service:8082/log", bytes.NewBuffer(message))
			if err != nil {
				log.Printf("Error creating request to persistence service: %v", err)
				return
			}
			req.Header.Set("Content-Type", "application/json")

			resp, err := httpClient.Do(req)
			if err != nil {
				log.Printf("Error sending data to persistence service: %v", err)
				return
			}
			defer resp.Body.Close()

			if resp.StatusCode != http.StatusCreated {
				log.Printf("Persistence service returned non-201 status: %d", resp.StatusCode)
			}
		}()
	}
}

// wsHandler handles incoming WebSocket connection requests
func wsHandler(w http.ResponseWriter, r *http.Request) {
	// The Upgrade method handles the WebSocket handshake
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Failed to upgrade connection:", err)
		return
	}

	log.Printf("Client connected from %s", conn.RemoteAddr())

	hub.addClient(conn)

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			hub.removeClient(conn)
			// log.Printf("Client %s diconnected.", conn.RemoteAddr())
			break
		}
	}

	// ...
}

// telemetryHandler handles incoming telemetry data via HTTP POST
func telemetryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var telemetry DroneTelemetry
	// Decode the incoming JSON from the request body into our struct
	if err := json.NewDecoder(r.Body).Decode(&telemetry); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Re-encode the received data to JSON to be broadcasted
	// This ensures we're sending a clean, validated data structure
	message, err := json.Marshal(telemetry)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	hub.broadcast(message)

	w.WriteHeader(http.StatusOK)
}

func main() {
	// http.HandleFunc registers our handler function for a given route.
	// Any requests to "/ws" will be passed to wsHandler.
	http.HandleFunc("/ws", wsHandler)
	http.HandleFunc("/telemetry", telemetryHandler)

	log.Println("🚀 Telemetry service starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
