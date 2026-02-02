import { ethers } from "hardhat";

async function main() {
  const signers = await ethers.getSigners();
  const admin = signers[0];
  console.log("Admin Address: ", admin.address);

  // Get contract instances
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

  // Define parties and their member distribution (accounts 1-18)
  const partySetup = {
    Golkar: [1, 2, 3, 4, 5],
    PDIP: [6, 7, 8, 9],
    Demokrat: [10, 11, 12, 13],
    Gerindra: [14, 15, 16, 17],
    Nasdem: [18, 19],
  };

  const partyIds: Record<string, bigint> = {};

  // Create parties
  console.log("Creating Parties...");
  for (const partyName of Object.keys(partySetup)) {
    const tx = await partyRegistry.addParty(partyName);
    await tx.wait();
    partyIds[partyName] = await partyRegistry.partyCount();
    console.log(`  - ${partyName} (ID: ${partyIds[partyName]})`);
  }

  // Register members
  console.log("Registering Members...");
  for (const [partyName, memberIndices] of Object.entries(partySetup)) {
    for (const idx of memberIndices) {
      const memberAddress = signers[idx].address;
      const tx = await memberRegistry.registerMember(
        memberAddress,
        partyIds[partyName]
      );
      await tx.wait();
      console.log(`  - ${partyName}: ${memberAddress}`);
    }
  }

  // Define voting topics with options
  const topics = [
    {
      title: "RUU Pasal 1",
      options: ["Approve", "Revise", "Absent"],
    },
    {
      title: "Budget Allocation 2026",
      options: ["Increase", "Maintain", "Reduce", "Review"],
    },
    {
      title: "Infrastructure Development",
      options: ["Fast Track", "Standard", "Study First"],
    },
    {
      title: "Education Reform",
      options: ["Support", "Oppose", "Modify"],
    },
    {
      title: "Healthcare Policy",
      options: ["Expand Coverage", "Optimize Current", "Reduce Scope"],
    },
    {
      title: "Environmental Protection",
      options: ["Strict Regulations", "Moderate", "Lenient"],
    },
    {
      title: "Trade Agreement",
      options: ["Sign Now", "Renegotiate", "Reject"],
    },
    {
      title: "Digital Transformation",
      options: ["Full Implementation", "Gradual", "Selective Industries"],
    },
  ];

  // Create topics and options
  console.log("Creating Topics and Options...");
  for (const topic of topics) {
    const tx = await topicManager.createTopic(topic.title);
    await tx.wait();
    const topicId = await topicManager.topicCount();
    console.log(`  - ${topic.title} (ID: ${topicId})`);

    for (const option of topic.options) {
      const optionTx = await topicManager.addVoteOption(topicId, option);
      await optionTx.wait();
      console.log(`      - ${option}`);
    }
  }

  console.log("Seeding complete!");
}

main().catch(console.error);
