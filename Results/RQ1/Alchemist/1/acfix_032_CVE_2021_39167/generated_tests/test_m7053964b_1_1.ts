import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test", function () {
  it("should kill mutant m7053964b by calling execute with predecessor = bytes32(0)", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    const timelockAddress = await timelock.getAddress();
    
    // Grant PROPOSER_ROLE and EXECUTOR_ROLE to the timelock itself for self-execution
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
    const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
    
    // Connect as owner to grant roles to timelock contract
    await timelock.connect(owner).grantRole(PROPOSER_ROLE, timelockAddress);
    await timelock.connect(owner).grantRole(EXECUTOR_ROLE, timelockAddress);
    
    // Schedule an operation (any simple call to itself, e.g., getMinDelay)
    const target = timelockAddress;
    const value = 0;
    const data = timelock.interface.encodeFunctionData("getMinDelay");
    const predecessor = ethers.ZeroHash; // bytes32(0) - no dependency
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;
    
    // Schedule as proposer
    await timelock.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute with predecessor = bytes32(0)
    // On original: should succeed (predecessor == bytes32(0) is true)
    // On mutant: should revert (predecessor != bytes32(0) is false, and isOperationDone(bytes32(0)) is false)
    await expect(
      timelock.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 })
    ).to.be.revertedWith("TimelockController: missing dependency");
  });
});