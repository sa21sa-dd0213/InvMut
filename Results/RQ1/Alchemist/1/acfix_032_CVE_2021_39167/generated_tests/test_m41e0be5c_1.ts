import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - m41e0be5c", function () {
  it("should detect missing CallScheduled event emission in schedule function", async function () {
    const [owner, proposer] = await ethers.getSigners();
    
    // Deploy TimelockController with proposer role for the proposer
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Prepare parameters for schedule
    const target = proposer.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;
    
    // Compute the expected operation ID
    const expectedId = await instance.hashOperation(
      target,
      value,
      data,
      predecessor,
      salt
    );
    
    // Schedule the operation as proposer and check for event emission
    await expect(
      instance.connect(proposer).schedule(
        target,
        value,
        data,
        predecessor,
        salt,
        delay
      )
    )
      .to.emit(instance, "CallScheduled")
      .withArgs(
        expectedId,
        0, // index
        target,
        value,
        data,
        predecessor,
        delay
      );
  });
});