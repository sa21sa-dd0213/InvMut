import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m458194c3", function () {
  it("should revert when targets.length is less than datas.length in scheduleBatch", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer (contract already grants it to proposer via constructor)
    // But we need to use the proposer to call scheduleBatch
    
    const targets = [executor.address]; // 1 target
    const values = [0];
    const datas = [
      "0x1234", // First data
      "0x5678"  // Second data - this makes datas.length > targets.length
    ];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;
    
    // This should revert because targets.length (1) != datas.length (2)
    // The original contract requires equality, the mutant allows <=
    await expect(
      instance.connect(proposer).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        delay
      )
    ).to.be.revertedWith("TimelockController: length mismatch");
  });
});