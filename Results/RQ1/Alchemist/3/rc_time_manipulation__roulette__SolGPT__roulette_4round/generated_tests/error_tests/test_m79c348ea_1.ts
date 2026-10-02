import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should revert when calling fallback twice in the same block because block.prevrandao does not increase like block.timestamp", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call: send 10 ether to trigger fallback
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block (no mining delay) should revert
    // because block.prevrandao may not change within the same block,
    // but the original contract requires block.timestamp > pastBlockTime
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});