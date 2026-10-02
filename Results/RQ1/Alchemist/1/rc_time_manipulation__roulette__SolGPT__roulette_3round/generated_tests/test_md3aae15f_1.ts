import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - timestamp comparison reversal", function () {
  it("should kill the mutant by exploiting reversed timestamp comparison", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: send 10 ether to set pastBlockTime to block.timestamp + 1
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the stored pastBlockTime value
    const pastBlockTime = await instance.pastBlockTime();
    
    // Mine a new block with a timestamp earlier than pastBlockTime
    // This makes block.timestamp < pastBlockTime, which the mutant requires
    const currentBlock = await ethers.provider.getBlock("latest");
    const earlierTimestamp = Number(pastBlockTime) - 100;
    
    await ethers.provider.send("evm_setNextBlockTimestamp", [earlierTimestamp]);
    await ethers.provider.send("evm_mine", []);

    // Second call: should revert on original but pass on mutant
    // On mutant, require(block.timestamp < pastBlockTime) is true since earlierTimestamp < pastBlockTime
    // On original, require(block.timestamp > pastBlockTime) is false since earlierTimestamp < pastBlockTime
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The mutant will allow this transaction, while the original would revert
    // So we expect this to NOT revert (mutant behavior)
    await expect(tx2).to.not.be.reverted;
  });
});