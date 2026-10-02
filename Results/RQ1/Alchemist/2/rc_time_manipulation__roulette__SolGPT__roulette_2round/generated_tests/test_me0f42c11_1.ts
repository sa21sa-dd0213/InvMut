import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette - kill mutant me0f42c11", function () {
  it("should detect mutant that replaces % with / by triggering on a multiple of 15 block", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with initial balance (optional, for clarity)
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });

    // Get current block number and calculate the next block that is a multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock + (15 - (currentBlock % 15));

    // Mine blocks until we reach a block number that is a multiple of 15
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are on the correct block
    const blockNum = await ethers.provider.getBlockNumber();
    expect(blockNum % 15).to.equal(0, "Should be on a multiple of 15 block");

    // Player sends exactly 10 ether to trigger the fallback
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await ethers.provider.getBalance(instanceAddress);

    const tx = await player.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // On the original contract, the condition block.number % 15 == 0 would be true
    // and the entire contract balance would be sent to the player.
    // On the mutant (block.number / 15 == 0), this condition is false because
    // block.number / 15 is >= 1 for any block >= 15.
    // Therefore, on the mutant the player should NOT receive the contract balance.

    const playerBalanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalanceAfter = await ethers.provider.getBalance(instanceAddress);

    // On original: player gains the contract balance (minus gas), contract balance becomes 0
    // On mutant: player only loses the 10 ether sent, contract balance increases by 10
    // We assert the mutant behavior to kill it:
    expect(contractBalanceAfter).to.equal(contractBalanceBefore + ethers.parseEther("10"));
    expect(playerBalanceAfter).to.be.lessThan(playerBalanceBefore);
  });
});