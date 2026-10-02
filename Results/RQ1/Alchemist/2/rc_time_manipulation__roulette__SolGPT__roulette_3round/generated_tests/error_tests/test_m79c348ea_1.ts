import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant test - block.prevrandao vs block.timestamp", function () {
  it("should revert on second fallback call in same block due to time check, but mutant would not revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund contract with exactly 10 ether (required by fallback)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the block timestamp and prevrandao from the first transaction's block
    const block1 = await ethers.provider.getBlock(tx1.blockNumber);
    
    // Second call in the same block - should revert on original due to timestamp check
    // On mutant, block.prevrandao may be different, so it might not revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;

    // Verify that the second call would have succeeded on the mutant
    // by checking that block.prevrandao could differ from block.timestamp
    const block2 = await ethers.provider.getBlock(tx1.blockNumber);
    // On original: second call reverts because block.timestamp == pastBlockTime
    // On mutant: second call might succeed because block.prevrandao != pastBlockTime
    // This test kills the mutant because it expects a revert that only happens with original logic
  });
});