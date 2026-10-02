import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - fallback condition change", function () {
  it("should detect mutant that changes winning condition to false", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the current block number
    const currentBlock = await ethers.provider.getBlockNumber();
    
    // Calculate how many blocks until next block that is a multiple of 15
    const blocksUntilMultiple = (15 - (currentBlock % 15)) % 15;
    
    // Mine blocks until we reach a block number that is a multiple of 15
    if (blocksUntilMultiple > 0) {
      await ethers.provider.send("hardhat_mine", [blocksUntilMultiple]);
    }

    // Record contract balance before the transaction
    const balanceBefore = await ethers.provider.getBalance(instance.target);

    // Player sends exactly 10 ether to the contract via fallback
    const tx = await player.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get contract balance after the transaction
    const balanceAfter = await ethers.provider.getBalance(instance.target);

    // On the original contract, the payout would occur (balance decreases by 10 ether)
    // On the mutant (false condition), no payout occurs (balance increases by 10 ether)
    // So we expect balanceAfter to be less than balanceBefore + 10 ether (payout happened)
    // For the mutant, balanceAfter would equal balanceBefore + 10 ether (no payout)
    expect(balanceAfter).to.be.lessThan(balanceBefore + ethers.parseEther("10"));
  });
});