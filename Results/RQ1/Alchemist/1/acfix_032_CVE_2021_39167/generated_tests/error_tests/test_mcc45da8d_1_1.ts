import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - mcc45da8d", function () {
  it("should emit CallScheduled events for each item in scheduleBatch and fail if event is missing", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();

    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];

    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();

    // Grant proposer role to the proposer signer
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);

    // Setup test data for batch
    const targets = [executor.address, executor.address];
    const values = [0, 0];
    const datas = ["0x", "0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = minDelay + 100;

    // Execute scheduleBatch and capture events
    const tx = await instance.connect(proposer).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      delay
    );
    const receipt = await tx.wait();

    // Get the operation ID for the batch
    const operationId = await instance.hashOperationBatch(
      targets,
      values,
      datas,
      predecessor,
      salt
    );

    // Check that CallScheduled events were emitted for each item in the batch
    const events = receipt.logs
      .map(log => {
        try {
          return instance.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .filter(event => event !== null && event.name === "CallScheduled");

    // We expect exactly 2 CallScheduled events (one for each item in the batch)
    expect(events.length).to.equal(targets.length);

    // Verify each event has the correct parameters
    for (let i = 0; i < targets.length; i++) {
      const event = events[i];
      expect(event.args.id).to.equal(operationId);
      expect(event.args.index).to.equal(i);
      expect(event.args.target).to.equal(targets[i]);
      expect(event.args.value).to.equal(values[i]);
      expect(event.args.data).to.equal(datas[i]);
      expect(event.args.predecessor).to.equal(predecessor);
      expect(event.args.delay).to.equal(delay);
    }

    // Additional verification: the operation should now be pending
    expect(await instance.isOperationPending(operationId)).to.be.true;
  });
});