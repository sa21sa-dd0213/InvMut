import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette - Kill mutant mac3a8c58", function () {
  it("should fail on mutant when block.number % 15 == 0 and balance is transferred", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy contract with initial funding of 10 ether (to have balance to transfer)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();

    // Get current block number and find the next block where block.number % 15 == 0
    let currentBlock = await ethers.provider.getBlock("latest");
    let targetBlockNumber = currentBlock.number + 1;
    // Advance to a block where block.number % 15 == 0
    while (targetBlockNumber % 15 !== 0) {
      targetBlockNumber++;
    }

    // Mine blocks to reach the target block number
    const blocksToMine = targetBlockNumber - currentBlock.number;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record player's balance before the call
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);

    // Get contract balance (should be 10 ether)
    const contractBalance = await ethers.provider.getBalance(contractAddress);

    // Player sends exactly 10 ether to trigger fallback with correct condition
    const tx = await player.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Verify block number is divisible by 15
    const blockAfterTx = await ethers.provider.getBlock(tx.blockNumber);
    expect(blockAfterTx.number % 15).to.equal(0);

    // On original: player receives contract balance (10 ether)
    // On mutant (if block.number % 15 != 0): player receives nothing
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const expectedBalance = playerBalanceBefore + contractBalance - ethers.parseEther("10"); // received balance minus sent 10 ether
    expect(playerBalanceAfter).to.equal(expectedBalance);
  });
});