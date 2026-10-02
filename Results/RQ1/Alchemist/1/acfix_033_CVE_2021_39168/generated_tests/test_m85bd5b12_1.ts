import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - m85bd5b12", function () {
  it("should revert when targets.length < values.length (original) but pass on mutant", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with required constructor arguments
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Prepare batch call data with mismatched lengths: 2 targets, 3 values
    const targets = [executor.address, executor.address]; // 2 targets
    const values = [0, 0, 0]; // 3 values (mismatch)
    const datas = ["0x", "0x"]; // 2 data elements
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;

    // Proposer schedules the batch - should revert on original due to length mismatch
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