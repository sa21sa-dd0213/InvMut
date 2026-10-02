import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea detection test", function () {
  it("should detect mutant by exploiting block.prevrandao vs block.timestamp difference", async function () {
    const [owner, caller] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: set pastBlockTime to current timestamp (original) or prevrandao (mutant)
    // We need to make the second call in a block where block.timestamp > pastBlockTime
    // but block.prevrandao <= stored prevrandao (if mutant)
    
    // First call - send 10 ether
    const tx1 = await caller.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block with a specific timestamp and prevrandao
    // We want timestamp to increase but prevrandao to stay the same or decrease
    const block1 = await ethers.provider.getBlock("latest");
    const prevrandaoValue = block1!.prevrandao;
    
    // Mine a block with higher timestamp but same prevrandao
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(block1!.timestamp) + 100]);
    // Keep prevrandao unchanged by not mining a new block that would change it
    
    // Second call - should succeed with original (timestamp check passes)
    // but fail with mutant (prevrandao check fails because same value)
    const tx2 = caller.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // If mutant, the require(block.timestamp > pastBlockTime) passes
    // but pastBlockTime = block.prevrandao, so stored value equals current prevrandao
    // Next call compares block.timestamp > prevrandao_value which is true
    // But mutant stores prevrandao again, so comparison is block.prevrandao > block.prevrandao -> false
    // Actually the check is block.timestamp > pastBlockTime, not prevrandao comparison
    // Wait - the mutant only changes the ASSIGNMENT, not the comparison
    // So the comparison is still block.timestamp > pastBlockTime
    // But pastBlockTime now stores prevrandao (a huge number typically)
    // So block.timestamp > prevrandao will likely be false
    
    await expect(tx2).to.be.reverted;
  });
});