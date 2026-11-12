import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Bootstrap script to mint initial seats for governance system
 *
 * Creates seats for 10 hardhat test wallets distributed across 3 parties:
 * - Party 1 (Golkar): 4 seats
 * - Party 2 (PDIP): 3 seats
 * - Party 3 (Democrat): 3 seats
 */

interface Member {
  address: string;
  partyId: number;
  partyName: string;
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║         GOVERNANCE BOOTSTRAP: SEAT MINTING (Genesis)       ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const [deployer] = await ethers.getSigners();
  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);

  // ═══════════════════════════════════════════════════════════════════════
  // 1. LOAD CONTRACT ADDRESSES
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Loading Contract Addresses ---");
  const addressesPath = path.join(__dirname, "../frontend/src/contracts/addresses.json");

  if (!fs.existsSync(addressesPath)) {
    console.error("❌ Contract addresses file not found at:", addressesPath);
    console.error("   Run 'npx hardhat run scripts/deploy.ts' first");
    process.exit(1);
  }

  const addressesData = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
  const addresses = addressesData[network.name] || addressesData["localhost"];

  if (!addresses) {
    console.error("❌ No addresses found for network:", network.name);
    process.exit(1);
  }

  console.log("✅ SeatNFT:", addresses.seatNft);

  // ═══════════════════════════════════════════════════════════════════════
  // 2. DEFINE GENESIS MEMBERS (10 wallets, 3 parties)
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Defining Genesis Members ---");

  // Get 10 hardhat test wallets (indices 0-9)
  const signers = await ethers.getSigners();
  if (signers.length < 10) {
    console.error(`❌ Not enough signers. Expected 10, got ${signers.length}`);
    console.error("   Check hardhat.config.cjs for network configuration");
    process.exit(1);
  }

  const members: Member[] = [
    // Party 1: Golkar (4 seats)
    { address: signers[0].address, partyId: 1, partyName: "Golkar" },
    { address: signers[1].address, partyId: 1, partyName: "Golkar" },
    { address: signers[2].address, partyId: 1, partyName: "Golkar" },
    { address: signers[3].address, partyId: 1, partyName: "Golkar" },

    // Party 2: PDIP (3 seats)
    { address: signers[4].address, partyId: 2, partyName: "PDIP" },
    { address: signers[5].address, partyId: 2, partyName: "PDIP" },
    { address: signers[6].address, partyId: 2, partyName: "PDIP" },

    // Party 3: Democrat (3 seats)
    { address: signers[7].address, partyId: 3, partyName: "Democrat" },
    { address: signers[8].address, partyId: 3, partyName: "Democrat" },
    { address: signers[9].address, partyId: 3, partyName: "Democrat" },
  ];

  console.log(`✅ Created ${members.length} genesis members:`);
  console.log(`   - Party 1 (Golkar): 4 seats`);
  console.log(`   - Party 2 (PDIP): 3 seats`);
  console.log(`   - Party 3 (Democrat): 3 seats`);

  // ═══════════════════════════════════════════════════════════════════════
  // 3. LOAD SEATNFT CONTRACT
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Loading SeatNFT Contract ---");
  const SeatNFT = await ethers.getContractFactory("SeatNFT");
  const seatNft = SeatNFT.attach(addresses.seatNft);

  // Verify connection
  try {
    const totalSupply = await seatNft.totalSupply();
    console.log(`✅ Connected to SeatNFT at ${addresses.seatNft}`);
    console.log(`   Current totalSupply: ${totalSupply}`);
  } catch (error) {
    console.error("❌ Failed to connect to SeatNFT contract");
    console.error(error);
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. MINT SEATS FOR GENESIS MEMBERS
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Minting Genesis Seats ---");
  const mintedSeats: Array<{ seatId: number; address: string; partyId: number; partyName: string }> = [];

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    try {
      console.log(
        `\n[${i + 1}/${members.length}] Minting seat for ${member.partyName}...`
      );
      console.log(`    Address: ${member.address}`);
      console.log(`    Party ID: ${member.partyId}`);

      const tx = await seatNft.mint(member.address, member.partyId);
      const receipt = await tx.wait();

      // Extract seat ID from events
      const event = receipt?.logs
        .map((log: any) => {
          try {
            return seatNft.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: { name: string; }) => e?.name === "SeatMinted");

      const seatId = event?.args?.[0] ?? i + 1;

      mintedSeats.push({
        seatId: Number(seatId),
        address: member.address,
        partyId: member.partyId,
        partyName: member.partyName,
      });

      console.log(`    ✅ Seat minted: #${seatId}`);
    } catch (error) {
      console.error(`    ❌ Failed to mint seat for ${member.address}`);
      console.error(error);
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 5. VERIFY RESULTS
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Verifying Genesis State ---");

  try {
    const finalTotalSupply = await seatNft.totalSupply();
    console.log(`✅ Total seats issued: ${finalTotalSupply}`);

    // Verify each member's balance
    let allBalancesCorrect = true;
    for (const member of members) {
      const balance = await seatNft.balanceOf(member.address);
      if (balance !== 1n) {
        console.error(
          `❌ ${member.address} should have 1 seat, has ${balance}`
        );
        allBalancesCorrect = false;
      }
    }

    if (allBalancesCorrect) {
      console.log("✅ All members have correct seat balances");
    } else {
      console.error("❌ Some members have incorrect balances");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Verification failed");
    console.error(error);
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 6. DISPLAY GENESIS REPORT
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║              GENESIS SEATS - MINTING COMPLETE              ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Party breakdown table
  const groupedByParty = {
    1: { name: "Golkar", seats: [] as typeof mintedSeats },
    2: { name: "PDIP", seats: [] as typeof mintedSeats },
    3: { name: "Democrat", seats: [] as typeof mintedSeats },
  };

  mintedSeats.forEach((seat) => {
    groupedByParty[seat.partyId as keyof typeof groupedByParty]?.seats.push(
      seat
    );
  });

  console.log("PARTY ALLOCATION:\n");
  Object.entries(groupedByParty).forEach(([, party]) => {
    console.log(`${party.name} (${party.seats.length} seats):`);
    party.seats.forEach((seat) => {
      console.log(
        `  Seat #${seat.seatId}: ${seat.address}`
      );
    });
    console.log("");
  });

  // Genesis summary table
  console.log("GENESIS SUMMARY:");
  console.log(
    `  Total Seats: ${mintedSeats.length}`
  );
  console.log(`  Party 1 (Golkar): ${groupedByParty[1].seats.length}`);
  console.log(`  Party 2 (PDIP): ${groupedByParty[2].seats.length}`);
  console.log(`  Party 3 (Democrat): ${groupedByParty[3].seats.length}`);
  console.log(
    `\n  ✅ System ready for governance operations!\n`
  );

  // ═══════════════════════════════════════════════════════════════════════
  // 7. EXPORT GENESIS STATE (Optional)
  // ═══════════════════════════════════════════════════════════════════════

  const genesisData = {
    network: network.name,
    timestamp: new Date().toISOString(),
    seatNftAddress: addresses.seatNft,
    totalSeatsCreated: mintedSeats.length,
    members: mintedSeats,
    partyAllocation: {
      golkar: groupedByParty[1].seats.length,
      pdip: groupedByParty[2].seats.length,
      democrat: groupedByParty[3].seats.length,
    },
  };

  if (network.name === "localhost" || network.name === "hardhat") {
    const genesisPath = path.join(__dirname, "../genesis-state.json");
    fs.writeFileSync(genesisPath, JSON.stringify(genesisData, null, 2));
    console.log(`\n📄 Genesis state exported to: ${genesisPath}`);
  }
}

main().catch((error) => {
  console.error("❌ Bootstrap script failed:");
  console.error(error);
  process.exit(1);
});
