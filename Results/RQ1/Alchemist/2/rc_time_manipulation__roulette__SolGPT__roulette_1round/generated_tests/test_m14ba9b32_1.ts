import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m14ba9b32 - block.number+1 condition", function () {
  it("should kill mutant by proving that on block where block.number % 15 == 0, the original transfers balance but mutant does not", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await etherts.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether so transfer can happen
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Mine blocks until we land on a block where block.number % 15 == 0
    // We need to be on a block where the condition is true in original
    let currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15));

    // Mine to the target block
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Now we are on a block where block.number % 15 == 0
    // In original: transfer should happen
    // In mutant: block.number+1 % 15 == 0 would be false, so no transfer
    
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Call fallback with exactly 10 ether
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // In original, balance would decrease (transfer happened)
    // In mutant, balance would increase (no transfer, just added 10 ether)
    // This assertion kills the mutant
    expect(contractBalanceAfter).to.be.lessThan(contractBalanceBefore);
  });
});