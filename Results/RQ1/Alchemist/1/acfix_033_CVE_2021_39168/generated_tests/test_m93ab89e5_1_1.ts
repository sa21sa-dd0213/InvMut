import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - isOperationPending", function () {
  it("should detect mutant where > is replaced with < in isOperationPending", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 100; // 100 seconds
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Schedule an operation as proposer
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));

    // Schedule with proposer role
    const scheduleTx = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      minDelay
    );
    await scheduleTx.wait();

    // Get operation ID
    const operationId = await instance.hashOperation(
      target,
      value,
      data,
      predecessor,
      salt
    );

    // The operation should be pending (scheduled but not yet ready)
    const isPending = await instance.isOperationPending(operationId);

    // In original: returns true when timestamp > 1 (operation is pending)
    // In mutant: returns true when timestamp < 1 (which would be false for scheduled ops)
    // So the mutant would return false, causing this assertion to fail
    expect(isPending).to.equal(true);
  });
});