# Bootstrap Scripts - Genesis Seeding Implementation

## ✅ Completed

### Files Created

1. **`scripts/bootstrapSeats.ts`** (11.5 KB)
   - Genesis seat minting script
   - Mints 10 seats across 3 parties using hardhat test wallets
   - Validates all mints succeed
   - Exports genesis state to JSON

2. **`scripts/README.md`** (11.7 KB)
   - Complete documentation for both deploy and bootstrap scripts
   - Full setup guide with step-by-step instructions
   - Troubleshooting section
   - Customization examples
   - Architecture overview

3. **`bootstrap.sh`** (2.2 KB)
   - Convenience bash script for one-command setup
   - Checks for running hardhat node
   - Runs deploy.ts then bootstrapSeats.ts in sequence

4. **`genesis-state.json`** (1.7 KB)
   - Output file from bootstrap
   - Contains all genesis member data
   - Seat-to-wallet mapping
   - Party allocation summary
   - Network and timestamp info

### Deploy Script Enhancements

**`scripts/deploy.ts`** was already updated with:
- ✅ Line 90: `seatNft.setGovernance(executionEngine.getAddress())`
  - Wires ExecutionEngine as SeatNFT governance authority
  - Enables seat reassignment functionality

---

## 📊 Genesis Allocation

The bootstrap creates **10 seats** distributed as:

| Party | ID | Seats | Members |
|-------|----|----|---------|
| **Golkar** | 1 | 4 | Wallets 0-3 |
| **PDIP** | 2 | 3 | Wallets 4-6 |
| **Democrat** | 3 | 3 | Wallets 7-9 |

Each member gets **exactly 1 seat**.

### Genesis Wallets (Hardhat)

```
Wallet 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (Party 1)
Wallet 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (Party 1)
Wallet 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC (Party 1)
Wallet 3: 0x90F79bf6EB2c4f870365E785982E1f101E93b906 (Party 1)

Wallet 4: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65 (Party 2)
Wallet 5: 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc (Party 2)
Wallet 6: 0x976EA74026E726554dB657fA54763abd0C3a0aa9 (Party 2)

Wallet 7: 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955 (Party 3)
Wallet 8: 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f (Party 3)
Wallet 9: 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 (Party 3)
```

---

## 🚀 Usage

### Quick Start (Recommended)
```bash
# Terminal 1: Start hardhat node
npx hardhat node

# Terminal 2: Run bootstrap (both deploy + mint)
cd /path/to/DPR-voting-dapp

# Option A: Using bash script
bash bootstrap.sh

# Option B: Manual (step by step)
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/bootstrapSeats.ts --network localhost
```

### With Frontend
```bash
# Terminal 3: Start frontend dev server
cd frontend
npm run dev
# Visit http://localhost:3000
```

---

## ✨ Features

### Bootstrap Script Features

✅ **Deterministic Wallets**
- Uses hardhat's built-in test wallets
- Always the same 10 addresses
- Reproducible across restarts

✅ **Error Handling**
- Verifies hardhat node is running
- Checks contract addresses exist
- Validates all mints succeed
- Verifies final state

✅ **Progress Reporting**
- Clear step-by-step output
- Party allocation displayed
- Summary statistics
- Genesis state exported

✅ **Customizable**
- Easy to modify seat allocation
- Party names configurable
- Can adjust wallet distribution

---

## 🔍 Script Execution Details

### Bootstrap Script Flow
```
1. Verify hardhat node connectivity
2. Load deployed contract addresses from frontend/src/contracts/addresses.json
3. Create 10 genesis members with party assignments
4. Connect to SeatNFT contract
5. For each member:
   - Call seatNft.mint(address, partyId)
   - Extract seat ID from event
   - Record result
6. Verify final state:
   - totalSupply = 10
   - Each member balance = 1
7. Export genesis-state.json with full mapping

Output:
- ✅ 10 seats minted across 3 parties
- ✅ All wallets have voting rights
- ✅ genesis-state.json created
```

### Governance Readiness After Bootstrap

After bootstrap completes:

| Component | Status | Ready for Testing |
|-----------|--------|-------------------|
| **Contracts Deployed** | ✅ | YES |
| **Genesis Seats Minted** | ✅ | YES |
| **System Wired** | ✅ | YES |
| **Voting Eligible Wallets** | ✅ | 10 wallets |
| **Party Sponsorship** | ✅ | 3 parties available |
| **Manual Mint** | N/A | Can be done anytime |

---

## 📝 Configuration

### Customize Genesis Allocation

Edit `scripts/bootstrapSeats.ts` line 48-64:

```typescript
// Example: 20 seats across 4 parties
const members: Member[] = [
  // Party 1: 6 seats (wallets 0-5)
  { address: signers[0].address, partyId: 1, partyName: "Golkar" },
  // ... repeat 5 more times

  // Party 2: 5 seats (wallets 6-10)
  { address: signers[6].address, partyId: 2, partyName: "PDIP" },
  // ... repeat 4 more times

  // Party 3: 5 seats (wallets 11-15)
  // Party 4: 4 seats (wallets 16-19)
];
```

Then re-run: `npx hardhat run scripts/bootstrapSeats.ts --network localhost`

---

## 🧪 Testing

After bootstrap, test governance flow:

```bash
# Run integration tests
npx hardhat test test/GovernanceIntegration.sol

# Run a specific test
npx hardhat test test/GovernanceIntegration.sol --grep "testSeatNFTNonTransferable"

# Test in web UI
# 1. Start frontend: cd frontend && npm run dev
# 2. Connect MetaMask to http://localhost:8545
# 3. Import any genesis wallet
# 4. Create a proposal (requires seat ownership)
# 5. Have other members support/vote
```

---

## 🔗 Related Documentation

- **Deployment:** See `scripts/README.md` for full deploy documentation
- **Contract Architecture:** See `contracts/governance/` for smart contract details
- **Frontend Integration:** See `frontend/src/hooks/governance/` for hook implementations
- **Analysis:** See main project analysis report for system readiness status

---

## Summary

✅ **Bootstrap system is production-ready for testing**

The scripts provide a complete genesis setup that:
- Deploys all governance contracts
- Creates 10 initial seats across 3 parties
- Validates system integrity
- Exports traceable genesis state

All governance operations are now possible:
- ✅ Creating proposals
- ✅ Supporting proposals with cross-party sponsorship
- ✅ Starting voting periods
- ✅ Casting votes
- ✅ Executing approved proposals
- ✅ Modifying governance parameters

Happy governing! 🏛️
