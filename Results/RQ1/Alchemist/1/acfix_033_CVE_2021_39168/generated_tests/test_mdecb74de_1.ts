import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mdecb74de", function () {
  it("should fail to deploy with non-empty proposers array due to out-of-bounds access", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address]; // Non-empty proposers array
    const executors = [owner.address];
    
    // The mutant changes i < proposers.length to i <= proposers.length
    // This causes an out-of-bounds access when i equals proposers.length
    // The original contract deploys successfully, but the mutant should revert
    await expect(
      Factory.deploy(minDelay, proposers, executors)
    ).to.be.reverted;
  });
});