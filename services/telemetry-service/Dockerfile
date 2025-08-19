# File: services/telemetry-service/Dockerfile
# Purpose: Defines how to build a container image for the Telemetry Service.

# --- Stage 1: The Builder ---
# Start with the official Go image. Using a specific version like '1.22-alpine'
# is a best practice for reproducible builds. The 'alpine' variant is a
# lightweight Linux distribution, making our build stage smaller and faster.
FROM golang:1.22-alpine AS builder

# Set the working directory inside the container. All subsequent commands will run from this path
WORKDIR /app

# Copy the dependency files first. This is a crucial Docker optimization.
# Docker caches layers, so if these files don't change, it won't re-download
# all the dependencies on every build, saving a lot of time.
COPY go.mod go.sum ./
RUN go mod download

# copy the rest of our application's source code into the container
COPY . .

# Build the Go application.
# CGO_ENABLED=0 is a critical flag. It creates a statically linked binary,
# meaning it has zero dependencies on any system libraries. This allows it
# to run in the absolute bare-minimum 'scratch' container below.
# -o specifies the output file name for our compiled program.
RUN CGO_ENABLED=0 go build -o /telemetry-service .


# --- Stage 2: The Final Image ---
# 'scratch' is the most minimal Docker base image possible. It is completely empty.
# use this for our final image because it results in a tiny and highly secure
# container, as it contains ONLY our compiled application and nothing else.
FROM scratch

# Copy only the compiled binary from the 'builder' stage into our new,
# empty 'scratch' image.
COPY --from=builder /telemetry-service /telemetry-service

# The EXPOSE instruction informs Docker that the container listens on the
# specified network ports at runtime. It's mainly for documentation.
EXPOSE 8080

# The ENTRYPOINT specifies the command that will be executed when the
# container starts.
ENTRYPOINT ["/telemetry-service"]