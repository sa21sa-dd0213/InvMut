import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - Mutant m6e676121", function () {
  it("should revert when setGoverned is called by an address without a successful proposal", async function () {
    const [owner, unauthorizedUser] = await ethers.getSigners();

    // Deploy the contract with a valid DAO address (using a simple account as placeholder)
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Prepare test data
    const governables = [owner.address];
    const isGoverned = [true];

    // The unauthorizedUser has no successful proposal, so calling setGoverned should revert
    await expect(
      instance.connect(unauthorizedUser).setGoverned(governables, isGoverned)
    ).to.be.reverted;
  });
});