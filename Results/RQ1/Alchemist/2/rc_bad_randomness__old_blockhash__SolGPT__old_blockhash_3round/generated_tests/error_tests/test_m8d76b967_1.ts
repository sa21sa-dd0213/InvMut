import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m8d76b967", function () {
  it("should revert when lockInGuess is called with exactly 1 ether (mutant requires 2 ether)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    
    // Deploy with 1 ether as required by constructor
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attempt to call lockInGuess with exactly 1 ether - should succeed on original but revert on mutant
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await expect(
      instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});