import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mda340d38", function () {
  it("should NOT transfer balance when block.number % 15 != 0", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance for context
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Find a block where block.number % 15 != 0
    const currentBlock = await ethers.provider.getBlock("latest");
    let targetBlock = currentBlock.number;
    // Move to next block that is NOT a multiple of 15
    while (targetBlock % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
      targetBlock = (await ethers.provider.getBlock("latest")).number;
    }

    // Record balance before
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());

    // Player sends exactly 10 ether to trigger fallback
    await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Balance should remain the same (no transfer happened)
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("10"));
  });
});