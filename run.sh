#!/bin/bash
# run.sh

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Build and run the containers
echo "Building and starting containers..."
docker-compose up --build -d

# Wait for containers to be ready
echo "Waiting for containers to be ready..."
sleep 5

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo "Application is running!"
    echo "Frontend: http://localhost:3000"
    echo "Backend: http://localhost:8000"
else
    echo "Error: Containers failed to start properly"
    docker-compose logs
    exit 1
fi

# Function to stop containers
cleanup() {
    echo "Stopping containers..."
    docker-compose down
}

# Register cleanup function
trap cleanup EXIT

# Keep script running
echo "Press Ctrl+C to stop the application"
while true; do sleep 1; done