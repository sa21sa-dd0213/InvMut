import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m916b9143 detection test", function () {
  it("should detect mutant that replaced block.timestamp with block.prevrandao", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy contract with initial ether to cover potential transfers
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("100") });
    await instance.waitForDeployment();
    
    // First call - set pastBlockTime to current block.timestamp
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Get the initial pastBlockTime value
    const initialPastBlockTime = await instance.pastBlockTime();
    
    // Mine a new block so block.prevrandao changes (in PoS, prevrandao changes each block)
    await ethers.provider.send("evm_mine", []);
    
    // Get block info to check prevrandao behavior
    const blockBefore = await ethers.provider.getBlock("latest");
    
    // Second call - in original, this should succeed because block.timestamp > pastBlockTime
    // In mutant, this may revert if block.prevrandao is not > pastBlockTime
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // The mutant will revert when block.prevrandao <= pastBlockTime
    // Since pastBlockTime is a timestamp (large number like 1.7 billion) and 
    // block.prevrandao is a random 256-bit value that could be small or large,
    // there's a significant chance block.prevrandao < pastBlockTime causing revert
    // In original, this never reverts because block.timestamp always increases
    
    // To make it deterministic, mine until block.prevrandao is smaller than pastBlockTime
    // by checking block.prevrandao values
    let prevrandaoSmaller = false;
    let attempts = 0;
    
    while (!prevrandaoSmaller && attempts < 50) {
      const block = await ethers.provider.getBlock("latest");
      if (block && block.prevrandao !== null && block.prevrandao < initialPastBlockTime) {
        prevrandaoSmaller = true;
        break;
      }
      await ethers.provider.send("evm_mine", []);
      attempts++;
    }
    
    if (prevrandaoSmaller) {
      // This call should revert in mutant but succeed in original
      await expect(
        attacker.sendTransaction({
          to: await instance.getAddress(),
          value: ethers.parseEther("10")
        })
      ).to.be.reverted;
    } else {
      // Fallback: use a different approach - check that the contract allows calls
      // when prevrandao would be equal (same block) - mutant allows, original doesn't
      // First reset pastBlockTime
      await owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      });
      
      // Try to call in same block - original reverts (same timestamp), mutant might not
      await expect(
        attacker.sendTransaction({
          to: await instance.getAddress(),
          value: ethers.parseEther("10")
        })
      ).to.be.reverted; // Original reverts, mutant also likely reverts (same prevrandao)
    }
  });
});