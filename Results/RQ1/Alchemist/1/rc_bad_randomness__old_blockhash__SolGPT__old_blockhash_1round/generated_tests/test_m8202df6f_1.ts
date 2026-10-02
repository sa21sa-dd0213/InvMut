import { expect } from "chai";
import { ethers } from "hardhat";

describe("PredictTheBlockHashChallenge mutant m8202df6f test", function () {
  it("should kill the mutant by locking in a correct guess and expecting reward", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy contract with 1 ether
    const Factory = await ethers.getContractFactory("PredictTheBlockHashChallenge");
    const instance = await Factory.deploy({ value: ethers.parseEther("1") });
    await instance.waitForDeployment();
    
    // Get current block number and compute the target block (block.number + 1)
    const currentBlock = await ethers.provider.getBlockNumber();
    const targetBlock = currentBlock + 1;
    
    // Mine a block to get the blockhash for the target block
    await ethers.provider.send("evm_mine", []);
    const blockHash = (await ethers.provider.getBlock(targetBlock)).hash;
    
    // Lock in the correct guess with 1 ether
    const lockTx = await instance.connect(owner).lockInGuess(blockHash, { value: ethers.parseEther("1") });
    await lockTx.wait();
    
    // Wait until we pass the target block (need block.number > targetBlock)
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_mine", []);
    
    // Record balance before settle
    const balanceBefore = await ethers.provider.getBalance(owner.address);
    
    // Call settle - on original contract this would succeed, on mutant it reverts or does nothing
    const settleTx = await instance.connect(owner).settle();
    await settleTx.wait();
    
    // Check balance after - should have increased by 2 ether if condition was true
    const balanceAfter = await ethers.provider.getBalance(owner.address);
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});