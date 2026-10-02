import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - me0f42c11", function () {
  it("should revert when block.number >= 15 and condition is met in original but not in mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Get the current block number and mine blocks to reach a block number that is a multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = Math.ceil((currentBlock + 1) / 15) * 15;
    
    // Mine blocks until we reach the target block number
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Now we are at a block where block.number % 15 == 0
    // In the original contract, sending 10 ether should trigger the transfer
    // In the mutant (using / instead of %), block.number / 15 == 0 only when block.number < 15
    // Since we are at block >= 15, the condition fails and no transfer occurs
    
    // Get initial balance
    const initialBalance = await ethers.provider.getBalance(owner.address);
    
    // Send 10 ether to trigger the fallback
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get final balance
    const finalBalance = await ethers.provider.getBalance(owner.address);
    
    // In the original contract, the balance would decrease by less than 10 ether (some returned)
    // In the mutant, the balance decreases by exactly 10 ether (no return)
    // We expect the mutant to NOT return funds, so the balance change should be exactly -10 ether
    const balanceChange = finalBalance - initialBalance;
    expect(balanceChange).to.equal(ethers.parseEther("-10"));
  });
});