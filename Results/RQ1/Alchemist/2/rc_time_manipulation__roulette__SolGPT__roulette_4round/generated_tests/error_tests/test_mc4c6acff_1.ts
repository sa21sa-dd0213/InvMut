import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc4c6acff - block.number-1", function () {
  it("should fail to pay out when block.number % 15 == 0 (original condition) because mutant uses block.number-1", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract (payable constructor, send initial balance if needed)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();
    
    // Get current block number and calculate the next block where block.number % 15 == 0
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentBlockNumber = currentBlock.number;
    const blocksUntilTarget = (15 - (currentBlockNumber % 15)) % 15;
    const targetBlockNumber = currentBlockNumber + blocksUntilTarget + 1; // +1 to ensure we're at the next block after deploying
    
    // Mine blocks to reach the target block number
    for (let i = 0; i < blocksUntilTarget; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Verify we're at the right block
    const blockBefore = await ethers.provider.getBlock("latest");
    expect(blockBefore.number % 15).to.equal(0, "Should be at block where block.number % 15 == 0");
    
    // Send exactly 10 ether to trigger the fallback
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);
    
    const tx = await player.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);
    
    // In the ORIGINAL contract: the condition block.number % 15 == 0 would be true,
    // so the contract would transfer its entire balance to the player.
    // In the MUTANT: block.number-1 % 15 is evaluated as block.number - 1 (due to operator precedence),
    // which is block.number - 1. Since block.number % 15 == 0, block.number - 1 % 15 != 0,
    // so the payout does NOT happen. The player should lose their 10 ether.
    
    // Assert that the mutant behaves differently:
    // Player should have lost 10 ether (minus gas) in the mutant (no payout)
    // Original would have returned the contract balance (including the 10 ether) to the player
    expect(playerBalanceAfter).to.be.lessThan(playerBalanceBefore - ethers.parseEther("10") + ethers.parseEther("1")); // Gas allowance
    expect(contractBalanceAfter).to.equal(contractBalanceBefore + ethers.parseEther("10")); // Contract kept the ether
  });
});