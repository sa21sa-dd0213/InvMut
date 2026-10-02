import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant mceec20d0 - isOperationReady", function () {
  it("should detect mutant that changes <= to == in isOperationReady", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy with minDelay of 1 second, proposers and executors
    const minDelay = 1; // 1 second delay
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],  // proposers
      [executor.address]   // executors
    );
    await instance.waitForDeployment();

    // Grant TIMELOCK_ADMIN_ROLE to executor for _afterCall
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await instance.connect(owner).grantRole(TIMELOCK_ADMIN_ROLE, executor.address);

    // Schedule an operation as proposer
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));

    await instance.connect(proposer).schedule(
      target,
      value,
      data,
      predecessor,
      salt,
      minDelay
    );

    // Get operation ID
    const id = await instance.hashOperation(target, value, data, predecessor, salt);

    // Wait for exactly the delay period (block.timestamp == scheduled timestamp)
    await ethers.provider.send("evm_increaseTime", [minDelay]);
    await ethers.provider.send("evm_mine", []);

    // At this point, timestamp == block.timestamp, should be ready in both versions
    expect(await instance.isOperationReady(id)).to.be.true;

    // Now wait an additional second so timestamp < block.timestamp
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // In original: timestamp <= block.timestamp => true
    // In mutant: timestamp == block.timestamp => false
    // This should kill the mutant
    expect(await instance.isOperationReady(id)).to.be.true;
  });
});