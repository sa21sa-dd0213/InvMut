import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m58ea0036", function () {
  it("should kill the mutant by deploying with exactly 1 ether and expecting success, while mutant requires 2 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Original constructor requires msg.value == 1 ether
    // Mutant changes to require(msg.value - 1 == 1 ether) i.e. msg.value == 2 ether
    // So deploying with 1 ether should succeed on original but revert on mutant
    await expect(
      Factory.deploy({ value: ethers.parseEther("1") })
    ).to.not.be.reverted;
  });
});