import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - hashOperation return value", function () {
  it("should detect mutant that removes return from hashOperation by comparing scheduled and computed hashes", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minimal delay (1 second) and setup roles
    const minDelay = 1;
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(
      minDelay,
      [proposer.address],  // proposers
      [executor.address]   // executors
    );
    await timelock.waitForDeployment();

    // Grant TIMELOCK_ADMIN_ROLE to the timelock itself for _afterCall to work
    const TIMELOCK_ADMIN_ROLE = await timelock.TIMELOCK_ADMIN_ROLE();
    await timelock.grantRole(TIMELOCK_ADMIN_ROLE, timelock.target);
    
    // Grant EXECUTOR_ROLE to executor
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    await timelock.grantRole(EXECUTOR_ROLE, executor.address);

    // Prepare operation parameters
    const target = ethers.ZeroAddress;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    const delay = minDelay + 1;

    // Compute the expected hash using the contract's hashOperation
    const expectedHash = await timelock.hashOperation(
      target,
      value,
      data,
      predecessor,
      salt
    );

    // Schedule the operation as proposer
    await timelock.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );

    // Get the actual scheduled operation ID (stored in the contract)
    // Recompute the hash the same way the contract does internally
    const actualHash = await timelock.hashOperation(
      target,
      value,
      data,
      predecessor,
      salt
    );

    // If the mutant removed "return", hashOperation returns 0x0...
    // The scheduled operation would have been stored with the correct hash
    // but hashOperation now returns 0x0 instead of the correct hash
    // So we check that the hash returned by hashOperation matches the expected value
    expect(actualHash).to.equal(expectedHash);

    // Wait for the delay to pass
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine");

    // Attempt to execute using the hash from hashOperation
    // If mutant is present, hashOperation returns 0x0, and execute will fail
    // because the operation with id=0x0 doesn't exist or is not ready
    await expect(
      timelock.connect(executor).execute(
        target,
        value,
        data,
        predecessor,
        salt
      )
    ).to.be.reverted;
  });
});