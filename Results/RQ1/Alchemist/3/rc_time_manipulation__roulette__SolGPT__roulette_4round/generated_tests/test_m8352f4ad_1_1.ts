import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m8352f4ad - payout condition replaced with false", function () {
  it("should payout to caller when block.number % 15 == 0 on original, but fail on mutant", async function () {
    const [owner, caller] = await ethers.getSigners();

    // Deploy contract with initial funding (constructor is payable)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("100") });
    await instance.waitForDeployment();

    // Get initial balances
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    const initialCallerBalance = await ethers.provider.getBalance(caller.address);

    // Get current block number and calculate next block that is multiple of 15
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock + (15 - (currentBlock % 15));

    // Mine blocks until we reach targetBlock - 1 (so next tx lands on targetBlock)
    while ((await ethers.provider.getBlockNumber()) < targetBlock - 1) {
      await ethers.provider.send("evm_mine", []);
    }

    // Ensure pastBlockTime is set by sending a small qualifying transaction first
    const setupTx = await caller.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10"),
    });
    await setupTx.wait();

    // Now we need another block that is multiple of 15
    currentBlock = await ethers.provider.getBlockNumber();
    targetBlock = currentBlock + (15 - (currentBlock % 15));

    while ((await ethers.provider.getBlockNumber()) < targetBlock - 1) {
      await ethers.provider.send("evm_mine", []);
    }

    // Send exactly 10 ether to trigger the payout condition
    const tx = await caller.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10"),
    });
    await tx.wait();

    // Check final balances
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    const finalCallerBalance = await ethers.provider.getBalance(caller.address);

    // On original: contract balance decreases by the full balance (transferred to caller)
    // On mutant: condition false, so no transfer happens, contract balance increases by 10 ether
    expect(finalContractBalance).to.be.lessThan(initialContractBalance);
    expect(finalCallerBalance).to.be.greaterThan(initialCallerBalance);
  });
});