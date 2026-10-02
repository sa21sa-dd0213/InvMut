import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection test", function () {
  it("should kill mutant md3aae15f by exploiting the < vs > operator change", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: set pastBlockTime to current block timestamp
    const tx1 = await instance.connect(addr1).fallback({ value: ethers.parseEther("10") });
    await tx1.wait();

    // Get the block where the first transaction was mined
    const block1 = await ethers.provider.getBlock(tx1.blockNumber);
    const pastBlockTime = block1!.timestamp;

    // Mine a new block with timestamp LESS than pastBlockTime
    await ethers.provider.send("hardhat_setNextBlockTimestamp", [pastBlockTime - 1]);

    // This call should revert on the original (timestamp < pastBlockTime is false)
    // but should succeed on the mutant (timestamp < pastBlockTime is true)
    await expect(
      instance.connect(addr1).fallback({ value: ethers.parseEther("10") })
    ).to.not.be.reverted;

    // If we reach here, the mutant is killed because the condition passed
    // where it should have reverted in the original
  });
});