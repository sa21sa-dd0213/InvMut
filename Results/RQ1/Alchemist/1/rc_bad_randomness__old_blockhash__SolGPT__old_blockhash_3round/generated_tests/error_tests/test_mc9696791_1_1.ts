import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mc9696791", function () {
  it("should fail to deploy with 1 ether because mutant requires 0 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // The mutant changes require(msg.value == 1 ether) to require(msg.value + 1 == 1 ether)
    // This means the mutant accepts 0 ether but rejects 1 ether
    // Sending exactly 1 ether should cause the mutant constructor to revert
    await expect(
      Factory.deploy({ value: ethers.parseEther("1.0") })
    ).to.be.reverted;
  });
});