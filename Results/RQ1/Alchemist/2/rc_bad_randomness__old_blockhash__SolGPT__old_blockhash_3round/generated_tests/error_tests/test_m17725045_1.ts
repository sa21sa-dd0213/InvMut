import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m17725045 test", function () {
  it("should kill mutant by sending more than 1 ether to lockInGuess", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Send 2 ether (more than the required 1 ether) - should fail on original but succeed on mutant
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("testGuess"));
    const tx = instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("2") });
    
    // On original contract this would revert because msg.value must be exactly 1 ether
    // On mutant this succeeds because msg.value >= 1 ether is allowed
    await expect(tx).to.be.reverted;
  });
});