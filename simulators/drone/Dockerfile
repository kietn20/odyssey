# File: simulators/drone/Dockerfile
# Purpose: Defines how to build a container image for the Python Drone Simulator.

# --- Stage 1: The Builder ---
FROM python:3.11-slim AS builder

WORKDIR /app

# run a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


# --- Stage 2: The Final Image ---
FROM python:3.11-slim

WORKDIR /app

# copy the virtual environment with the installed packages from the builder
COPY --from=builder /opt/venv /opt/venv

COPY . .

# activate the virtual environment by setting the PATH
ENV PATH="/opt/venv/bin:$PATH"

# expose the port the Flask server listens on
EXPOSE 9000

# when the container starts, run the 'python main.py' command
CMD ["python", "main.py"]