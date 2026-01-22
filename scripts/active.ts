import { ethers } from "hardhat";

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Admin:", admin.address);

  const topicManager = await ethers.getContractAt(
    "VotingTopicManager",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    admin
  );

  const topicId = await topicManager.topicCount();
  await topicManager.openTopic(topicId);
  console.log("Topic Active");
}

main().catch(console.error);
