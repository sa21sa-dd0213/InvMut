import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m8352f4ad test", function () {
  it("should kill mutant by sending 10 ether when block.number is multiple of 15 and verifying payout", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Get current block number and calculate next block that is a multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock + (15 - (currentBlock % 15));

    // Mine blocks to reach the target block number
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record player's balance before sending
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Player sends exactly 10 ether to the contract
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check that the payout occurred (balance increased by 10 ether minus gas costs)
    // On original: balance increases by ~10 ether (the contract sends its entire balance)
    // On mutant: balance decreases by gas costs only (no payout)
    const balanceAfter = await ethers.provider.getBalance(player.address);

    // The player should have received the full contract balance back (10 ether deposited)
    // So net balance should be at least the initial balance minus gas costs (small)
    // On mutant, net balance will be initial balance minus gas costs (no payout)
    expect(balanceAfter).to.be.gt(balanceBefore - ethers.parseEther("0.01"));
  });
});