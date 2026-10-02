import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant md3aae15f test", function () {
  it("should kill the mutant by sending two consecutive transactions with 10 ether, where the second one succeeds in original but reverts in mutant due to inverted timestamp comparison", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy contract (constructor is payable but takes no arguments)
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Send first 10 ether transaction - this should succeed in both original and mutant
    // because pastBlockTime is 0 initially, and block.timestamp > 0 is true (original) 
    // and block.timestamp < 0 is false (mutant) - so mutant will revert here already
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();
    
    // Wait for a new block to ensure timestamp increases
    await ethers.provider.send("evm_mine", []);
    
    // Get the pastBlockTime from the contract to understand state
    const pastBlockTime = await instance.pastBlockTime();
    const currentBlock = await ethers.provider.getBlock("latest");
    
    // Send second 10 ether transaction
    // In original: block.timestamp > pastBlockTime should be true (timestamp increased)
    // In mutant: block.timestamp < pastBlockTime will be false (timestamp increased)
    // Therefore mutant will revert on this second call
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // In original this succeeds, in mutant it reverts
    await expect(tx2).to.be.reverted;
  });
});