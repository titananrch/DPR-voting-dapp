const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProposalDraftManager historical sponsor party", function () {
  async function deployFixture() {
    const [owner, proposer, supporterA, supporterB, supporterC] =
      await ethers.getSigners();

    const SeatNFT = await ethers.getContractFactory("SeatNFT");
    const seatNft = await SeatNFT.deploy(
      100,
      owner.address,
      owner.address,
      owner.address,
    );

    const GovernanceConfig = await ethers.getContractFactory("GovernanceConfig");
    const governanceConfig = await GovernanceConfig.deploy(
      await seatNft.getAddress(),
      owner.address,
      owner.address,
    );

    const ProposalDraftManager = await ethers.getContractFactory(
      "ProposalDraftManager",
    );
    const proposalManager = await ProposalDraftManager.deploy(
      await seatNft.getAddress(),
      await governanceConfig.getAddress(),
    );

    await seatNft.mint(proposer.address, 1);
    await seatNft.mint(supporterA.address, 1);
    await seatNft.mint(supporterB.address, 2);
    await seatNft.mint(supporterC.address, 2);

    return { proposer, supporterA, supporterB, supporterC, seatNft, proposalManager };
  }

  async function createProposal(proposer, proposalManager) {
    await proposalManager.connect(proposer).createDraftProposal(
      "Historical sponsor test",
      "Verify sponsor party history",
      0,
      6000,
    );
    return 1n;
  }

  it("preserves a seat's party after reassignment", async function () {
    const { proposer, supporterA, seatNft, proposalManager } =
      await deployFixture();
    const proposalId = await createProposal(proposer, proposalManager);

    await proposalManager.connect(supporterA).supportProposal(proposalId, 2);
    expect(await proposalManager.proposalSponsorParty(proposalId, 2)).to.equal(1n);

    await seatNft.setGovernance(proposer.address);
    await seatNft.connect(proposer).reassignSeat(2, supporterA.address, 2);

    expect(await seatNft.seatParty(2)).to.equal(2n);
    expect(await proposalManager.proposalSponsorParty(proposalId, 2)).to.equal(1n);
  });

  it("keeps seat and unique-party sponsorship counts unchanged", async function () {
    const { proposer, supporterA, supporterB, supporterC, proposalManager } =
      await deployFixture();
    const proposalId = await createProposal(proposer, proposalManager);

    await proposalManager.connect(supporterA).supportProposal(proposalId, 2);
    await proposalManager.connect(supporterB).supportProposal(proposalId, 3);
    await proposalManager.connect(supporterC).supportProposal(proposalId, 4);

    const [sponsorCount, partyCount, thresholdMet] =
      await proposalManager.getSponsorshipStatus(proposalId);
    expect(sponsorCount).to.equal(3n);
    expect(partyCount).to.equal(2n);
    expect(thresholdMet).to.equal(true);
    expect(await proposalManager.getProposalSponsors(proposalId)).to.deep.equal([
      2n,
      3n,
      4n,
    ]);
    await expect(
      proposalManager.connect(supporterA).supportProposal(proposalId, 2),
    ).to.be.revertedWith("Proposal is not in Draft status");
  });
});