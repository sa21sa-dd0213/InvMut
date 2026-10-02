import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant kill test - isOperationDone", function () {
  it("should detect mutant that removes return statement from isOperationDone", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    // Deploy TimelockController with proposers and executors
    const minDelay = 3600; // 1 hour
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(
      minDelay,
      [proposer.address],
      [executor.address]
    );
    await instance.waitForDeployment();
    
    // Get the timelock address
    const timelockAddress = await instance.getAddress();
    
    // Grant TIMELOCK_ADMIN_ROLE to executor so they can complete the operation
    const TIMELOCK_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ADMIN_ROLE"));
    await instance.connect(owner).grantRole(TIMELOCK_ADMIN_ROLE, executor.address);
    
    // Schedule an operation as proposer
    const target = executor.address;
    const value = 0;
    const data = "0x";
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const delay = minDelay;
    
    await instance.connect(proposer).schedule(target, value, data, predecessor, salt, delay);
    
    // Get the operation ID
    const operationId = await instance.hashOperation(target, value, data, predecessor, salt);
    
    // Verify operation is pending (not done yet)
    expect(await instance.isOperationDone(operationId)).to.equal(false);
    
    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [delay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute the operation as executor
    await instance.connect(executor).execute(target, value, data, predecessor, salt, { value: 0 });
    
    // After execution, isOperationDone should return true
    // The mutant will return false here, killing it
    expect(await instance.isOperationDone(operationId)).to.equal(true);
  });
});