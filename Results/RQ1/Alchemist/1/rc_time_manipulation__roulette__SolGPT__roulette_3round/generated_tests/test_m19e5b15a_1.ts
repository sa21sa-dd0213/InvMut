import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection", function () {
  it("should detect mutant m19e5b15a by verifying payout on a block multiple of 15", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get current block number and calculate next block that is a multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    const blocksToWait = 15 - (currentBlock % 15);
    const targetBlock = currentBlock + blocksToWait;

    // Mine blocks to reach the target block number
    for (let i = 0; i < blocksToWait; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we're on the correct block
    const blockNum = await ethers.provider.getBlockNumber();
    expect(blockNum % 15).to.equal(0);

    // Send exactly 10 ether to trigger the fallback function
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    const tx = await user.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // On original contract, balance should be transferred (becomes 0 or initial 10 ether sent by owner)
    // On mutant, condition will never be true (block.number-1 % 15 != 0 for block 15, 30, etc.)
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    
    // If condition was true (original), balance should have been sent to user
    // If condition was false (mutant), balance remains unchanged
    expect(contractBalanceAfter).to.equal(0);
  });
});