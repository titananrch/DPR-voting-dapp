import { ethers } from "hardhat";

async function main() {
  const [admin, golkar1, golkar2, pdip1] = await ethers.getSigners();
  console.log("Seeding with admin:", admin.address);

  
  const topicManager = await ethers.getContractAt(
    "VotingTopicManager",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    admin
  );
  const partyRegistry = await ethers.getContractAt(
    "PartyRegistry",
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    admin
  );
  const memberRegistry = await ethers.getContractAt(
    "MemberRegistry",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    admin
  );

  // 1. Parties
  let tx = await partyRegistry.addParty("Golkar");
  await tx.wait();
  const golkarId = await partyRegistry.partyCount();

  tx = await partyRegistry.addParty("PDIP");
  await tx.wait();
  const pdipId = await partyRegistry.partyCount();

  // 2. Members (use the 1-based IDs we just read)
  tx = await memberRegistry.registerMember(golkar1.address, golkarId);
  await tx.wait();
  tx = await memberRegistry.registerMember(golkar2.address, golkarId);
  await tx.wait();
  tx = await memberRegistry.registerMember(pdip1.address, pdipId);
  await tx.wait();

  // 3. Topic
  // 1. Create topic (Early)
  tx = await topicManager.createTopic("RUU Pasal 1");
  await tx.wait();
  const topicId = await topicManager.topicCount();

  // 2. Configure options
  tx = await topicManager.addVoteOption(topicId, "Approve");
  await tx.wait();
  tx = await topicManager.addVoteOption(topicId, "Revise");
  await tx.wait();
  tx = await topicManager.addVoteOption(topicId, "Absent");
  await tx.wait();
  console.log("Seeding complete");
}

main().catch(console.error);
