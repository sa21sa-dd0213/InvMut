import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette - mutant detection for != instead of ==", function () {
  it("should kill mutant m32349c6a by verifying no transfer when block.number % 15 == 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some balance first
    const fundingAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundingAmount,
    });

    // Get current block number and calculate next block that is multiple of 15
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentBlockNumber = currentBlock.number;
    const blocksUntilNextMultiple = 15 - (currentBlockNumber % 15);
    const targetBlockNumber = currentBlockNumber + blocksUntilNextMultiple;

    // Mine blocks to reach a block number where block.number % 15 == 0
    for (let i = 0; i < blocksUntilNextMultiple; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we're at the right block
    const newBlock = await ethers.provider.getBlock("latest");
    expect(newBlock.number % 15).to.equal(0);

    // Get addr1 balance before
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call fallback with exactly 10 ether
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
    });
    await tx.wait();

    // Get addr1 balance after - should NOT have increased (original behavior)
    // On mutant, balance would increase, killing the mutant
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    const gasCost = tx.gasPrice * tx.gasLimit;
    
    // Balance should be balanceBefore - 10 ether (just the sent amount, no transfer back)
    expect(balanceAfter).to.equal(balanceBefore - ethers.parseEther("10") - gasCost);
  });
});