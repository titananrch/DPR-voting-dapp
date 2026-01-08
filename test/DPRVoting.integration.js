const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DPRVoting (Integration)", function () {
  let admin;
  let topicManager, partyRegistry, memberRegistry, partyVoting, dprVoting;

  beforeEach(async function () {
    [admin] = await ethers.getSigners();

    const VotingTopicManager = await ethers.getContractFactory("VotingTopicManager");
    topicManager = await VotingTopicManager.deploy();
    await topicManager.waitForDeployment();

    const PartyRegistry = await ethers.getContractFactory("PartyRegistry");
    partyRegistry = await PartyRegistry.deploy();
    await partyRegistry.waitForDeployment();

    const MemberRegistry = await ethers.getContractFactory("MemberRegistry");
    memberRegistry = await MemberRegistry.deploy(await partyRegistry.getAddress());
    await memberRegistry.waitForDeployment();

    const PartyAggregatedVoting = await ethers.getContractFactory("PartyAggregatedVoting");
    partyVoting = await PartyAggregatedVoting.deploy(
      await memberRegistry.getAddress(),
      await partyRegistry.getAddress(),
      await topicManager.getAddress()
    );
    await partyVoting.waitForDeployment();

    const DPRVoting = await ethers.getContractFactory("DPRVoting");
    dprVoting = await DPRVoting.deploy(
      await topicManager.getAddress(),
      await partyVoting.getAddress()
    );
    await dprVoting.waitForDeployment();
    
    // set VotingTopicManager admin to DPRVoting
    await topicManager.connect(admin).setAdmin(await dprVoting.getAddress());
    console.log(await topicManager.admin());
    console.log(await dprVoting.getAddress());
  });

  it("sets DPRVoting as admin of VotingTopicManager", async function () {
    const storedAdmin = await topicManager.admin();
    expect(storedAdmin).to.equal(await dprVoting.getAddress());
  });

  it("allows DPRVoting to create a topic", async function () {
    await dprVoting.createTopic("RUU Pasal 1");

    const topic = await topicManager.getTopic(1);
    expect(topic.title).to.equal("RUU Pasal 1");
    expect(topic.status).to.equal(0);
  });
});
