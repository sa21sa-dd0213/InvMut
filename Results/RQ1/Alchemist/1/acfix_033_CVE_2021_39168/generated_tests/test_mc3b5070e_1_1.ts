import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mc3b5070e", function () {
  it("should emit MinDelayChange event on deployment with correct parameters", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    
    const minDelay = 3600; // 1 hour in seconds
    const proposers: string[] = [addr1.address];
    const executors: string[] = [addr2.address];
    
    // Deploy the contract and get the transaction response directly
    const instance = await Factory.deploy(minDelay, proposers, executors);
    const deployTx = instance.deployTransaction;
    
    // Wait for deployment to complete
    await instance.deployed();
    
    // Check that MinDelayChange event was emitted with correct parameters
    await expect(deployTx)
      .to.emit(instance, "MinDelayChange")
      .withArgs(0, minDelay);
  });
});