import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should revert when calling fallback twice in the same block, but mutant may allow second call", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block - original should revert because timestamp hasn't increased
    // Mutant might not revert because prevrandao could be > stored pastBlockTime
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});