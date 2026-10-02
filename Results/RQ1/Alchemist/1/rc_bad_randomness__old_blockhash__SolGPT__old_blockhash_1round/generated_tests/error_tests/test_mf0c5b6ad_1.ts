import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge - kill mutant mf0c5b6ad", function () {
  it("should revert when lockInGuess is called without sending exactly 1 ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attempt to lock in a guess with 0 ether - should revert in original but succeed in mutant
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await expect(
      instance.connect(addr1).lockInGuess(dummyHash, { value: 0 })
    ).to.be.reverted;
  });
});