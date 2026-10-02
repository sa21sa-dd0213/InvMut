import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - block.number-1 vs block.number", function () {
  it("should detect mutant by verifying balance is NOT transferred when block.number % 15 != 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    
    // Deploy contract with initial funding of 10 ether (constructor is payable)
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();
    
    // Get current block number and find a block where block.number % 15 != 0
    let currentBlock = await ethers.provider.getBlockNumber();
    let targetBlock = currentBlock;
    
    // Find next block where block.number % 15 != 0
    while (targetBlock % 15 === 0) {
      targetBlock++;
    }
    
    // Mine blocks to reach target block
    while (currentBlock < targetBlock) {
      await ethers.provider.send("evm_mine", []);
      currentBlock = await ethers.provider.getBlockNumber();
    }
    
    // Record contract balance before call
    const balanceBefore = await ethers.provider.getBalance(contractAddress);
    
    // Call fallback with exactly 10 ether and valid timestamp
    const pastBlockTime = await instance.pastBlockTime();
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(pastBlockTime) + 1]);
    
    await addr1.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });
    
    // Check contract balance after call
    const balanceAfter = await ethers.provider.getBalance(contractAddress);
    
    // Original: no transfer since block.number % 15 != 0, balance increases by 10
    // Mutant: transfer happens every time, balance stays the same or decreases
    expect(balanceAfter).to.equal(balanceBefore + ethers.parseEther("10"));
  });
});