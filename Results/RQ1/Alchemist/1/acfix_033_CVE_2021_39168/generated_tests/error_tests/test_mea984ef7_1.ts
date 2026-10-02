import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - isOperation", function () {
  it("should detect mutant where isOperation uses < instead of > by scheduling an operation and verifying isOperation returns true", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Schedule an operation
    const target = addr1.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = minDelay;

    await instance.connect(owner).schedule(target, value, data, predecessor, salt, delay);

    // Get the operation ID
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);

    // Assert that isOperation returns true for a scheduled operation
    expect(await instance.isOperation(operationId)).to.equal(true);
  });
});