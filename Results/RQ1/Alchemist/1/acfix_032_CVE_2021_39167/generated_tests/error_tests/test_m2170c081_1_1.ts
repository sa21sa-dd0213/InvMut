import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - m2170c081", function () {
  it("should detect mutation in _schedule by verifying correct timestamp calculation", async function () {
    const [owner, proposer] = await ethers.getSigners();
    
    // Deploy with minimum delay of 1 hour and only the proposer as proposer
    const minDelay = 3600; // 1 hour in seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address], // proposers
      [] // executors (will be set later)
    );
    await instance.waitForDeployment();

    // Grant EXECUTOR_ROLE to the contract itself (so execute can complete)
    const EXECUTOR_ROLE = await instance.EXECUTOR_ROLE();
    await instance.connect(owner).grantRole(EXECUTOR_ROLE, instance.target);

    // Also grant PROPOSER_ROLE to proposer if needed
    const PROPOSER_ROLE = await instance.PROPOSER_ROLE();
    await instance.connect(owner).grantRole(PROPOSER_ROLE, proposer.address);

    // Schedule an operation with a specific delay
    const target = proposer.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.ZeroHash;
    const delay = 100; // 100 seconds delay

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const startTime = blockBefore!.timestamp;

    // Schedule the operation
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Get the operation ID
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);

    // Get the stored timestamp
    const storedTimestamp = await instance.getTimestamp(operationId);

    // With correct addition: storedTimestamp should be startTime + delay
    // With mutant multiplication: storedTimestamp would be startTime * delay (vastly different)
    const expectedTimestamp = startTime + delay;
    
    // Verify the timestamp matches addition, not multiplication
    expect(storedTimestamp).to.equal(expectedTimestamp);

    // Also verify that the operation becomes ready at the correct time
    // Initially it should NOT be ready
    const isReadyBefore = await instance.isOperationReady(operationId);
    expect(isReadyBefore).to.be.false;

    // Mine blocks to advance time past the delay
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);

    // Now it should be ready
    const isReadyAfter = await instance.isOperationReady(operationId);
    expect(isReadyAfter).to.be.true;
  });
});