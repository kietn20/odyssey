// File: services/persistence-service/main.go
// Purpose: Receives telemetry data and saves it to the PostgreSQL database.

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
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

	// 4. Create the telemetry table if it doesn't exist.
	// This is a simple approach for our project. In production, you would use a dedicated database migration tool.
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
		log.Fatalf("Unable to create table: %v\n", err)
	}
	log.Println("✅ Telemetry table is ready.")

	// 5. Set up the HTTP server and handler.
	http.HandleFunc("/log", telemetryLogHandler)
	log.Println("🚀 Persistence service starting on :8082")
	if err := http.ListenAndServe(":8082", nil); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// telemetryLogHandler receives data and inserts it into the database
func telemetryLogHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var telemetry DroneTelemetry
	if err := json.NewDecoder(r.Body).Decode(&telemetry); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// the SQL INSERT statement. We use $1, $2, etc. as placeholders to prevent SQL injection vulnerabilities
	insertSQL := `
	INSERT INTO telemetry (drone_id, timestamp, latitude, longitude, altitude, battery_level, status)
	VALUES ($1, $2, $3, $4, $5, $6, $7);`

	// execute the command
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
		http.Error(w, "Failed to save telemetry data", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}