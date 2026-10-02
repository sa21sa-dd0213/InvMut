import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - timestamp equality", function () {
  it("should kill the mutant by exploiting timestamp equality", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: send 10 ether to set pastBlockTime
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the block timestamp from the first transaction
    const block1 = await ethers.provider.getBlock(tx1.blockNumber);
    const firstTimestamp = block1!.timestamp;

    // Mine a new block with the exact same timestamp as the first transaction
    // This forces the second call to have block.timestamp == pastBlockTime
    await ethers.provider.send("evm_setNextBlockTimestamp", [firstTimestamp]);

    // Mine an empty block to apply the timestamp
    await ethers.provider.send("evm_mine", []);

    // Second call: send 10 ether - should revert on original, succeed on mutant
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The original contract reverts when timestamps are equal
    // The mutant allows it, so we expect this to revert in the original
    await expect(tx2).to.be.reverted;
  });
});