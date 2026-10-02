import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should fail to deploy with 1 ether when mutant requires 2 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // The original contract requires msg.value == 1 ether for deployment.
    // The mutant changes the condition to msg.value - 1 == 1 ether, which means it requires 2 ether.
    // Therefore, deploying with exactly 1 ether should revert in the mutant but succeed in the original.
    await expect(
      Factory.deploy({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});