import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant me0f42c11 detection", function () {
  it("should not transfer balance when block.number is not divisible by 15", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Fund the contract with 10 ether for potential transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get the current block number and find a block that is NOT divisible by 15
    // We'll use block.number + 1 by mining a block at a specific time
    const currentBlock = await ethers.provider.getBlock("latest");
    const targetBlockNumber = currentBlock.number + 1;
    
    // Ensure target block is NOT divisible by 15 (if it is, mine one more)
    const finalBlockNumber = targetBlockNumber % 15 === 0 ? targetBlockNumber + 1 : targetBlockNumber;
    
    // Mine to the target block number
    while ((await ethers.provider.getBlock("latest")).number < finalBlockNumber) {
      await ethers.provider.send("evm_mine", []);
    }

    // Get the contract balance before the call
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Call fallback with exactly 10 ether
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get the contract balance after the call
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // For the original contract, no transfer should happen since block.number % 15 != 0
    // Balance should increase by 10 ether (the deposit) minus any transfer
    // If the mutant transfers, balance will be much less
    expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("10"));
  });
});