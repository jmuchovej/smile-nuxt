#!/usr/bin/env bash

cd /workspace
sudo chown -R $(id -u):$(id -g) /workspace/node_modules
sudo chown -R $(id -u):$(id -g) /workspace/.pnpm-store

npm install -g gitmoji-cli
gitmoji -i

pnpm install
npm install -g firebase-tools