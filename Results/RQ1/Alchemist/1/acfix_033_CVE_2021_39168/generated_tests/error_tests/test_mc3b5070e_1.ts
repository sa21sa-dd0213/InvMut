import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mc3b5070e", function () {
  it("should emit MinDelayChange event on deployment with correct parameters", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    
    const minDelay = 3600; // 1 hour in seconds
    const proposers: string[] = [addr1.address];
    const executors: string[] = [addr2.address];
    
    // Deploy and capture the deployment transaction
    const deployTx = await Factory.getDeployTransaction(minDelay, proposers, executors);
    const deployer = await ethers.getSigner(owner.address);
    const tx = await deployer.sendTransaction(deployTx);
    const receipt = await tx.wait();
    
    // Get the deployed contract instance
    const instance = await ethers.getContractAt("TimelockController", receipt.contractAddress);
    
    // Check that MinDelayChange event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "MinDelayChange")
      .withArgs(0, minDelay);
  });
});