import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - m32349c6a", function () {
  it("should kill mutant by verifying payout only occurs when block.number % 15 == 0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Get current block number and find the next block divisible by 15
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentBlockNumber = currentBlock.number;
    const blocksUntilTarget = (15 - (currentBlockNumber % 15)) % 15;
    const targetBlockNumber = currentBlockNumber + blocksUntilTarget + 1;

    // Mine blocks to reach a block where block.number % 15 == 0
    for (let i = 0; i < blocksUntilTarget; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record contract balance before transaction
    const balanceBefore = await ethers.provider.getBalance(contractAddress);

    // Player sends exactly 10 ether via fallback
    const tx = await player.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check that the payout was sent (balance should decrease by 10 ether)
    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    
    // Original: payout happens → balance decreases by 10 ether
    // Mutant: payout does NOT happen → balance increases by 10 ether
    // So if balance decreased, mutant is killed
    expect(balanceAfter).to.be.lessThan(balanceBefore);
  });
});