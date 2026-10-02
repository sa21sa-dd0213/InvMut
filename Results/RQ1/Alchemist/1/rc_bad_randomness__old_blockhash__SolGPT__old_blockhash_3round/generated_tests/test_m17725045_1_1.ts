import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m17725045", function () {
  it("should reject lockInGuess with msg.value > 1 ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attempt to lock in a guess with 2 ether (more than required 1 ether)
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("testGuess"));
    await expect(
      instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("2") })
    ).to.be.reverted;
  });
});