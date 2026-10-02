import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m58ea0036", function () {
  it("should revert deployment when sending exactly 1 ether (mutant requires 2 ether)", async function () {
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // The mutant changes require(msg.value == 1 ether) to require(msg.value - 1 == 1 ether)
    // This means msg.value must equal 2 ether for deployment to succeed
    // Sending 1 ether should cause a revert in the mutant, but succeed in the original
    await expect(
      Factory.deploy({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});