import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test", function () {
  it("should allow first-time caller to lockInGuess in original, but mutant should revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const hashToGuess = ethers.keccak256(ethers.toUtf8Bytes("test"));

    // First-time caller addr1 attempts to lockInGuess
    // Original: should succeed because guesses[addr1].block == 0
    // Mutant: should revert because require(guesses[addr1].block != 0) fails (it IS 0)
    await expect(
      instance.connect(addr1).lockInGuess(hashToGuess, { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});