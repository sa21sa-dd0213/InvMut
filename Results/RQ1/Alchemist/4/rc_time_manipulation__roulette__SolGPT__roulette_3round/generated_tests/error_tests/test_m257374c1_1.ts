import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m257374c1", function () {
  it("should kill mutant by triggering transfer when block.number % 15 == 14", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Get current block number
    const currentBlock = await ethers.provider.getBlock("latest");
    let targetBlock = currentBlock!.number;

    // Find next block where block.number % 15 == 14
    while (targetBlock % 15 !== 14) {
      targetBlock++;
    }

    // Mine blocks to reach the target block
    const blocksToMine = targetBlock - currentBlock!.number;
    if (blocksToMine > 0) {
      for (let i = 0; i < blocksToMine; i++) {
        await ethers.provider.send("evm_mine", []);
      }
    }

    // Get initial contract balance
    const initialBalance = await ethers.provider.getBalance(contractAddress);
    
    // Fund the contract with 10 ether (required for transfer)
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Now send 10 ether to trigger fallback in current block (block.number % 15 == 14)
    // In original: condition fails, no transfer
    // In mutant: block.number+1 % 15 == (14+1)%15 == 0, so transfer happens
    const tx = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    const finalBalance = await ethers.provider.getBalance(contractAddress);
    
    // Mutant would have transferred balance (20 ether - 10 = 10 ether left)
    // Original would not transfer (20 ether remains)
    // Expect balance to be less than initial + 10 ether (mutant kills)
    expect(finalBalance).to.be.lessThan(initialBalance + ethers.parseEther("10"));
  });
});