import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mac3a8c58", function () {
  it("should detect mutant where == is changed to != in the block number check", async function () {
    const [deployer, user] = await ethers.getSigners();
    
    // Deploy the contract with 10 ether sent to fund it
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();
    
    // Get the current block number and mine blocks to reach a multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = (15 - (currentBlock % 15)) % 15;
    
    // Mine blocks to get to a block where block.number % 15 == 0
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Verify we're on a block that is a multiple of 15
    currentBlock = await ethers.provider.getBlockNumber();
    expect(currentBlock % 15).to.equal(0);
    
    // Record contract balance before the call
    const balanceBefore = await ethers.provider.getBalance(instance.target);
    
    // Get the pastBlockTime to satisfy the timestamp requirement
    const pastBlockTime = await instance.pastBlockTime();
    const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    
    // We need block.timestamp > pastBlockTime, so wait if needed
    if (currentTimestamp <= pastBlockTime) {
      await ethers.provider.send("evm_increaseTime", [pastBlockTime - currentTimestamp + 1n]);
      await ethers.provider.send("evm_mine", []);
    }
    
    // Call fallback with exactly 10 ether
    const tx = await user.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Check balance after the call
    const balanceAfter = await ethers.provider.getBalance(instance.target);
    
    // In the ORIGINAL contract: block.number % 15 == 0 → balance transfers to sender
    // In the MUTANT: block.number % 15 != 0 → balance does NOT transfer
    // On a block that is a multiple of 15:
    //   - Original: balance should decrease (transfer happened)
    //   - Mutant: balance should increase (transfer didn't happen, just added 10 ETH)
    // This test expects the balance to decrease, which will FAIL on the mutant
    expect(balanceAfter).to.be.lessThan(balanceBefore);
  });
});