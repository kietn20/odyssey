// File: services/telemetry-service/main.go
// Purpose: Main entry point for the telemetry ingestion and distribution service.

package main

import (
	"encoding/json"
	"io"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	amqp "github.com/rabbitmq/amqp091-go"
	"google.golang.org/grpc"

	pb "odyssey/services/telemetry-service/gen/go"
)

var amqpChannel *amqp.Channel

const telemetryExchange = "telemetry_exchange"

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

// --- gRPC Server Implementation ---
type server struct {
	pb.UnimplementedTelemetryReporterServer
}

// ReportTelemetry is the implementation of the RPC defined in our .proto file
// this is a client-streaming RPC
func (s *server) ReportTelemetry(stream pb.TelemetryReporter_ReportTelemetryServer) error {
	log.Println("✅ gRPC stream established with a new drone.")
	for {
		// stream.Recv() is a blocking call so it waits for the client to send a message
		telemetry, err := stream.Recv()

		if err == io.EOF {
			log.Println("🏁 Drone has closed the gRPC stream.")
			// send a final response back to the client and close the connection
			return stream.SendAndClose(&pb.ReportResponse{Success: true})
		}
		if err != nil {
			log.Printf("Error receiving from gRPC stream: %v", err)
			return err
		}

		// --- Translate from Protobuf to JSON ---
		// dashboard needs JSON so we need to convert
		jsonData := DroneTelemetry{
			DroneID:      telemetry.DroneId,
			Timestamp:    telemetry.Timestamp,
			Latitude:     telemetry.Latitude,
			Longitude:    telemetry.Longitude,
			Altitude:     telemetry.Altitude,
			BatteryLevel: telemetry.BatteryLevel,
			Status:       telemetry.Status,
		}

		messageBytes, err := json.Marshal(jsonData)
		if err != nil {
			log.Printf("Error marshalling telemetry to JSON: %v", err)
			continue // skip this message but keep the stream open
		}

		// broadcast the json message to all connected dashboards
		hub.broadcast(messageBytes)

	}
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
var httpClient = &http.Client{
	Timeout: 2 * time.Second,
}

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
	// Part 1: Broadcast to WebSocket clients for live ui
	h.mu.RLock()
	clientsSnapshot := make([]*websocket.Conn, 0, len(h.clients))
	for client := range h.clients {
		clientsSnapshot = append(clientsSnapshot, client)
	}
	h.mu.RUnlock()

	for _, client := range clientsSnapshot {
		err := client.WriteMessage(websocket.TextMessage, message)
		if err != nil {
			log.Printf("Error writing to client, removing: %v", err)
			go h.removeClient(client)
		}
	}

	// Part 2: Forward to Persistence Service
	go func() {
		err := amqpChannel.Publish(
			telemetryExchange,
			"",
			false,
			false,
			amqp.Publishing{
				ContentType: "application/json",
				Body:        message,
			})

		if err != nil {
			log.Printf("Failed to publish a message to RabbitMQ: %v", err)
		}
	}()
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

func main() {
	// --- Setup RabbitMQ Connection ---
	conn, err := amqp.Dial("amqp://guest:guest@rabbitmq-service:5672/")
	if err != nil {
		log.Fatal("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	amqpChannel, err = conn.Channel()

	if err != nil {
		log.Fatalf("Failed to open a channel: %v", err)
	}
	defer amqpChannel.Close()

	err = amqpChannel.ExchangeDeclare(
		telemetryExchange, // name
		"fanout",          // type
		true,              // durable
		false,             // auto-deleted
		false,             // internal
		false,             // no-wait
		nil,               // arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare an exchange: %v", err)
	}
	log.Println("✅ RabbitMQ channel and exchange configured.")


	// starting the gRPC server ----
	// run this in separate goroutine so it doesnt block the http server
	go func() {
		// gRPC services need to listen on a TCP port. 50051 is the standard.
		lis, err := net.Listen("tcp", ":50051")
		if err != nil {
			log.Fatalf("Failed to listen for gRPC: %v", err)
		}

		grpcServer := grpc.NewServer()
		// register our custom server implementation with the gRPC server
		pb.RegisterTelemetryReporterServer(grpcServer, &server{})

		log.Println("🚀 gRPC server starting on :50051")
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("Failed to serve gRPC: %v", err)
		}

	}()

	// http.HandleFunc registers our handler function for a given route.
	// Any requests to "/ws" will be passed to wsHandler.
	http.HandleFunc("/ws", wsHandler)

	log.Println("🚀 Telemetry service starting on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
