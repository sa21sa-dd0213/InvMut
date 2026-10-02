import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test m14ba9b32", function () {
  it("should kill mutant by checking transfer at block.number % 15 == 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so it can pay out
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });
    await fundTx.wait();

    // Find a block where block.number % 15 == 0
    let targetBlockNumber;
    let currentBlock = await ethers.provider.getBlock("latest");
    if (currentBlock.number % 15 === 0) {
      targetBlockNumber = currentBlock.number;
    } else {
      targetBlockNumber = currentBlock.number + (15 - (currentBlock.number % 15));
    }

    // Mine blocks to reach the target block
    const blocksToMine = targetBlockNumber - currentBlock.number;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine");
    }

    // Record addr1 balance before
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Send exactly 10 ether to trigger fallback at the correct block
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check that the transfer occurred (balance increased)
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    
    // The original contract should transfer the entire balance to addr1
    // The mutant will not trigger because it checks block.number+1 % 15 == 0
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});