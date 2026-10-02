import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc21c3882 test", function () {
  it("should kill the mutant by sending two transactions in the same block with equal timestamp", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether for the first transaction
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Send first fallback transaction - should succeed in original and mutant
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a block with the same timestamp by using evm_setNextBlockTimestamp
    const block = await ethers.provider.getBlock("latest");
    const currentTimestamp = block!.timestamp;
    
    // Set the next block timestamp to be the same as current block
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
    
    // Send second fallback transaction - should revert in original (timestamp not > pastBlockTime)
    // but succeed in mutant (timestamp >= pastBlockTime)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted; // This will pass on original (revert), fail on mutant (no revert) - killing the mutant
  });
});