# File: services/command-service/Dockerfile
# Purpose: Defines how to build a container image for the C2 Service.

# --- Stage 1: The Builder ---
# use the same Go version as our other service for consistency.
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -o /command-service .


# --- Stage 2: The Final Image ---
FROM scratch

COPY --from=builder /command-service /command-service

EXPOSE 8081

ENTRYPOINT ["/command-service"]