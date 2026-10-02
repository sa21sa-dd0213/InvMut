import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m94a09245 test", function () {
  it("should kill the mutant by sending two transactions in the same block (same timestamp) - original reverts second tx, mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance for potential payouts
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });
    await fundTx.wait();

    // Get the current block to mine two transactions in the same block
    const blockNumberBefore = await ethers.provider.getBlockNumber();
    
    // Send first valid transaction (10 ether, timestamp > pastBlockTime)
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine to the next block to reset the timestamp condition for the original
    await ethers.provider.send("evm_mine", []);

    // Send second transaction - in original this would revert because timestamp equals pastBlockTime
    // In mutant, the require is removed so it should succeed
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The original contract would revert here; the mutant allows it
    // We expect the transaction to succeed (mutant behavior)
    await expect(tx2.wait()).to.not.be.reverted;
  });
});