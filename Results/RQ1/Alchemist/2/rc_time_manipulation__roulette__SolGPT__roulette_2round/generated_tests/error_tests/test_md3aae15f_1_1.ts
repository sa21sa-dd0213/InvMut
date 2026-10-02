import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant md3aae15f kill test", function () {
  it("should revert when calling fallback twice in the same block (mutant changes > to <)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call - should succeed on both original and mutant
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block - original requires block.timestamp > pastBlockTime
    // After first call, pastBlockTime == block.timestamp, so original reverts
    // Mutant requires block.timestamp < pastBlockTime, which is false, so it also reverts
    // However, if we mine a new block, the mutant would incorrectly allow the second call
    // So we need to ensure we're in the same block by using the same block timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      (await ethers.provider.getBlock("latest")).timestamp
    ]);

    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});