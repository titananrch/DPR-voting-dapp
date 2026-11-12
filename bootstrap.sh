#!/bin/bash

# Quick Bootstrap Script
# Runs the full deployment + genesis seeding in sequence
# This is a convenience wrapper for developers

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   DPR Voting dApp - Quick Bootstrap Setup                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if hardhat node is running
echo "🔍 Checking for running Hardhat node..."
if ! curl -s http://localhost:8545 -X POST -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' > /dev/null 2>&1; then
    echo "⚠️  Hardhat node is not running on localhost:8545"
    echo ""
    echo "Start a hardhat node with:"
    echo "  npx hardhat node"
    echo ""
    echo "Then run this script again in a new terminal."
    exit 1
fi
echo "✅ Hardhat node is running"
echo ""

# Deploy contracts
echo "📦 Deploying contracts..."
npx hardhat run scripts/deploy.ts --network localhost
echo ""

# Bootstrap genesis seats
echo "🌱 Bootstrapping genesis seats..."
npx hardhat run scripts/bootstrapSeats.ts --network localhost
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║            ✅ Bootstrap Complete!                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "  1. Start the frontend: cd frontend && npm run dev"
echo "  2. Open http://localhost:3000 in your browser"
echo "  3. Connect MetaMask to http://localhost:8545"
echo "  4. Import a test wallet and start creating proposals!"
echo ""
echo "Genesis accounts (with seats) are in genesis-state.json"
echo ""

# Start the frontend
echo "🚀 Starting frontend..."
cd frontend && npm run dev

