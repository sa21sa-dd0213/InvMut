import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m8352f4ad", function () {
  it("should send contract balance to caller when block.number % 15 == 0", async function () {
    const [owner, caller] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance (e.g., from owner)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Record caller's balance before the transaction
    const callerBalanceBefore = await ethers.provider.getBalance(caller.address);

    // Find a block where block.number % 15 == 0 by mining blocks if needed
    let currentBlock = await ethers.provider.getBlockNumber();
    const blocksToMine = (15 - (currentBlock % 15)) % 15;
    for (let i = 0; i < blocksToMine; i++) {
      await ethers.provider.send("evm_mine", []);
    }

    // Send exactly 10 ether from caller to trigger fallback
    const tx = await caller.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Verify block condition was met (should be block.number % 15 == 0)
    const txReceipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const blockNumber = txReceipt.blockNumber;
    expect(blockNumber % 15).to.equal(0);

    // Check caller received the full contract balance
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    const callerBalanceAfter = await ethers.provider.getBalance(caller.address);
    // The caller should have received the contract balance (which was 10 + 10 = 20 ether, minus gas)
    expect(callerBalanceAfter).to.be.gt(callerBalanceBefore);
    expect(contractBalance).to.equal(0);
  });
});