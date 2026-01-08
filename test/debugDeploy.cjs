const { ethers } = require("hardhat");

describe("Debug DPRVoting deploy", function () {
  it("deploys only DPRVoting", async function () {
    const DPRVoting = await ethers.getContractFactory("DPRVoting");

    await DPRVoting.deploy(
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );
  });
  it("prints constructor ABI", async () => {
  const DPRVoting = await ethers.getContractFactory("DPRVoting");
  console.log(
    DPRVoting.interface.deploy.inputs.map(i => i.type)
  );
});
});
