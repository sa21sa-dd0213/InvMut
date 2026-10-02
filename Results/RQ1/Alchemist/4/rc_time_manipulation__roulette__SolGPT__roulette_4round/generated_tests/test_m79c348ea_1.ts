import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea - kill with sequential calls", function () {
  it("should revert second call within same block when using block.timestamp, but mutant uses block.prevrandao and allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call - in original, block.timestamp > pastBlockTime is false because
    // pastBlockTime was set to block.timestamp, and block.timestamp hasn't increased
    // In mutant, pastBlockTime = block.prevrandao (random), so condition may pass
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});