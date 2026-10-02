import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mac3a8c58 - kill by testing block.number % 15 == 0 case", function () {
  it("should transfer balance when block.number % 15 == 0 (original behavior), but mutant fails to transfer", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract with initial funding
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with 10 ether (constructor is payable)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Mine blocks to reach a block where block.number % 15 == 0
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = (15 - (currentBlock % 15)) % 15;
    
    // Mine blocks to get to the target block number
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Verify we are at a block where block.number % 15 == 0
    const targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(0);
    
    // Get player's balance before the transaction
    const balanceBefore = await ethers.provider.getBalance(player.address);
    
    // Player sends exactly 10 ether to trigger the fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Get player's balance after the transaction
    const balanceAfter = await ethers.provider.getBalance(player.address);
    
    // Calculate net change (accounting for gas costs)
    const gasCost = tx.gasPrice * (await ethers.provider.getTransactionReceipt(tx.hash)).gasUsed;
    const netChange = balanceAfter - balanceBefore + gasCost;
    
    // Original behavior: on block.number % 15 == 0, contract sends entire balance (10 ether from funding + 10 ether from player = 20 ether)
    // So player should receive 20 ether (minus their own 10 ether sent = net +10 ether)
    // Mutant behavior: condition is != 0, so transfer does NOT happen, player only loses their 10 ether (net -10 ether)
    expect(netChange).to.equal(ethers.parseEther("10"));
  });
});