import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m65a396c0 test", function () {
  it("should detect mutant by verifying isOperation returns true for scheduled operation", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy with minimum delay of 1 second, owner as proposer and executor
    const Factory = await ethers.getContractFactory("TimelockController");
    const minDelay = 1;
    const proposers = [owner.address];
    const executors = [owner.address];
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Schedule an operation
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = 100;

    // Get the operation ID before scheduling
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);

    // Verify operation is NOT scheduled initially (original returns false, mutant also returns false)
    expect(await instance.isOperation(operationId)).to.equal(false);

    // Schedule the operation
    await instance.connect(owner).schedule(target, value, data, predecessor, salt, delay);

    // Verify operation IS now scheduled (original returns true, mutant would return false)
    expect(await instance.isOperation(operationId)).to.equal(true);
  });
});