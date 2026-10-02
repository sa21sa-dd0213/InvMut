import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m305e1afe test", function () {
  it("should detect mutant by allowing lockInGuess with less than 1 ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // In the original contract, lockInGuess requires msg.value == 1 ether
    // The mutant changes this to msg.value <= 1 ether
    // This test sends 0.5 ether which should revert on original but pass on mutant
    const guessHash = ethers.keccak256(ethers.toUtf8Bytes("testGuess"));
    
    // Attempt to lock in a guess with only 0.5 ether
    // Original contract would revert here, mutant would not
    await expect(
      instance.connect(addr1).lockInGuess(guessHash, { value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});