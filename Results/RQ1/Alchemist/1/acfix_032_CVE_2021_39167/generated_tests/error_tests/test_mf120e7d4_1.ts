import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mf120e7d4", function () {
  it("should detect broken isOperationReady by checking operation readiness after delay expires", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 100; // 100 seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],
      [executor.address]
    );
    await instance.waitForDeployment();

    // Schedule an operation
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.randomBytes(32);
    const delay = 200; // 200 seconds delay

    await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      delay
    );

    // Get the operation ID
    const id = await instance.hashOperation(
      target,
      value,
      data,
      predecessor,
      salt
    );

    // Before delay expires, operation should NOT be ready
    expect(await instance.isOperationReady(id)).to.be.false;

    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine");

    // After delay expires, operation SHOULD be ready
    // Original: returns true. Mutant (broken): returns false (or undefined default)
    expect(await instance.isOperationReady(id)).to.be.true;
  });
});