import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m8352f4ad", function () {
  it("should send payout when block.number % 15 == 0, but mutant never pays", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance for potential payout
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Find a block number that is divisible by 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + (15 - (currentBlock % 15));

    // Mine blocks until we reach the target block number
    while ((await ethers.provider.getBlockNumber()) < targetBlock) {
      await ethers.provider.send("evm_mine", []);
    }

    // Record player balance before the transaction
    const balanceBefore = await ethers.provider.getBalance(player.address);
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Player sends exactly 10 ether to trigger fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get balance after
    const balanceAfter = await ethers.provider.getBalance(player.address);
    const contractBalanceAfter = await ethers.provider.getBalance(await instance.getAddress());

    // In the original, the player should receive the entire contract balance
    // In the mutant (false condition), no payout occurs
    // The test expects the payout to happen (original behavior), so it will fail on the mutant
    expect(contractBalanceAfter).to.equal(0);
    expect(balanceAfter - balanceBefore).to.equal(contractBalanceBefore);
  });
});