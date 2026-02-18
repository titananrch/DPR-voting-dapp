import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);

  // ═══════════════════════════════════════════════════════════════════════
  // 1. DEPLOY SEATNFT (Constitutional Layer)
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Deploying SeatNFT ---");
  const SeatNFT = await ethers.getContractFactory("SeatNFT");
  const seatNft = await SeatNFT.deploy(
    100,                         // maxSupply
    deployer.address,            // electionAuthority
    deployer.address,            // recallAuthority
    deployer.address             // owner
  );
  await seatNft.waitForDeployment();
  console.log("✅ SeatNFT deployed:", await seatNft.getAddress());

  // ═══════════════════════════════════════════════════════════════════════
  // 2. DEPLOY GOVERNANCECONFIG (without ExecutionEngine)
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Deploying GovernanceConfig ---");
  const GovernanceConfig = await ethers.getContractFactory("GovernanceConfig");
  const governanceConfig = await GovernanceConfig.deploy(
    await seatNft.getAddress(), // seatNftAddress
    deployer.address,           // electionAuthority
    deployer.address            // recallAuthority
  );
  await governanceConfig.waitForDeployment();
  console.log("✅ GovernanceConfig deployed:", await governanceConfig.getAddress());

  // ═══════════════════════════════════════════════════════════════════════
  // 3. DEPLOY PROPOSALDRAFTMANAGER
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Deploying ProposalDraftManager ---");
  const ProposalDraftManager = await ethers.getContractFactory("ProposalDraftManager");
  const proposalManager = await ProposalDraftManager.deploy(
    await seatNft.getAddress(),           // seatNft
    await governanceConfig.getAddress()   // governanceConfig
  );
  await proposalManager.waitForDeployment();
  console.log("✅ ProposalDraftManager deployed:", await proposalManager.getAddress());

  // ═══════════════════════════════════════════════════════════════════════
  // 4. DEPLOY VOTINGENGINE
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Deploying VotingEngine ---");
  const VotingEngine = await ethers.getContractFactory("VotingEngine");
  const votingEngine = await VotingEngine.deploy(
    await seatNft.getAddress(),            // seatNft
    await governanceConfig.getAddress(),   // governanceConfig
    await proposalManager.getAddress()     // proposalManager
  );
  await votingEngine.waitForDeployment();
  console.log("✅ VotingEngine deployed:", await votingEngine.getAddress());

  // ═══════════════════════════════════════════════════════════════════════
  // 5. DEPLOY ACTIONEXECUTOR (with zero address initially)
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Deploying ActionExecutor ---");
  const ActionExecutor = await ethers.getContractFactory("ActionExecutor");
  const actionExecutor = await ActionExecutor.deploy(ethers.ZeroAddress);
  await actionExecutor.waitForDeployment();
  console.log("✅ ActionExecutor deployed:", await actionExecutor.getAddress());

  // ═══════════════════════════════════════════════════════════════════════
  // 6. DEPLOY EXECUTIONENGINE
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Deploying ExecutionEngine ---");
  const ExecutionEngine = await ethers.getContractFactory("ExecutionEngine");
  const executionEngine = await ExecutionEngine.deploy(
    await seatNft.getAddress(),            // seatNft
    await governanceConfig.getAddress(),   // governanceConfig
    await proposalManager.getAddress(),    // proposalManager
    await votingEngine.getAddress(),       // votingEngine
    await actionExecutor.getAddress()      // actionExecutor
  );
  await executionEngine.waitForDeployment();
  console.log("✅ ExecutionEngine deployed:", await executionEngine.getAddress());

  // ═══════════════════════════════════════════════════════════════════════
  // 7. WIRE EXECUTIONENGINE INTO GOVERNANCECONFIG AND ACTIONEXECUTOR
  // ═══════════════════════════════════════════════════════════════════════

  console.log("\n--- Wiring ExecutionEngine into GovernanceConfig & ActionExecutor ---");
  const executionEngineAddress = await executionEngine.getAddress();
  
  // Check if we need to set executionEngineAddress in GovernanceConfig
  const currentGovExecutionEngine = await governanceConfig.executionEngineAddress();
  if (currentGovExecutionEngine === ethers.ZeroAddress) {
    const setGovTx = await governanceConfig.setExecutionEngine(executionEngineAddress);
    await setGovTx.wait();
    console.log("✅ ExecutionEngine wired into GovernanceConfig");
  } else {
    console.log("⚠️  ExecutionEngine already set in GovernanceConfig");
  }
  
  // Check if we need to set executionEngine in ActionExecutor
  const currentActionExecutionEngine = await actionExecutor.executionEngine();
  if (currentActionExecutionEngine === ethers.ZeroAddress) {
    const setActionTx = await actionExecutor.setExecutionEngine(executionEngineAddress);
    await setActionTx.wait();
    console.log("✅ ExecutionEngine wired into ActionExecutor");
  } else {
    console.log("⚠️  ExecutionEngine already set in ActionExecutor");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EXPORT ADDRESSES
  // ═══════════════════════════════════════════════════════════════════════

  const addresses = {
    [network.name]: {
      seatNft: await seatNft.getAddress(),
      governanceConfig: await governanceConfig.getAddress(),
      proposalDraftManager: await proposalManager.getAddress(),
      votingEngine: await votingEngine.getAddress(),
      actionExecutor: await actionExecutor.getAddress(),
      executionEngine: executionEngineAddress,
      deploymentTimestamp: new Date().toISOString(),
      network: network.name,
    },
  };

  console.log("\n--- Deployment Complete ---");
  console.log(JSON.stringify(addresses, null, 2));

  // Export for frontend (local only)
  if (network.name === "localhost" || network.name === "hardhat") {
    const outPath = path.join(
      __dirname,
      "../frontend/src/contracts/addresses.json"
    );
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
    console.log("\n✅ Addresses exported to:", outPath);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
