#!/bin/bash
# Script to build the Electron app for Windows using Docker (electronuserland/builder:wine)

echo "Starting Docker build process for Windows (32-bit & 64-bit)..."

docker run --rm -it \
  --env-file <(env | grep -iE 'DEBUG|NODE_|ELECTRON_|YARN_|NPM_|CI|CIRCLE|TRAVIS_APPDIR|APPVEYOR_|CSC_|GH_|GITHUB_|BT_|AWS_|STRIP|BUILD_') \
  -v ${PWD}:/project \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  /bin/bash -c "npm install && mkdir -p node_modules/sqlite3/prebuilds && curl -L -o node_modules/sqlite3/prebuilds/sqlite3-v6.0.1-napi-v36-win32-x64.tar.gz https://github.com/TryGhost/node-sqlite3/releases/download/v6.0.1/sqlite3-v6.0.1-napi-v6-win32-x64.tar.gz && npm run build-win"

echo "Build complete! Check the 'dist' folder for your .exe files."
