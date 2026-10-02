import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant me49fcc4a test", function () {
  it("should kill the mutant by calling updateDelay from the timelock itself and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with minimum delay and some proposers/executors
    const minDelay = 3600; // 1 hour
    const proposers = [owner.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const timelock = await Factory.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();
    
    // Get the timelock contract address
    const timelockAddress = await timelock.getAddress();
    
    // Schedule a call to updateDelay from the timelock itself
    // First, encode the updateDelay call with a new delay value
    const newDelay = 7200; // 2 hours
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const data = timelock.interface.encodeFunctionData("updateDelay", [newDelay]);
    
    // Schedule the operation
    const predecessor = ethers.ZeroHash;
    const salt = ethers.hexlify(ethers.randomBytes(32));
    const value = 0;
    
    const scheduleTx = await timelock.schedule(
      timelockAddress,  // target is the timelock itself
      value,
      data,
      predecessor,
      salt,
      minDelay
    );
    await scheduleTx.wait();
    
    // Get the operation id
    const id = await timelock.hashOperation(
      timelockAddress,
      value,
      data,
      predecessor,
      salt
    );
    
    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute the operation - this will call updateDelay from the timelock itself
    const executeTx = await timelock.execute(
      timelockAddress,
      value,
      data,
      predecessor,
      salt,
      { value: 0 }
    );
    await executeTx.wait();
    
    // Verify the delay was updated (original behavior)
    const currentDelay = await timelock.getMinDelay();
    expect(currentDelay).to.equal(newDelay);
    
    // If the mutant is present, the require(msg.sender != address(this)) would revert
    // because the timelock is calling itself, thus the test would fail
  });
});