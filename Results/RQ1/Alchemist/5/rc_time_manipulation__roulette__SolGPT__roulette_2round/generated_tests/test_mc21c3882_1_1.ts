import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - timestamp >= instead of >", function () {
  it("should revert when calling fallback twice with same timestamp (same block)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send first transaction with 10 ether
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the block timestamp of the first transaction
    const block1 = await ethers.provider.getBlock(tx1.blockNumber);
    const timestamp1 = block1!.timestamp;

    // Mine a new block with the exact same timestamp (simulate same timestamp)
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp1]);
    
    // Second transaction should revert on original (>) but pass on mutant (>=)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx2).to.be.reverted;
  });
});