import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m257374c1", function () {
  it("should kill mutant by proving block.number+1 condition is off by one", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Get current block number
    const currentBlock = await ethers.provider.getBlock("latest");
    let blockNumber = currentBlock.number;

    // Find a block number that is NOT a multiple of 15, but block.number+1 IS a multiple of 15
    // We need: block.number % 15 != 0 AND (block.number + 1) % 15 == 0
    // This means block.number = 14, 29, 44, etc.
    const targetBlock = blockNumber + ((14 - (blockNumber % 15) + 15) % 15);
    
    // Mine blocks until we reach the target block number
    const blocksToMine = targetBlock - blockNumber;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Now we are at block number where: block.number % 15 != 0 AND (block.number+1) % 15 == 0
    // Send exactly 10 ether to trigger fallback
    const tx = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check contract balance - should still have 10 ether since original condition should NOT trigger payout
    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    // The mutant would incorrectly trigger payout here, so this assertion kills it
    expect(balanceAfter).to.equal(ethers.parseEther("10"));
  });
});