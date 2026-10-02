import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant kill test", function () {
  it("should revert when sending exactly 1 ether to lockInGuess (mutant expects 1 ether + 1 wei)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // The mutant requires msg.value - 1 == 1 ether, i.e., msg.value must be 1 ether + 1 wei.
    // Sending exactly 1 ether should fail on the mutant, but succeed on the original.
    // We expect revert on the mutant.
    const tx = instance.lockInGuess(ethers.ZeroHash, { value: ethers.parseEther("1") });
    await expect(tx).to.be.reverted;
  });
});