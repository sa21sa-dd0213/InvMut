import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m7b8abcbe test", function () {
  it("should revert when trying to lock in a second guess while first is still pending", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    // First lockInGuess should succeed
    const firstHash = ethers.keccak256(ethers.toUtf8Bytes("firstGuess"));
    await instance.connect(owner).lockInGuess(firstHash, { value: ethers.parseEther("1") });

    // Second lockInGuess while first is still pending should revert
    const secondHash = ethers.keccak256(ethers.toUtf8Bytes("secondGuess"));
    await expect(
      instance.connect(owner).lockInGuess(secondHash, { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});