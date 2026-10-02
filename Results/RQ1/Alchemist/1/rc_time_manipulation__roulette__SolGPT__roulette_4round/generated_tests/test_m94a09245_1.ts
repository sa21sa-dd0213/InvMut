import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test", function () {
  it("should kill mutant m94a09245 by calling fallback twice in the same block", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block should revert on original (require block.timestamp > pastBlockTime)
    // but succeed on mutant (since the require is removed)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // On original: expect revert; on mutant: expect success (which kills the mutant)
    // We mine a new block to ensure the second tx is in the same block as the first
    await ethers.provider.send("evm_mine", []); // mine a block to reset timestamp for clean test
    
    // Actually we need both in same block - use evm_setNextBlockTimestamp
    const block = await ethers.provider.getBlock("latest");
    const currentTimestamp = block!.timestamp;
    
    // Mine both transactions in the same block by setting the same timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
    
    const tx1_sameBlock = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1_sameBlock.wait();
    
    // Now try second call with same timestamp - should revert on original
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
    
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted; // Original reverts; mutant would NOT revert -> test passes on original, fails on mutant
  });
});