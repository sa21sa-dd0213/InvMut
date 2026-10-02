import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mda340d38 detection test", function () {
  it("should revert or not send funds when block number is not divisible by 15", async function () {
    const [owner, caller] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for Roulette)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance (e.g., 1 ETH)
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Get the caller's initial balance
    const initialBalance = await ethers.provider.getBalance(caller.address);

    // Find a block where block.number % 15 != 0 by mining blocks if needed
    // Send exactly 10 ether to trigger the fallback
    const tx = await caller.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10.0")
    });
    await tx.wait();

    // Get the block where the transaction was mined
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const blockNumber = receipt.blockNumber;

    // Ensure we are on a block not divisible by 15
    // If it is divisible by 15, mine an extra block and retry
    if (blockNumber % 15 === 0) {
      await ethers.provider.send("evm_mine", []);
      // Retry with a new transaction on a non-15 block
      const tx2 = await caller.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10.0")
      });
      await tx2.wait();
      const receipt2 = await ethers.provider.getTransactionReceipt(tx2.hash);
      const blockNumber2 = receipt2.blockNumber;

      // Verify block number is not divisible by 15
      expect(blockNumber2 % 15).to.not.equal(0);

      // Check caller's balance after second transaction
      // It should have decreased by exactly 10 ether (no funds returned)
      const finalBalance = await ethers.provider.getBalance(caller.address);
      expect(finalBalance).to.be.lessThan(initialBalance - ethers.parseEther("9.0"));
    } else {
      // Check caller's balance after transaction on non-15 block
      // Original contract would NOT send funds, so balance should decrease by exactly 10 ether
      const finalBalance = await ethers.provider.getBalance(caller.address);
      expect(finalBalance).to.be.lessThan(initialBalance - ethers.parseEther("9.0"));
    }
  });
});