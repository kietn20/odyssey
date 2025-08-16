// File: services/telemetry-service/main.go
// Purpose: Main entry point for the telemetry ingestion and distribution service.

package main

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Failed to upgrade connection:", err)
		return
	}

	log.Printf("Client connected from %s", conn.RemoteAddr())

	defer conn.Close()
}

func main() {
	http.HandleFunc("/ws", wsHandler)

	log.Println("🚀 Telemetry service starting on :8080")

	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("Failed to start server: %v", err)
	}
}
