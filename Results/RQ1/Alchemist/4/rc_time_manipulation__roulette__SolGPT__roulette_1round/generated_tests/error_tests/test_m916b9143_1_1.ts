import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should revert on second call in same block due to timestamp check, but mutant may not revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // First call - should succeed (sets pastBlockTime)
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block - original reverts because block.timestamp == pastBlockTime
    // Mutant may not revert because block.prevrandao could be > pastBlockTime
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The mutant would NOT revert here, so expecting revert kills it
    await expect(tx2).to.be.reverted;
  });
});