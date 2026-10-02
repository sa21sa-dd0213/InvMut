import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette - Kill mutant mc21c3882 (>= instead of >)", function () {
  it("should revert when second transaction is sent at same timestamp (kills mutant that allows equality)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance to avoid transfer issues
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First transaction: set pastBlockTime to current block timestamp
    const tx1 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second transaction in the same block (same timestamp) - should revert in original
    // but pass in mutant due to >= allowing equality
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});