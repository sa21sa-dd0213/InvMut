import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController - Kill mutant m79ad9219 (subtraction instead of addition in _schedule)", function () {
  it("should revert when trying to execute an operation immediately after scheduling with a positive delay", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 86400; // 1 day in seconds
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],
      [executor.address]
    );
    await instance.waitForDeployment();

    // Grant TIMELOCK_ADMIN_ROLE to executor for _afterCall to succeed
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await instance.connect(owner).grantRole(TIMELOCK_ADMIN_ROLE, executor.address);

    // Schedule an operation
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const delay = 3600; // 1 hour

    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);

    // Get the operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);

    // Verify operation is pending but not ready yet
    const isPending = await instance.isOperationPending(id);
    expect(isPending).to.be.true;

    const isReady = await instance.isOperationReady(id);
    expect(isReady).to.be.false;

    // Attempt to execute immediately - should revert because operation is not ready
    // In the mutant, this would succeed because block.timestamp - delay would be <= block.timestamp
    await expect(
      instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.revertedWith("TimelockController: operation is not ready");
  });
});