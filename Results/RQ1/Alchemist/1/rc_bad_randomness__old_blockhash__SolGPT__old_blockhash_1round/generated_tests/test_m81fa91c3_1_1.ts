import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m81fa91c3", function () {
  it("should revert when settle is called without a prior lockInGuess (kills mutant that removed require check)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attempt to settle without ever calling lockInGuess
    // The original contract reverts at the removed require(guesses[msg.sender].block != 0)
    // The mutant allows execution to continue, potentially causing unexpected behavior
    await expect(
      instance.connect(owner).settle()
    ).to.be.reverted;
  });
});