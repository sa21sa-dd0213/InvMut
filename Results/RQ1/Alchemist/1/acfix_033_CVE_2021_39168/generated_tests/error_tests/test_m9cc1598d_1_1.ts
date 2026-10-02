import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - CallExecuted event emission", function () {
  it("should emit CallExecuted event when executing a scheduled operation", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with constructor arguments: minDelay, proposers array, executors array
    const minDelay = 1; // 1 second minimum delay
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Grant PROPOSER_ROLE to proposer (already done in constructor)
    // Grant EXECUTOR_ROLE to executor (already done in constructor)
    // Grant TIMELOCK_ADMIN_ROLE to the contract itself (already done in constructor)

    // Prepare a simple operation: call with no value and empty data
    const target = owner.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));

    // Schedule the operation as proposer
    const scheduleTx = await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      minDelay
    );
    await scheduleTx.wait();

    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);

    // Wait for the delay to pass
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Execute the operation as executor and expect CallExecuted event
    const executeTx = await instance.connect(executor).execute(
      target,
      value,
      data,
      predecessor,
      salt
    );

    // Wait for the transaction receipt to check events
    const receipt = await executeTx.wait();

    // Find the CallExecuted event
    const callExecutedEvent = receipt.logs.find(
      (log: any) => {
        try {
          const parsed = instance.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          return parsed?.name === "CallExecuted";
        } catch {
          return false;
        }
      }
    );

    // Assert that the CallExecuted event was emitted
    expect(callExecutedEvent).to.not.be.undefined;

    // Verify event parameters
    if (callExecutedEvent) {
      const parsed = instance.interface.parseLog({
        topics: callExecutedEvent.topics,
        data: callExecutedEvent.data
      });
      expect(parsed?.args.id).to.equal(id);
      expect(parsed?.args.index).to.equal(0);
      expect(parsed?.args.target).to.equal(target);
      expect(parsed?.args.value).to.equal(value);
      expect(parsed?.args.data).to.equal(data);
    }
  });
});