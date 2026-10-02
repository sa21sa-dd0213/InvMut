import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m9a3c54c7", function () {
  it("should kill the mutant by calling Put with non-zero _lockTime and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required before Put can be called)
    await instance.Initialized();

    // Set MinSum to a small value so it doesn't interfere
    await instance.SetMinSum(0);

    // Call Put with a non-zero _lockTime value
    // In the original contract, this should succeed because the timestamp check is always true
    // In the mutant, this should revert because (block.timestamp - _lockTime) >= block.timestamp is false for any positive _lockTime
    const lockTime = 1000;
    const value = ethers.parseEther("1");
    
    await expect(
      instance.connect(owner).Put(lockTime, { value: value })
    ).to.not.be.reverted;
  });
});