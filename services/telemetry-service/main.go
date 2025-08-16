// File: services/telemetry-service/main.go
// Purpose: Main entry point for the telemetry ingestion and distribution service.

package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// The upgrader is responsible for upgrading a standard HTTP connection to a WebSocket connection.
// CheckOrigin is a function that we'll use to determine whether to allow
// a connection from a given source. For now, we allow all connections.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // WARNING: In production, you'd want to validate the origin.
	},
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

	// defer conn.Close()

	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Client %s diconnected.", conn.RemoteAddr())
			break
		}
	}

	// ...
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