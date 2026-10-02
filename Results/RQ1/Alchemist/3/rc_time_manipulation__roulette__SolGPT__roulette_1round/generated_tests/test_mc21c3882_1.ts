import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc21c3882 test", function () {
  it("should detect mutant that changes > to >= in timestamp check", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const contractAddress = await instance.getAddress();
    
    // Fund the attacker with enough ETH
    const tenEther = ethers.parseEther("10");
    const twentyEther = ethers.parseEther("20");
    
    // Send first transaction - should succeed
    const tx1 = await attacker.sendTransaction({
      to: contractAddress,
      value: tenEther
    });
    await tx1.wait();
    
    // Mine a new block to ensure block.number might change but timestamp could be same
    await ethers.provider.send("evm_mine", []);
    
    // Send second transaction with the same block timestamp
    // We can force the same timestamp by mining with a specific time
    const blockBefore = await ethers.provider.getBlock("latest");
    const currentTimestamp = blockBefore!.timestamp;
    
    // Mine another block with the exact same timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
    
    // Send second transaction - should revert on original (>), succeed on mutant (>=)
    const tx2 = attacker.sendTransaction({
      to: contractAddress,
      value: tenEther
    });
    
    // Original contract would revert the second tx because timestamp is not strictly greater
    // Mutant would allow it (timestamp >= pastBlockTime)
    // Since we cannot know which version we have, we test that the behavior differs
    // from what the original should do
    
    // If this is the mutant, the tx should succeed
    // If original, it should revert
    // We expect it to revert on the original, so we check that
    await expect(tx2).to.be.reverted;
  });
});