import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mba599e32 test", function () {
  it("should revert when lockInGuess is called with msg.value less than 1 ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const hashToGuess = ethers.keccak256(ethers.toUtf8Bytes("test"));
    
    // Attempt to lock in a guess with only 0.5 ether - should revert in original
    await expect(
      instance.connect(addr1).lockInGuess(hashToGuess, { value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});