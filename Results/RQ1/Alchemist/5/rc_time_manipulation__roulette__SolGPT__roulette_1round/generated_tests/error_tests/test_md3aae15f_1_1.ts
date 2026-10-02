import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - timestamp comparison", function () {
  it("should detect mutant where > is replaced with < in require(block.timestamp > pastBlockTime)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: set pastBlockTime to current block.timestamp
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the block where tx1 was mined to verify timestamps
    const block1 = await ethers.provider.getBlock(tx1.blockNumber);

    // Wait for next block
    await ethers.provider.send("evm_mine", []);

    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    const block2 = await ethers.provider.getBlock(tx2.blockNumber);

    // Now send a fourth transaction in a block with timestamp EARLIER than pastBlockTime
    // This can be done by mining a block with a specific timestamp in the past
    const pastTime = block2.timestamp - 1000;
    await ethers.provider.send("evm_setNextBlockTimestamp", [pastTime]);

    // This should succeed in the mutant (since block.timestamp < pastBlockTime)
    // But fail in the original (since block.timestamp > pastBlockTime is false)
    const tx3 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx3).to.be.reverted; // Original would revert, mutant would pass
    // If the test expects revert and it passes (mutant doesn't revert), test fails = mutant killed
  });
});