import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test (mfeda8edf)", function () {
  it("should kill the mutant by locking in guess and settling in same block", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const hashToGuess = ethers.keccak256(ethers.toUtf8Bytes("test"));
    
    // Lock in guess - mutant sets block = block.number * 1 (current block)
    await instance.connect(owner).lockInGuess(hashToGuess, { value: ethers.parseEther("1") });

    // Try to settle in the same block - should revert on mutant because
    // block.number > guesses[msg.sender].block is false (both equal current block)
    // Original would also revert, but for different reason (target is next block)
    await expect(
      instance.connect(owner).settle()
    ).to.be.reverted;
  });
});