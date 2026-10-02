import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - timestamp comparison", function () {
  it("should kill mutant md3aae15f by proving timestamp < check fails on second call", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance to allow transfers
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call - succeeds in both original and mutant (no previous timestamp)
    const tx1 = await attacker.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block to advance timestamp
    await ethers.provider.send("evm_mine", []);

    // Second call - should succeed in original (timestamp > pastBlockTime)
    // but will revert in mutant (timestamp < pastBlockTime is false since timestamps only increase)
    const tx2 = attacker.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Original would succeed, mutant reverts - expect success to kill mutant
    await expect(tx2).to.not.be.reverted;
  });
});