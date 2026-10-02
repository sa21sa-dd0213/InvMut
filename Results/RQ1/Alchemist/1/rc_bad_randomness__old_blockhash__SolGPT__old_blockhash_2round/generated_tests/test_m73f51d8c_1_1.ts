import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant test", function () {
  it("should revert when lockInGuess is called with wrong ether amount", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const hashToGuess = ethers.keccak256(ethers.toUtf8Bytes("test"));
    
    // Call lockInGuess with 0.5 ether instead of required 1 ether
    await expect(
      instance.connect(owner).lockInGuess(hashToGuess, { value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});