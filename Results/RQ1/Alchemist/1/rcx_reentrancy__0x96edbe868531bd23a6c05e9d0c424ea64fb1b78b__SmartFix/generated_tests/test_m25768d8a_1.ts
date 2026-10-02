import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant test - m25768d8a", function () {
  it("should kill mutant by calling Put with non-zero _lockTime", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 to avoid interfering with Collect logic
    await instance.SetMinSum(0);
    // Initialize the contract
    await instance.Initialized();

    // Call Put with a non-zero _lockTime (e.g., 100 seconds)
    // In the original contract, this should succeed because (block.timestamp + 100) >= block.timestamp
    // In the mutant, it will revert because (block.timestamp + 100) == block.timestamp is false
    const tx = instance.Put(100, { value: ethers.parseEther("1") });
    
    // The mutant should revert, so we expect the transaction to fail
    await expect(tx).to.be.reverted;
  });
});