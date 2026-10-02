import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - executeBatch loop condition", function () {
  it("should execute all operations in batch and detect when loop condition is broken", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    // Deploy with proposer and executor roles
    const Factory = await ethers.getContractFactory("TimelockController");
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Schedule a batch operation with 2 targets
    const targets = [owner.address, owner.address];
    const values = [0, 0];
    const datas = ["0x", "0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay;

    // Proposer schedules the batch
    await instance.connect(proposer).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      delay
    );

    // Fast forward time to make operation ready
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Get operation ID
    const id = await instance.hashOperationBatch(
      targets,
      values,
      datas,
      predecessor,
      salt
    );

    // Grant TIMELOCK_ADMIN_ROLE to executor for _afterCall
    await instance.connect(owner).grantRole(
      await instance.TIMELOCK_ADMIN_ROLE(),
      executor.address
    );

    // Execute batch and expect 2 CallExecuted events
    const tx = await instance.connect(executor).executeBatch(
      targets,
      values,
      datas,
      predecessor,
      salt
    );
    const receipt = await tx.wait();

    // The mutant will only emit 0 CallExecuted events (loop never runs)
    // Original emits 2 CallExecuted events
    const events = receipt?.logs?.filter(
      (log: any) => log.fragment && log.fragment.name === "CallExecuted"
    ) || [];

    // Assert that exactly 2 CallExecuted events were emitted
    // This will fail on the mutant which emits 0 events
    expect(events.length).to.equal(2);

    // Also verify operation is marked as done
    expect(await instance.isOperationDone(id)).to.be.true;
  });
});