import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m916b9143", function () {
  it("should kill mutant by calling fallback twice where second call has later timestamp but same block.prevrandao", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: 0 });
    await instance.waitForDeployment();

    // First call - should succeed on both original and mutant
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block to advance block.timestamp but keep block.prevrandao
    await ethers.provider.send("evm_mine");

    // Second call - succeeds on original (block.timestamp > pastBlockTime)
    // but reverts on mutant (block.prevrandao likely not > pastBlockTime)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});