#!/bin/bash

# Create js/lib directory if it doesn't exist
mkdir -p js/lib

# Download Three.js
echo "Downloading Three.js..."
curl -L https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js -o js/lib/three.min.js

# Download OrbitControls for Three.js
echo "Downloading OrbitControls for Three.js..."
curl -L https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.min.js -o js/lib/OrbitControls.min.js

# Download PixiJS
echo "Downloading PixiJS..."
curl -L https://cdnjs.cloudflare.com/ajax/libs/pixi.js/6.0.4/browser/pixi.min.js -o js/lib/pixi.min.js

echo "Libraries downloaded successfully!" 