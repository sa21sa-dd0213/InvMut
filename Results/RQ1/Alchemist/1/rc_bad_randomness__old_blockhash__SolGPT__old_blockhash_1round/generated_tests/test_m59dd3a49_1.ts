import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant detection", function () {
  it("should detect mutant m59dd3a49 by locking in guess for next block and settling after one block", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Player locks in guess with 1 ether, predicting hash of block.number + 1
    const currentBlock = await ethers.provider.getBlock("latest");
    const targetBlockNumber = currentBlock.number + 1;
    
    // We need to mine a block to make blockhash(targetBlockNumber) available
    // First, get the blockhash of the target block by mining it
    await ethers.provider.send("evm_mine", []);
    
    // Now get the hash of the block we just mined (which is block.number - 1 from current)
    const targetBlock = await ethers.provider.getBlock(targetBlockNumber);
    const targetHash = targetBlock.hash;
    
    // Lock in guess - this will set stored block to block.number + 1 in original, block.number + 2 in mutant
    await instance.connect(player).lockInGuess(targetHash, { value: ethers.parseEther("1") });
    
    // Mine one more block so block.number > stored block number
    // For original: stored = block.number + 1 (from when lockInGuess was called)
    // After mining one more block, block.number = stored block + 1, so settle() works
    await ethers.provider.send("evm_mine", []);
    
    // Get player balance before settle
    const balanceBefore = await ethers.provider.getBalance(player.address);
    
    // Settle - should transfer 2 ether to player in original, but fail in mutant
    // because mutant stored block.number + 2, so we'd need 2 blocks after lockInGuess
    const tx = await instance.connect(player).settle();
    await tx.wait();
    
    // In original contract, player wins and gets 2 ether
    // In mutant, player doesn't win (hash mismatch), no transfer
    const balanceAfter = await ethers.provider.getBalance(player.address);
    
    // The test should pass on original (balance increases by ~2 ether minus gas)
    // but fail on mutant (balance decreases by gas only)
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});