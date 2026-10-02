import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m14ba9b32 - kill test", function () {
  it("should not payout when block.number is one less than a multiple of 15", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get current block number
    let currentBlock = await ethers.provider.getBlockNumber();
    
    // Calculate blocks to mine to reach a block where block.number % 15 == 14
    // (one less than a multiple of 15)
    const blocksToAdvance = (15 - (currentBlock % 15) + 14) % 15;
    
    // Mine blocks to reach target block
    for (let i = 0; i < blocksToAdvance; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at a block where block.number % 15 == 14
    const targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(14);

    // Send exactly 10 ether in this block
    const balanceBefore = await ethers.provider.getBalance(instance.target);
    const tx = await owner.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Verify no payout occurred - balance should have increased by exactly 10 ether
    const balanceAfter = await ethers.provider.getBalance(instance.target);
    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("10"));
  });
});