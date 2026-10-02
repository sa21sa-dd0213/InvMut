import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m8352f4ad", function () {
  it("should pay out the contract balance when block.number % 15 == 0, but mutant with false condition never pays", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Get the current block number
    const currentBlock = await ethers.provider.getBlock("latest");
    const blockNumber = currentBlock!.number;

    // Calculate how many blocks to mine to reach a block where block.number % 15 == 0
    const blocksToWait = (15 - (blockNumber % 15)) % 15;

    // Mine blocks to reach the target block number
    for (let i = 0; i < blocksToWait; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Verify we are at the correct block
    const targetBlock = await ethers.provider.getBlock("latest");
    expect(targetBlock!.number % 15).to.equal(0);

    // Get player's initial balance
    const playerBalanceBefore = await ethers.provider.getBalance(player.address);

    // Get contract's initial balance (should be 0)
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);
    expect(contractBalanceBefore).to.equal(0n);

    // Fund the contract with some ether first (simulate previous deposits)
    await owner.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });

    const contractBalanceAfterFunding = await ethers.provider.getBalance(instance.target);
    expect(contractBalanceAfterFunding).to.equal(ethers.parseEther("10"));

    // Player calls fallback with exactly 10 ether at the winning block
    const tx = await player.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check contract balance - in original it should be 0 (all paid out), in mutant it should still be 20 ether
    const contractBalanceFinal = await ethers.provider.getBalance(instance.target);

    // This assertion will pass on original (balance = 0) but fail on mutant (balance = 20 ether)
    expect(contractBalanceFinal).to.equal(0n);
  });
});