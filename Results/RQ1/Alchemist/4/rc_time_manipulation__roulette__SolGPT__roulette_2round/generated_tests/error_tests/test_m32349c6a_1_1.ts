import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - block.number % 15 == 0 vs != 0", function () {
  it("should send balance when block.number % 15 == 0 on original, but mutant fails", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Get current block number and calculate how many blocks to wait for next multiple of 15
    const currentBlock = await ethers.provider.getBlockNumber();
    const blocksToWait = (15 - (currentBlock % 15)) % 15;

    // Mine blocks to reach a block where block.number % 15 == 0
    for (let i = 0; i < blocksToWait; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we're on a multiple of 15 block
    const targetBlock = await ethers.provider.getBlockNumber();
    expect(targetBlock % 15).to.equal(0);

    // Get player balance before
    const balanceBefore = await ethers.provider.getBalance(player.address);

    // Player sends exactly 10 ether to trigger fallback
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Get player balance after
    const balanceAfter = await ethers.provider.getBalance(player.address);

    // On original: condition is true (block % 15 == 0), so player gets contract balance
    // On mutant: condition is false (block % 15 != 0 is false), so player gets nothing
    // The net balance change for player should be: +contractBalance - 10 ether
    // Since contract had 10 ether from owner + 10 ether from player = 20 ether,
    // player should receive 20 ether and lose 10 ether = net +10 ether
    // On mutant, player only loses 10 ether (net negative)
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});