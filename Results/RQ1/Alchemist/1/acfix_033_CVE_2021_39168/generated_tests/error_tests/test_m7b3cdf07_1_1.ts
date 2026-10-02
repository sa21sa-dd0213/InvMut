import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant m7b3cdf07", function () {
  it("should detect mutant that inverts isOperationDone logic", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with minimal delay of 1 second for testing
    const minDelay = 1;
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Grant executor role to the executor address
    const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, executor.address);

    // Prepare a simple operation
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;

    // Schedule the operation
    const tx = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      minDelay
    );
    await tx.wait();

    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);

    // Wait for the delay to pass
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Execute the operation (this will set the timestamp to _DONE_TIMESTAMP = 1)
    const executeTx = await instance.connect(executor).execute(
      target,
      value,
      data,
      predecessor,
      salt,
      { value: 0 }
    );
    await executeTx.wait();

    // Now check if isOperationDone returns true for the completed operation
    // The original returns true when timestamp == 1 (_DONE_TIMESTAMP)
    // The mutant returns true when timestamp != 1 (inverted logic)
    const isDone = await instance.isOperationDone(id);

    // The mutant will return false (since timestamp IS 1, mutant returns false)
    // Original returns true, so we expect true
    expect(isDone).to.equal(true);
  });
});