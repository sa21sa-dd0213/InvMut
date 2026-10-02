import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m81fa91c3 test", function () {
  it("should revert when settle is called without locking in a guess first", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Attacker never calls lockInGuess, directly calls settle
    await expect(
      instance.connect(attacker).settle()
    ).to.be.reverted;
  });
});