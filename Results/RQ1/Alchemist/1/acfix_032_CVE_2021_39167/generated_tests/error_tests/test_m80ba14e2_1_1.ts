import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m80ba14e2: isOperation returns false for unscheduled operation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TimelockController");
    const minDelay = 3600; // 1 hour in seconds
    const proposers = [owner.address];
    const executors = [owner.address];
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Generate a random operation hash that has never been scheduled
    const unscheduledId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent_operation"));

    // For the original contract, isOperation should return false for unscheduled operations
    // The mutant incorrectly returns true because timestamp >= 0 is always true
    expect(await instance.isOperation(unscheduledId)).to.equal(false);
  });
});