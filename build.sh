#!/bin/bash

# Delete the ./build directory if it exists
if [ -d "./build" ]; then
  rm -rf ./build
fi

# Create a new ./build directory
mkdir ./build

# use bun in frontend and output to ./build
cd frontend
bun run build --outdir ../build
cd ..

# Copy the backend/api directory to ./build/api
cp -r backend/api ./build/
cp .htaccess ./build/