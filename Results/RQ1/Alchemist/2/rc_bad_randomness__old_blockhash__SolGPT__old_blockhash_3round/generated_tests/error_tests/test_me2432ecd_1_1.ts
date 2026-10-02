import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test", function () {
  it("should kill mutant me2432ecd by sending exactly 1 ether to lockInGuess", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const hashToLock = ethers.keccak256(ethers.toUtf8Bytes("test"));

    // This should succeed on original but fail on mutant (mutant requires msg.value != 1 ether)
    await expect(
      instance.connect(player).lockInGuess(hashToLock, { value: ethers.parseEther("1") })
    ).to.not.be.reverted;
  });
});