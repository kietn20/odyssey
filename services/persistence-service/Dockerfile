# File: services/persistence-service/Dockerfile
# Purpose: Defines how to build the container image for the Persistence Service.

# --- Stage 1: The Builder ---
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -o /persistence-service .


# --- Stage 2: The Final Image ---
FROM scratch

COPY --from=builder /persistence-service /persistence-service

EXPOSE 8082

ENTRYPOINT ["/persistence-service"]