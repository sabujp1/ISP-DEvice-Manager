#!/bin/bash

# Exit on error
set -e

echo "============================================="
echo " OLT Manager NOC Dashboard - Ubuntu Deploy    "
echo "============================================="

# 1. Update and check dependencies
echo "[1/3] Validating system dependencies..."
sudo apt-get update -y

# Check Docker
if ! [ -x "$(command -v docker)" ]; then
  echo "Docker is not installed. Installing Docker Engine..."
  sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  echo "Docker Engine installed successfully."
fi

# Add current user to Docker group if not root
if [ "$USER" != "root" ]; then
  sudo usermod -aG docker $USER
fi

# Check Docker Compose (using V2 compose plugin or V1 binary fallback)
COMPOSE_CMD="docker compose"
if ! docker compose version &>/dev/null; then
  if [ -x "$(command -v docker-compose)" ]; then
    COMPOSE_CMD="docker-compose"
  else
    echo "Installing Docker Compose Plugin..."
    sudo apt-get install -y docker-compose-plugin
  fi
fi

# 2. Build and launch container
echo "[2/3] Building and starting OLT Manager container..."
sudo $COMPOSE_CMD up -d --build

# 3. Complete
echo "[3/3] Done!"
echo "============================================="
echo "OLT Manager NOC Dashboard has been deployed."
echo "Access port: http://\$(curl -s ifconfig.me || echo 'your-server-ip'):80"
echo "Command to view logs: sudo \$COMPOSE_CMD logs -f"
echo "============================================="
