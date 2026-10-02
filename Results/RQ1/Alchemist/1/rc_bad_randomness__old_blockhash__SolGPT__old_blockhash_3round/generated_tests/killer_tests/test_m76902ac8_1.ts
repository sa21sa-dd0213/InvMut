import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test", function () {
  it("should revert deployment when sending less than 1 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Attempt to deploy with 0.5 ether - should revert on original, succeed on mutant
    await expect(
      Factory.deploy({ value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});