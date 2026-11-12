# Governance System Scripts

This directory contains scripts for deploying and initializing the Democratic Parliament voting governance system.

## Overview

### 1. `deploy.ts` - Contract Deployment
Deploys all governance contracts to the blockchain.

**Contracts deployed:**
- `SeatNFT` - Non-transferable governance seats (constitutional layer)
- `GovernanceConfig` - Mutable governance parameters
- `ProposalDraftManager` - Proposal lifecycle management
- `VotingEngine` - Transparent voting system
- `ActionExecutor` - Whitelisted action execution
- `ExecutionEngine` - Proposal execution and rule enforcement

**What it does:**
- Deploys all 6 contracts in dependency order
- Wires ExecutionEngine into GovernanceConfig and ActionExecutor
- Sets SeatNFT governance to ExecutionEngine
- Exports contract addresses to `frontend/src/contracts/addresses.json`

**Usage:**
```bash
# Deploy to localhost (hardhat node)
npx hardhat run scripts/deploy.ts --network localhost

# Deploy to testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Deploy to mainnet
npx hardhat run scripts/deploy.ts --network mainnet
```

**Output:**
```
✅ SeatNFT deployed: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ GovernanceConfig deployed: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
...
✅ Addresses exported to: frontend/src/contracts/addresses.json
```

---

### 2. `bootstrapSeats.ts` - Genesis Seat Minting
Mints initial seats for governance system to be operational.

**What it does:**
- Creates 10 genesis seats distributed across 3 political parties
- Uses hardhat test wallets (deterministic, well-known addresses)
- Verifies each member has exactly 1 seat
- Exports genesis state to `genesis-state.json`

**Genesis Allocation:**

| Party | Seats | Members |
|-------|-------|---------|
| Golkar (Party 1) | 4 | Addresses 0-3 |
| PDIP (Party 2) | 3 | Addresses 4-6 |
| Democrat (Party 3) | 3 | Addresses 7-9 |

**Prerequisites:**
1. Hardhat node must be running
2. Contracts must be deployed (via `deploy.ts`)
3. SeatNFT contract must have no seats yet

**Usage:**

**Option A: Run manually (step-by-step)**
```bash
# Terminal 1: Start hardhat node
npx hardhat node

# Terminal 2: Deploy contracts
npx hardhat run scripts/deploy.ts --network localhost

# Terminal 3: Bootstrap genesis seats
npx hardhat run scripts/bootstrapSeats.ts --network localhost
```

**Option B: Use the quick start script (recommended)**
```bash
# Run all steps in order
npm run bootstrap
```

Add this to `package.json` if not present:
```json
{
  "scripts": {
    "hardhat-node": "hardhat node",
    "deploy": "hardhat run scripts/deploy.ts --network localhost",
    "bootstrap": "npm run deploy && hardhat run scripts/bootstrapSeats.ts --network localhost"
  }
}
```

---

## Full Setup Guide (End-to-End)

### 1. Start the Hardhat Node
```bash
npx hardhat node
```

**Output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts (10) ============
(0) 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
(1) 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...
```

**Keep this terminal running.** This is your local blockchain.

---

### 2. Deploy Contracts
In a new terminal:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

**Verifies:**
- ✅ All 6 contracts deployed successfully
- ✅ ExecutionEngine wired into system
- ✅ SeatNFT governance set
- ✅ Addresses exported to frontend

**Output:**
```
✅ SeatNFT deployed: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✅ GovernanceConfig deployed: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✅ ProposalDraftManager deployed: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
✅ VotingEngine deployed: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
✅ ActionExecutor deployed: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
✅ ExecutionEngine deployed: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
✅ ExecutionEngine wired into GovernanceConfig
✅ ExecutionEngine wired into ActionExecutor
✅ Addresses exported to: frontend/src/contracts/addresses.json
```

---

### 3. Bootstrap Genesis Seats
In a new terminal (or the same terminal):
```bash
npx hardhat run scripts/bootstrapSeats.ts --network localhost
```

**Verifies:**
- ✅ All 10 genesis seats minted
- ✅ Each member has exactly 1 seat
- ✅ Party allocation correct
- ✅ Genesis state exported

**Output:**
```
PARTY ALLOCATION:

Golkar (4 seats):
  Seat #1: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  Seat #2: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  Seat #3: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  Seat #4: 0x90F79bf6EB2c4f870365E785982E1f101E93b906

PDIP (3 seats):
  Seat #5: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
  Seat #6: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
  Seat #7: 0x976EA74026E726554dB657fA54763abd0C3a0aa9

Democrat (3 seats):
  Seat #8: 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955
  Seat #9: 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
  Seat #10: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720

