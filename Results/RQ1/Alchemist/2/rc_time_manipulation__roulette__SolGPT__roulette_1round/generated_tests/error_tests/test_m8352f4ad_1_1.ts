import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m8352f4ad test", function () {
  it("should detect mutant that changes block.number % 15 == 0 to false", async function () {
    const [owner, player] = await ethers.getSigners();

    // Deploy contract (payable constructor, no arguments needed)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();

    // Fund the contract with initial balance (optional, but helps verify)
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Record player's balance before
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);

    // Get current block number and find next block divisible by 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15));

    // Mine blocks to reach target block
    await ethers.provider.send("hardhat_mine", [targetBlock - currentBlock]);

    // Verify we are at the right block
    const blockAfterMining = await ethers.provider.getBlockNumber();
    expect(blockAfterMining % 15).to.equal(0);

    // Player sends exactly 10 ether to trigger fallback
    const tx = await player.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check balances after transaction
    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);

    // In original: player gets contract balance (payout occurs)
    // In mutant: no payout, contract keeps all funds
    // The mutant is killed if player did NOT receive the payout
    const payoutAmount = contractBalanceBefore;
    const expectedPlayerBalanceIfPayout = playerBalanceBefore - ethers.parseEther("10") + payoutAmount;

    // If mutant is active (no payout), player balance will be lower
    expect(playerBalanceAfter).to.be.lessThan(expectedPlayerBalanceIfPayout);

    // Also verify contract still has funds (mutant didn't transfer)
    expect(contractBalanceAfter).to.be.gt(0);
  });
});