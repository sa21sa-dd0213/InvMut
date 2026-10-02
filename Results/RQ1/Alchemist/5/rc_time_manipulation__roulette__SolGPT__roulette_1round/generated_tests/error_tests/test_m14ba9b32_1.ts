import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m14ba9b32 detection", function () {
  it("should detect mutant where block.number+1 replaces block.number in modulo condition", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // We need to find a block where block.number % 15 == 0
    // First, get current block number
    const currentBlock = await ethers.provider.getBlockNumber();
    
    // Find the next block that is a multiple of 15
    const blocksUntilMultiple = (15 - (currentBlock % 15)) % 15;
    const targetBlockNumber = currentBlock + blocksUntilMultiple;
    
    // Mine blocks to reach the target block number
    if (blocksUntilMultiple > 0) {
      for (let i = 0; i < blocksUntilMultiple; i++) {
        await ethers.provider.send("evm_mine", []);
      }
    }
    
    // Get player's balance before
    const balanceBefore = await ethers.provider.getBalance(player.address);
    
    // Send exactly 10 ether to the contract
    const tx = await player.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Get player's balance after
    const balanceAfter = await ethers.provider.getBalance(player.address);
    
    // Original contract would transfer contract balance back when block.number % 15 == 0
    // Mutant would NOT transfer because it checks (block.number+1) % 15 == 0
    // The player's net balance change should be close to zero (they get back the 10 ether minus gas)
    // In mutant, player would lose 10 ether (minus nothing back)
    
    // For original: balanceAfter ≈ balanceBefore - gasCost (since they get 10 back)
    // For mutant: balanceAfter ≈ balanceBefore - 10 ether - gasCost
    const netChange = balanceAfter - balanceBefore;
    
    // The net change should be very small (just gas) for the original
    // It would be approximately -10 ether for the mutant
    expect(netChange).to.be.gt(ethers.parseEther("-0.1")); // Much less than 10 ether loss
  });
});