✅ System ready for governance operations!
```

---

## Genesis State File

After bootstrapping, a `genesis-state.json` file is created at the project root:

```json
{
  "network": "localhost",
  "timestamp": "2026-04-01T04:05:47.270Z",
  "seatNftAddress": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "totalSeatsCreated": 10,
  "members": [
    {
      "seatId": 1,
      "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      "partyId": 1,
      "partyName": "Golkar"
    },
    ...
  ],
  "partyAllocation": {
    "golkar": 4,
    "pdip": 3,
    "democrat": 3
  }
}
```

This file can be used to:
- Track which wallets have seats
- Configure frontend demo accounts
- Verify genesis state on subsequent deployments

---

## Testing the Governance System

After bootstrapping, the system is ready for testing:

### Web UI Testing
```bash
# In a new terminal, start the frontend dev server
cd frontend
npm run dev
```

Connect with MetaMask to `http://localhost:8545` and import any of the genesis accounts.

### Manual Contract Testing
```bash
# Run integration tests
npx hardhat test test/GovernanceIntegration.sol

# Run specific test
npx hardhat test test/GovernanceIntegration.sol --grep "testSeatNFTNonTransferable"
```

---

## Troubleshooting

### Error: "Cannot connect to the network localhost"
**Cause:** Hardhat node is not running.
**Solution:** Run `npx hardhat node` in a separate terminal.

### Error: "Contract addresses file not found"
**Cause:** Contracts have not been deployed yet.
**Solution:** Run `npx hardhat run scripts/deploy.ts --network localhost` first.

### Error: "Not enough signers. Expected 10, got X"
**Cause:** Hardhat is configured with fewer accounts than needed.
**Solution:** Update `hardhat.config.cjs` to include at least 10 accounts:
```javascript
module.exports = {
  networks: {
    localhost: {
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 10  // Set to at least 10
      }
    }
  }
}
```

### Error: "Proposal does not exist" or "Must hold a seat to propose"
**Cause:** Genesis seats have not been minted, or you're using a different account.
**Solution:** Ensure `bootstrapSeats.ts` completed successfully, and use one of the genesis wallets.

---

## Customizing Genesis Allocation

To create a different seat distribution, edit `bootstrapSeats.ts`:

### Example: 8 seats across 2 parties

```typescript
const members: Member[] = [
  // Party 1: Golkar (5 seats)
  { address: signers[0].address, partyId: 1, partyName: "Golkar" },
  { address: signers[1].address, partyId: 1, partyName: "Golkar" },
  { address: signers[2].address, partyId: 1, partyName: "Golkar" },
  { address: signers[3].address, partyId: 1, partyName: "Golkar" },
  { address: signers[4].address, partyId: 1, partyName: "Golkar" },

  // Party 2: PDIP (3 seats)
  { address: signers[5].address, partyId: 2, partyName: "PDIP" },
  { address: signers[6].address, partyId: 2, partyName: "PDIP" },
  { address: signers[7].address, partyId: 2, partyName: "PDIP" },
];
```

Then re-run the bootstrap script.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│           GOVERNANCE SYSTEM LAYERS                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Constitutional Layer                        │  │
│  │  • SeatNFT (non-transferable, soulbound)    │  │
│  │  • Max 100 seats, distributed by party      │  │
│  └──────────────────────────────────────────────┘  │
│                           △                        │
│                           │                        │
│  ┌──────────────────────────────────────────────┐  │
│  │  Operational Layer                           │  │
│  │  • GovernanceConfig (parameters)             │  │
│  │  • ProposalDraftManager (lifecycle)          │  │
│  │  • VotingEngine (transparent voting)         │  │
│  │  • ExecutionEngine (voting results)          │  │
│  │  • ActionExecutor (whitelisted actions)      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  User Layer                                  │  │
│  │  • Web UI (React + Wagmi + TanStack Query)  │  │
│  │  • MetaMask wallet connection                │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Related Files

- **Smart Contracts:** `contracts/governance/`
- **Frontend Code:** `frontend/src/`
- **Integration Tests:** `test/GovernanceIntegration.sol`
- **Frontend Addresses:** `frontend/src/contracts/addresses.json`
- **Genesis State:** `genesis-state.json` (created after bootstrap)

---

## Next Steps

After bootstrapping:

1. **Start the frontend:** `cd frontend && npm run dev`
2. **Connect MetaMask** to localhost:8545
3. **Import Genesis Accounts** using private keys from hardhat node startup
4. **Create Proposals** and test the governance flow
5. **Vote** on proposals with different wallet accounts
6. **Execute** approved proposals

Happy governing! 🏛️
