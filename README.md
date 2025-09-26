<br/>
<div align="center">
  <h1 align="center">Odyssey - Drone Fleet Management Platform</h1>
  <p align="center">
    A real-time, multi-service, distributed platform for monitoring and commanding a fleet of autonomous drones.
  </p>
</div>

<div align="center">

![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)![Postgres](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)![RabbitMQ](https://img.shields.io/badge/Rabbitmq-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)![gRPC](https://img.shields.io/badge/gRPC-000000?style=for-the-badge&logo=grpc&logoColor=white)

</div>

---

## Live Demo

This demo showcases the live dashboard monitoring a drone, receiving a "Return to Base" command, and planning a new multi-point mission which is then persisted to the database. The entire backend is running in a Kubernetes cluster.

Demo: https://vimeo.com/manage/videos/1122329503

---

## Key Features

-   ✅ **Real-Time Geospatial Visualization**: A live-updating map displaying the precise location of every drone in the fleet.
-   ✅ **Two-Way Communication**: Drones stream high-frequency telemetry via **gRPC**, and operators can issue commands (`Ping`, `Return to Base`) back to specific drones via a **REST API**.
-   ✅ **Stateful Mission Planning**: An interactive UI allows operators to visually create, name, and save complex multi-point missions to a **PostgreSQL** database.
-   ✅ **Resilient & Decoupled Architecture**: Backend microservices communicate asynchronously using a **RabbitMQ** message queue, ensuring zero data loss and high availability even if services fail.
-   ✅ **Containerized & Orchestrated**: The entire platform, including all services and infrastructure, is containerized with **Docker** and orchestrated with **Kubernetes**, mirroring a production-grade deployment.
-   ✅ **Automated CI/CD Pipeline**: Every push to the `main` branch automatically triggers a **GitHub Actions** pipeline to build, test, and publish all Docker images to a container registry, ready for deployment.

---

## System Architecture

Odyssey is built on a modern, polyglot microservice architecture. The system is designed to be scalable, resilient, and maintainable, with a clear separation of concerns between services.

![Odyssey System Architecture Diagram](https://github.com/kietn20/odyssey/blob/main/System_Architecture_Diagram.png)

-   **Data Flow:** Telemetry flows from `Simulator` → `Telemetry Service` (via gRPC) → `RabbitMQ` → `Persistence Service` → `PostgreSQL Database`.
-   **Command Flow:** Commands flow from `Dashboard` → `C2 Service` (via REST) → `Simulator` (real-time) or `Database` (missions).
-   **Real-time Updates:** Live telemetry streams from `Telemetry Service` → `Dashboard` via WebSocket.

---

## Tech Stack

| Category                  | Technologies                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Frontend**              | React, TypeScript, Leaflet.js, CSS3                                                                      |
| **Backend Services**      | Go, Python, Flask                                                                                        |
| **Communication**         | gRPC (for high-throughput telemetry), REST API (for commands), WebSockets (for live UI updates)            |
| **Infrastructure**        | PostgreSQL (database), RabbitMQ (message broker)                                                         |
| **DevOps & Orchestration**| **Docker**, **Kubernetes (simulated AWS EKS)**, Docker Compose (for local dev), **GitHub Actions (CI/CD)** |

---

## Running Locally

The simplest way to run the entire Odyssey platform on your local machine is with Docker Compose.

### Prerequisites

-   Git
-   Docker Desktop (with Docker Compose V2)
-   Node.js and npm

### Instructions

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/odyssey.git
    cd odyssey
    ```

2.  **Start the entire backend stack:**
    This single command will build the Docker images for all services and start them in the correct order.
    ```bash
    docker-compose up --build
    ```
    The backend is now running. You will see logs from all services in your terminal.

3.  **Run the web dashboard:**
    In a **new terminal window**, navigate to the web directory, install dependencies, and start the development server.
    ```bash
    cd web/dashboard
    npm install
    npm start
    ```

4.  **Access Mission Control:**
    Open your browser and navigate to `http://localhost:3000`.

---

## Kubernetes Deployment (Local & Cloud)

This project is configured for a full Kubernetes deployment, mirroring a production environment.

### Local Kubernetes (Docker Desktop)

1.  **Prerequisites:** Ensure Kubernetes is enabled in Docker Desktop.
2.  **Build Local Images:** Run `docker build` for each service as detailed in the development workflow.
3.  **Configure Secrets:** Copy `k8s/postgres-secret.template.yml` to `k8s/postgres-secret.yml` and provide a password.
4.  **Deploy:** Apply all manifests to the cluster:
    ```bash
    kubectl apply -f k8s/
    ```
5.  **Access:** The `telemetry-service` and `c2-service` are exposed via `NodePort`s on `localhost:30080` and `localhost:30081` respectively.

### Cloud Deployment (Simulated AWS EKS)

The project includes a full CI/CD pipeline defined in `.github/workflows/deploy.yml` to automate deployment to a managed Kubernetes cluster on AWS EKS.

-   On every push to `main`, the workflow automatically builds all service images and pushes them to Docker Hub.
-   A subsequent job connects to the EKS cluster, updates the image tags using Kustomize, and applies the manifests for a seamless rolling update.
-   An **Ingress Controller** is used to manage external traffic, routing API and WebSocket requests to the appropriate services.