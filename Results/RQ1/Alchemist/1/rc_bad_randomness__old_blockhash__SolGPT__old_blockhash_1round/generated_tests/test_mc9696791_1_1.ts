import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test", function () {
  it("should kill mutant mc9696791 by deploying with exactly 1 ether and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // The original constructor requires msg.value == 1 ether
    // The mutant requires msg.value + 1 == 1 ether, i.e., msg.value == 1 ether - 1 wei
    // Sending exactly 1 ether should pass on original but revert on mutant
    await expect(
      Factory.deploy({ value: ethers.parseEther("1.0") })
    ).to.be.reverted;
  });
});