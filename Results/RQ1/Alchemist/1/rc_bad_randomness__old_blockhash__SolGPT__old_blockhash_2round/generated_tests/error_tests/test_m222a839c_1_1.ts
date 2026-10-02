import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should revert when calling lockInGuess with 1 ether (mutant requires 2 ether)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // The original contract accepts 1 ether for lockInGuess
    // The mutant changes require(msg.value == 1 ether) to require(msg.value - 1 == 1 ether)
    // which effectively requires msg.value == 2 ether
    // So sending exactly 1 ether should revert in the mutant
    await expect(
      instance.connect(addr1).lockInGuess(ethers.ZeroHash, { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});