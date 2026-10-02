import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - mc21c3882", function () {
  it("should revert when two calls happen in the same block (same timestamp) on original, but mutant would allow second call", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: send 10 ether, timestamp > pastBlockTime (initial pastBlockTime = 0)
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block to ensure timestamp can be reused
    await ethers.provider.send("evm_mine", []);

    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    const currentTimestamp = block!.timestamp;

    // Second call: we want to force the same timestamp
    // Use evm_setNextBlockTimestamp to set the next block's timestamp to currentTimestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);

    // Now send another 10 ether - this will execute in a block with timestamp == currentTimestamp
    // On original: require(block.timestamp > pastBlockTime) -> false -> revert
    // On mutant:   require(block.timestamp >= pastBlockTime) -> true -> no revert
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The original should revert; the mutant should not revert
    await expect(tx2).to.be.reverted;
  });
});