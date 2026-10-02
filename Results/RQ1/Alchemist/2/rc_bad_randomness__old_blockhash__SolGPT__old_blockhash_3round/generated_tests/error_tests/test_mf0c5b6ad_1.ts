import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant mf0c5b6ad", function () {
  it("should revert when lockInGuess is called without sending exactly 1 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));

    // Attempt to call lockInGuess with 0 ether - should revert in original, but mutant allows it
    await expect(
      instance.connect(owner).lockInGuess(dummyHash, { value: 0 })
    ).to.be.reverted;
  });
});