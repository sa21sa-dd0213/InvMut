import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - me2f4a984", function () {
  it("should kill mutant by scheduling with delay exactly equal to minimum delay", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 3600; // 1 hour in seconds
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Grant PROPOSER_ROLE to proposer if not already done in constructor
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);

    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));

    // Schedule with delay EXACTLY equal to minDelay
    // Original contract accepts this (delay >= minDelay)
    // Mutant rejects this (delay > minDelay) - should revert
    await expect(
      instance.connect(proposer).schedule(target, value, data, predecessor, salt, minDelay)
    ).to.not.be.reverted;

    // Verify operation is pending
    const id = await instance.hashOperation(target, value, data, predecessor, salt);
    expect(await instance.isOperationPending(id)).to.be.true;
  });
});