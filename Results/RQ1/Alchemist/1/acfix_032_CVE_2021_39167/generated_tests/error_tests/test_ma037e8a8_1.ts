import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant ma037e8a8 - scheduleBatch length validation", function () {
  it("should kill the mutant by calling scheduleBatch with equal length arrays and expecting success", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 100;
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Grant PROPOSER_ROLE to proposer for testing
    await instance.connect(owner).grantRole(await instance.PROPOSER_ROLE(), proposer.address);
    
    // Setup test data with equal length arrays
    const targets = [proposer.address];
    const values = [0];
    const datas = ["0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;
    
    // The mutant has require(targets.length != datas.length, ...)
    // With equal length arrays (1 == 1), the original passes, but the mutant reverts
    await expect(
      instance.connect(proposer).scheduleBatch(
        targets,
        values,
        datas,
        predecessor,
        salt,
        delay
      )
    ).to.not.be.reverted;
  });
});