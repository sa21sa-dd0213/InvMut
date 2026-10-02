import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge - kill mutant m8d76b967", function () {
  it("should revert when lockInGuess is called with exactly 1 ether (mutant expects 2 ether)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // The original contract accepts 1 ether, but the mutant requires msg.value - 1 == 1 ether
    // i.e., msg.value must be 2 ether. Calling with 1 ether should revert in the mutant.
    await expect(
      instance.connect(addr1).lockInGuess(ethers.randomBytes(32), { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});