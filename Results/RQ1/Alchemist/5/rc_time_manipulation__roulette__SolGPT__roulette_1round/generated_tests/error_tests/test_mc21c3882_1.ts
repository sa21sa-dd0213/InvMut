import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - block.timestamp >= pastBlockTime", function () {
  it("should revert when two calls happen in the same block (same timestamp) in original but not in mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with enough ether to satisfy the 10 ETH requirement
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });
    await fundTx.wait();

    // First call: send 10 ETH - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call: send 10 ETH in the same block (by not mining a new block between)
    // This should revert in original (block.timestamp == pastBlockTime fails the > check)
    // But would succeed in mutant (>= allows it)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});