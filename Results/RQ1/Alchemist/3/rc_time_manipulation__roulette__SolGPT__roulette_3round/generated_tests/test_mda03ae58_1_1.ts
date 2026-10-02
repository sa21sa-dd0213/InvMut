import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mda03ae58 test", function () {
  it("should transfer contract balance when block.number % 15 == 0, but mutant with false never transfers", async function () {
    const [owner, player] = await ethers.getSigners();
    
    // Deploy the contract (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Get current block number and calculate the next block that is a multiple of 15
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentBlockNumber = currentBlock!.number;
    const blocksUntilNext15 = (15 - (currentBlockNumber % 15)) % 15;
    
    // Mine blocks until we are at block number % 15 == 0
    for (let i = 0; i < blocksUntilNext15; i++) {
      await ethers.provider.send("evm_mine", []);
    }
    
    // Verify we are at a block where block.number % 15 == 0
    const targetBlock = await ethers.provider.getBlock("latest");
    expect(targetBlock!.number % 15).to.equal(0);
    
    // Record pastBlockTime before call
    const pastBlockTimeBefore = await instance.pastBlockTime();
    
    // Call fallback with exactly 10 ether and valid timestamp condition
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();
    
    // Check contract balance after the call
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    
    // In original: balance should be 10 ether (initial 10 + 10 from player - 10 transferred = 10)
    // In mutant: balance should be 20 ether (initial 10 + 10 from player, no transfer)
    // Since we cannot know which version we're testing, we assert that the balance is NOT 20
    // (which would indicate the mutant is active - transfer didn't happen)
    expect(contractBalance).to.not.equal(ethers.parseEther("20"));
  });
});