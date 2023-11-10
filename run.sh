#!/bin/bash

# Check if Node.js is installed
if ! [ -x "$(command -v node)" ]; then
  echo "Error: Node.js is not installed. Please install Node.js (v18 or later) before running this script."
  exit 1
fi

# Check if Deno is installed
if ! [ -x "$(command -v deno)" ]; then
  echo "Error: Deno is not installed. Please install Deno (v1.36 or later) before running this script."
  exit 1
fi

# Check if pnpm is installed
if ! [ -x "$(command -v pnpm)" ]; then
  echo "Error: pnpm is not installed. Please install pnpm before running this script."
  exit 1
fi

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo "Warning: Docker is not installed. The Docker-related steps won't be executed."
fi

# Check if cargo-contract is installed
if ! [ -x "$(command -v cargo-contract)" ]; then
  echo "Warning: cargo-contract is not installed. The contract compilation steps won't be executed."
fi

# Frontend
echo "Setting up frontend..."
pnpm install
pnpm dev-frontend
echo "Running frontend tests..."
pnpm test-frontend

# Backend
echo "Setting up backend..."
pnpm pull-submodules
pnpm dev-deno
pnpm dev-desktop

# Excaildraw Assets
echo "Building excalidraw assets..."
cp -rf ./node_modules/@galaxydo/excalidraw/dist/excalidraw-assets ./dist

# webui
echo "Building webui..."
cd desktop/webui && make

echo "Done!"

