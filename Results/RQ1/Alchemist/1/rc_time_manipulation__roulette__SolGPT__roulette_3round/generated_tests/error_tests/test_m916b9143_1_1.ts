import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m916b9143 test", function () {
  it("should kill mutant by exploiting block.prevrandao non-monotonic behavior", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with 10 ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call: sets pastBlockTime to block.timestamp + 1
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block to ensure block.prevrandao changes
    await ethers.provider.send("evm_mine", []);

    // Second call: in original, requires block.timestamp > pastBlockTime (will pass since new block)
    // In mutant, requires block.prevrandao > pastBlockTime (may fail if prevrandao is smaller)
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    // Third call in same block as tx2 - in original this would revert because timestamp hasn't increased
    // In mutant, this may pass if block.prevrandao happens to be > pastBlockTime
    // We need to force a case where it should fail in original but might pass in mutant
    const blockBefore = await ethers.provider.getBlock("latest");
    
    // Send two transactions in the same block using evm_mine after both are submitted
    const tx3 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Mine to include tx3 in a new block
    await ethers.provider.send("evm_mine", []);
    
    const receipt3 = await tx3.wait();
    
    // Now send another transaction immediately after (should be in same block if we don't mine)
    // This should revert in original (same timestamp) but may pass in mutant (different prevrandao)
    const tx4Promise = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Mine to include tx4 in the same block as tx3
    await ethers.provider.send("evm_mine", []);
    
    // In original: should revert because block.timestamp hasn't changed
    // In mutant: might pass if block.prevrandao > pastBlockTime
    // The test kills the mutant if tx4 succeeds (doesn't revert)
    await expect(tx4Promise).to.be.reverted;
  });
});