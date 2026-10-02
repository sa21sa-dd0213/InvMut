import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should revert when sending more than 1 ether to lockInGuess", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // Attempt to lock in a guess with 2 ether instead of exactly 1 ether
    const dummyHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    await expect(
      instance.connect(owner).lockInGuess(dummyHash, { value: ethers.parseEther("2") })
    ).to.be.reverted;
  });
});