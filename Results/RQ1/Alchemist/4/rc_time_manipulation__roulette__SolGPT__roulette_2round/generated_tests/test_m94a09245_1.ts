import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m94a09245 test", function () {
  it("should kill mutant by making two fallback calls in same block - second call should revert on original but succeed on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with enough ether for transfers
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("30")
    });

    // Get the current block number to set up block manipulation
    const blockNumber = await ethers.provider.getBlockNumber();
    
    // Mine blocks until we find a block where block.number % 15 == 0
    // to ensure the first call will trigger a transfer
    while ((await ethers.provider.getBlock("latest")).number % 15 !== 0) {
      await ethers.provider.send("evm_mine", []);
    }

    // Make the first call - this will pass and transfer balance
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Now make the second call in the same block using evm_setNextBlockTimestamp
    // to keep the same block.timestamp as the first call
    const block = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(block.timestamp)]);
    
    // On the original contract, this second call should revert because
    // block.timestamp == pastBlockTime (not strictly greater)
    // On the mutant (which removed the require), it will succeed
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // The mutant will not revert here - expect it to succeed (kill condition)
    await expect(tx2.wait()).to.not.be.reverted;
  });
});