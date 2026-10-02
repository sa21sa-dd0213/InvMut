import { expect } from "chai";
import { ethers } } from "hardhat";

describe("TimelockController mutant detection - constructor off-by-one", function () {
  it("should revert when deploying with a non-empty executors array due to off-by-one loop bug", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    
    const minDelay = 3600; // 1 hour
    const proposers: string[] = [];
    const executors: string[] = [owner.address]; // Single executor triggers the bug
    
    // The mutant has i <= executors.length, so with one executor it tries index 1 which is out of bounds
    await expect(
      Factory.deploy(minDelay, proposers, executors)
    ).to.be.reverted;
  });
});