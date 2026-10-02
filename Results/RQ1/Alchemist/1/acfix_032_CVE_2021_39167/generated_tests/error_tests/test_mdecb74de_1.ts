import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mdecb74de", function () {
  it("should detect out-of-bounds access when proposers array is non-empty", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address]; // Non-empty proposers array
    const executors = [owner.address];
    
    // The mutant uses i <= proposers.length in the loop, which will cause
    // an out-of-bounds access when i equals proposers.length.
    // The original contract uses i < proposers.length, which works correctly.
    await expect(
      Factory.deploy(minDelay, proposers, executors)
    ).to.be.reverted;
  });
});