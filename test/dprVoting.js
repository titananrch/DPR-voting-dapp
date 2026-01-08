const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VotingTopicManager (Unit)", function () {
  it("reverts when non-admin tries to create a topic", async function () {
    const [user] = await ethers.getSigners();

    const VotingTopicManager = await ethers.getContractFactory("VotingTopicManager");
    const topicManager = await VotingTopicManager.deploy();
    await topicManager.waitForDeployment();

    await expect(
      topicManager.connect(user).createTopic("RUU Pasal 1")
    ).to.be.revertedWithCustomError(topicManager, "NotAdmin");
  });
});
