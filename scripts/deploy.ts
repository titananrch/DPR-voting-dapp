import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Network:", network.name);
  console.log("Deployer:", deployer.address);

  const TopicManager = await ethers.getContractFactory("VotingTopicManager");
  const topicManager = await TopicManager.deploy();
  await topicManager.waitForDeployment();

  const PartyRegistry = await ethers.getContractFactory("PartyRegistry");
  const partyRegistry = await PartyRegistry.deploy();
  await partyRegistry.waitForDeployment();

  const MemberRegistry = await ethers.getContractFactory("MemberRegistry");
  const memberRegistry = await MemberRegistry.deploy(await partyRegistry.getAddress());
  await memberRegistry.waitForDeployment();

  const PartyVoting = await ethers.getContractFactory("PartyAggregatedVoting");
  const partyVoting = await PartyVoting.deploy(
    await memberRegistry.getAddress(),
    await partyRegistry.getAddress(),
    await topicManager.getAddress()
  );
  await partyVoting.waitForDeployment();

  const DPRVoting = await ethers.getContractFactory("DPRVoting");
  const dprVoting = await DPRVoting.deploy(
    await topicManager.getAddress(),
    await partyVoting.getAddress()
  );
  await dprVoting.waitForDeployment();

  const addresses = {
    network: network.name,
    topicManager: await topicManager.getAddress(),
    partyRegistry: await partyRegistry.getAddress(),
    memberRegistry: await memberRegistry.getAddress(),
    partyVoting: await partyVoting.getAddress(),
    dprVoting: await dprVoting.getAddress(),
  };

  console.log("Deployed:", addresses);

  // export for frontend (local only)
  if (network.name === "localhost" || network.name === "hardhat") {
    const outPath = path.join(
      __dirname,
      "../frontend/src/contracts/addresses.json"
    );

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
