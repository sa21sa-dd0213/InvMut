import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mc70f3ddf", function () {
  it("should kill mutant by sending exactly 1 ether to lockInGuess", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // The original contract allows lockInGuess with exactly 1 ether
    // The mutant requires msg.value + 1 == 1 ether, which means msg.value must be 0
    // Sending exactly 1 ether should succeed on original but revert on mutant
    const tx = instance.connect(addr1).lockInGuess(
      ethers.keccak256(ethers.toUtf8Bytes("test")),
      { value: ethers.parseEther("1") }
    );
    
    // This will fail (revert) on the mutant, killing it
    await expect(tx).to.not.be.reverted;
  });
});