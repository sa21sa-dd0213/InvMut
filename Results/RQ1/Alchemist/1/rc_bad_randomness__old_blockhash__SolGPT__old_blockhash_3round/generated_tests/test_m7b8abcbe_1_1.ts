import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m7b8abcbe test", function () {
  it("should revert when lockInGuess is called twice from same address (reinitialization guard)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();

    const hash = ethers.keccak256(ethers.toUtf8Bytes("test"));

    // First call should succeed
    const tx1 = await instance.connect(addr1).lockInGuess(hash, { value: ethers.parseEther("1") });
    await tx1.wait();

    // Second call from same address should revert on original, but succeed on mutant
    await expect(
      instance.connect(addr1).lockInGuess(hash, { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});