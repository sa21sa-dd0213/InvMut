import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant test - scheduleBatch event emission", function () {
  it("should emit CallScheduled events for each operation in scheduleBatch", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minDelay of 1 day (86400 seconds), proposers and executors
    const minDelay = 86400;
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],
      [executor.address]
    );
    await instance.waitForDeployment();

    // Grant PROPOSER_ROLE to proposer if not already set in constructor
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    
    // The owner (deployer) should have TIMELOCK_ADMIN_ROLE from constructor
    // Let's verify proposer has the role
    const hasProposerRole = await instance.hasRole(PROPOSER_ROLE, proposer.address);
    if (!hasProposerRole) {
      await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);
    }

    // Prepare batch operation data
    const targets = [executor.address, executor.address];
    const values = [0, 0];
    const datas = ["0x", "0x"];
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));

    // Call scheduleBatch as proposer and capture events
    const tx = await instance.connect(proposer).scheduleBatch(
      targets,
      values,
      datas,
      predecessor,
      salt,
      minDelay
    );
    const receipt = await tx.wait();

    // Get the emitted events
    const events = receipt.logs
      .map((log: any) => {
        try {
          return instance.interface.parseLog({
            topics: [...log.topics],
            data: log.data
          });
        } catch (e) {
          return null;
        }
      })
      .filter((event: any) => event !== null && event.name === "CallScheduled");

    // Assert that we have exactly 2 CallScheduled events (one for each operation in the batch)
    expect(events.length).to.equal(2, "Should emit exactly 2 CallScheduled events for 2 operations");

    // Verify the event parameters for the first operation
    expect(events[0].args.id).to.not.be.undefined;
    expect(events[0].args.index).to.equal(0);
    expect(events[0].args.target).to.equal(targets[0]);
    expect(events[0].args.value).to.equal(values[0]);
    expect(events[0].args.predecessor).to.equal(predecessor);
    expect(events[0].args.delay).to.equal(minDelay);

    // Verify the event parameters for the second operation
    expect(events[1].args.id).to.equal(events[0].args.id); // Same operation id
    expect(events[1].args.index).to.equal(1);
    expect(events[1].args.target).to.equal(targets[1]);
    expect(events[1].args.value).to.equal(values[1]);
    expect(events[1].args.predecessor).to.equal(predecessor);
    expect(events[1].args.delay).to.equal(minDelay);
  });
});