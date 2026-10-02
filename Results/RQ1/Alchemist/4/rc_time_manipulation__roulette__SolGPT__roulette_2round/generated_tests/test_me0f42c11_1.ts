import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - modulo vs division", function () {
  it("should kill the mutant by verifying payout at block number multiple of 15", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with initial balance for transfer testing
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Get current block number and calculate next block that is a multiple of 15
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentBlockNumber = currentBlock.number;
    const nextMultipleOf15 = Math.ceil(currentBlockNumber / 15) * 15;
    
    // Mine blocks to reach the target block number
    const blocksToMine = nextMultipleOf15 - currentBlockNumber;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Verify we are at the correct block number
    const targetBlock = await ethers.provider.getBlock("latest");
    expect(targetBlock.number % 15).to.equal(0);
    
    // Record player's balance before
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    
    // Player sends exactly 10 ether to trigger the fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Check if the contract transferred its balance to the player
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // In the original contract, at block.number % 15 == 0, the full balance is transferred
    // In the mutant (block.number / 15 == 0), no transfer occurs at this block height
    // The player should have received the contract balance minus gas costs
    // We check that player's balance increased by more than just the 10 ether sent back
    const expectedMinIncrease = ethers.parseEther("10"); // At minimum they get their 10 back
    expect(playerBalanceAfter - playerBalanceBefore).to.be.gt(expectedMinIncrease);
    
    // Additionally, contract balance should be 0 after successful transfer
    expect(contractBalance).to.equal(0);
  });
});