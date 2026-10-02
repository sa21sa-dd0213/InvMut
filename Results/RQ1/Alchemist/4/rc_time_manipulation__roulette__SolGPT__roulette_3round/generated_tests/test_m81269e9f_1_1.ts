import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m81269e9f", function () {
  it("should detect the mutant by exploiting the weaker timestamp check (block.timestamp * 1 instead of + 1)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the contract with initial funding of 10 ether
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Get current block timestamp and mine a block to set it
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // First call: this will set pastBlockTime
    // In original: pastBlockTime = timestamp + 1
    // In mutant: pastBlockTime = timestamp * 1 = timestamp
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Now mine a new block with the SAME timestamp as the previous block
    // This is possible by mining multiple blocks in the same second
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
    await ethers.provider.send("evm_mine", []);

    // Second call with same timestamp
    // In original: requires block.timestamp > pastBlockTime
    //   pastBlockTime = timestamp + 1, block.timestamp = timestamp => REVERTS
    // In mutant: requires block.timestamp > pastBlockTime
    //   pastBlockTime = timestamp, block.timestamp = timestamp => REVERTS (both fail)
    // BUT: if we send two calls in the SAME block, the second call's timestamp
    // is equal to the first, which makes the mutant vulnerable differently.
    // Let's try a different approach: send two calls with increasing timestamps
    // but without the +1 gap.

    // Reset: mine a block with timestamp = currentTimestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
    await ethers.provider.send("evm_mine", []);

    // First call
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Mine a block with timestamp = currentTimestamp + 1
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp + 1]);
    await ethers.provider.send("evm_mine", []);

    // Second call with timestamp = currentTimestamp + 1
    // In original: pastBlockTime = currentTimestamp + 1 (from first call)
    //   requires block.timestamp (currentTimestamp + 1) > pastBlockTime (currentTimestamp + 1)
    //   => FALSE => REVERTS
    // In mutant: pastBlockTime = currentTimestamp (from first call)
    //   requires block.timestamp (currentTimestamp + 1) > pastBlockTime (currentTimestamp)
    //   => TRUE => SUCCEEDS (mutant allows this)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted; // Original reverts, mutant would succeed

    // If the transaction doesn't revert, the mutant is detected
  });
});