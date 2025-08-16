// File: services/telemetry-service/main.go
// Purpose: Main entry point for the telemetry ingestion and distribution service.

package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

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

// NewHub creates a new Hub instance.
func NewHub() *Hub {
	return &Hub {
		clients: make(map[*websocket.Conn]bool),
	}
}

var hub = NewHub()

func (h *Hub) addClient(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
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
	h.mu.RLock()
	defer h.mu.RUnlock()
	for client := range h.clients {
		err := client.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			log.Printf("Error writing to client: %v", err)

			go h.removeClient(client)
		}
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

func telemetryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var telemetry DroneTelemetry

	if err := json.NewDecoder(r.Body).Decode(&telemetry); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

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

	log.Println("🚀 Telemetry service starting on :8080")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
