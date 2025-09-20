// File: services/persistence-service/main.go
// Purpose: Receives telemetry data and saves it to the PostgreSQL database.

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"
	amqp "github.com/rabbitmq/amqp091-go"
)

type DroneTelemetry struct {
	DroneID      string  `json:"droneId"`
	Timestamp    string  `json:"timestamp"` // store this as a string for now
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	Altitude     float64 `json:"altitude"`
	BatteryLevel float64 `json:"batteryLevel"`
	Status       string  `json:"status"`
}

var dbpool *pgxpool.Pool

func main() {
	var err error
	ctx := context.Background()

	// 1. Build the database connection string from environment variables.
	// This is the standard way to configure database connections in cloud-native apps.
	dbUser := os.Getenv("POSTGRES_USER")
	dbPassword := os.Getenv("POSTGRES_PASSWORD")
	dbName := os.Getenv("POSTGRES_DB")
	dbHost := "postgres-service" // This uses the stable Kubernetes Service name
	dbPort := "5432"

	connString := fmt.Sprintf("postgresql://%s:%s@%s:%s/%s", dbUser, dbPassword, dbHost, dbPort, dbName)

	// 2. Create the connection pool.
	// pgxpool is a connection pool manager, which is more efficient than
	// creating a new connection for every request.
	dbpool, err = pgxpool.New(ctx, connString)
	if err != nil {
		log.Fatalf("Unable to create connections pool: %v\n", err)
	}
	defer dbpool.Close()

	// 3. Ping the database to ensure a connection is established.
	if err := dbpool.Ping(ctx); err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	log.Println("✅ Successfully connected to PostgreSQL.")

	createTableSQL := `
	CREATE TABLE IF NOT EXISTS telemetry (
		id SERIAL PRIMARY KEY,
		drone_id VARCHAR(255) NOT NULL,
		timestamp TIMESTAMPTZ NOT NULL,
		latitude DOUBLE PRECISION NOT NULL,
		longitude DOUBLE PRECISION NOT NULL,
		altitude DOUBLE PRECISION NOT NULL,
		battery_level DOUBLE PRECISION NOT NULL,
		status VARCHAR(50) NOT NULL
	);`
	_, err = dbpool.Exec(ctx, createTableSQL)
	if err != nil {
		log.Fatalf("Unable to create telemetry table: %v", err)
	}
	log.Println("✅ Telemetry table is ready.")

	// --- RabbitMQ Connection and Consumer Setup ---
	conn, err := amqp.Dial("amqp://guest:guest@rabbitmq-service:5672/")
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	amqpChannel, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open a channel: %v", err)
	}
	defer amqpChannel.Close()

	q, err := amqpChannel.QueueDeclare(
		"persistence_queue", // name
		true,                // durable
		false,               // delete when unused
		false,               // exclusive
		false,               // no-wait
		nil,                 // arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare a queue: %v", err)
	}

	err = amqpChannel.QueueBind(
		q.Name,               // queue name
		"",                   // routing key (not needed for fanout)
		"telemetry_exchange", // the name of the exchange to bind to (fixed: use string literal)
		false,
		nil,
	)
	if err != nil {
		log.Fatalf("Failed to bind a queue: %v", err)
	}
	log.Println("✅ RabbitMQ channel, queue, and binding configured.")

	// start consuming messages from the queue (this ia a blocking call)
	msgs, err := amqpChannel.Consume(
		q.Name, // queue
		"",     // consumer
		true,   // auto-ack
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,    // args
	)
	if err != nil {
		log.Fatalf("Failed to register a consumer: %v", err)
	}

	log.Println("🚀 Persistence service started. Waiting for telemetry messages...")

	// This goroutine will run forever, processing messages as they arrive
	go func() {
		for d := range msgs {
			handleTelemetryLog(d)
		}
	}()

	// block forever until a shutdown signal is received so this keeps the main function from exiting and allows our consumer to run
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down persistence service.")
}

// handleTelemetryLog is our message processing function
func handleTelemetryLog(d amqp.Delivery) {
	var telemetry DroneTelemetry
	if err := json.Unmarshal(d.Body, &telemetry); err != nil {
		log.Printf("Error unmarshaling JSON: %s", err)
		return
	}

	insertSQL := `
	INSERT INTO telemetry (drone_id, timestamp, latitude, longitude, altitude, battery_level, status)
	VALUES ($1, $2, $3, $4, $5, $6, $7);`

	_, err := dbpool.Exec(context.Background(), insertSQL,
		telemetry.DroneID,
		telemetry.Timestamp,
		telemetry.Latitude,
		telemetry.Longitude,
		telemetry.Altitude,
		telemetry.BatteryLevel,
		telemetry.Status,
	)

	if err != nil {
		log.Printf("Error inserting telemetry data: %v", err)
	}
}
