#!/bin/bash

set -e

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
pnpm build:excalidraw-assets || { echo "Error: Failed to build excalidraw assets."; exit 1; }

# webui
echo "Building webui..."
cd desktop/webui && make || { echo "Error: Failed to build webui."; exit 1; }

echo "Done!"
