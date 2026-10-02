import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant ma78a744d - _beforeCall && vs ||", function () {
  it("should execute operation with non-zero predecessor after predecessor is done, but mutant fails", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const minDelay = 10; // 10 seconds delay
    const proposers = [owner.address];
    const executors = [owner.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    // Get the contract address
    const timelockAddress = await instance.getAddress();
    
    // Encode a simple call - call updateDelay on itself with new delay
    const newDelay = 20;
    const callData = instance.interface.encodeFunctionData("updateDelay", [newDelay]);
    
    // Create first operation (no predecessor)
    const salt1 = ethers.randomBytes(32);
    const hash1 = await instance.hashOperation(timelockAddress, 0, callData, ethers.ZeroHash, salt1);
    
    // Schedule first operation
    await instance.connect(owner).schedule(timelockAddress, 0, callData, ethers.ZeroHash, salt1, minDelay);
    
    // Wait for delay to pass
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute first operation (this will complete and set timestamp to DONE)
    await instance.connect(owner).execute(timelockAddress, 0, callData, ethers.ZeroHash, salt1, { value: 0 });
    
    // Verify first operation is done
    expect(await instance.isOperationDone(hash1)).to.be.true;
    
    // Create second operation that depends on first operation as predecessor
    const salt2 = ethers.randomBytes(32);
    const callData2 = instance.interface.encodeFunctionData("updateDelay", [30]);
    const hash2 = await instance.hashOperation(timelockAddress, 0, callData2, hash1, salt2);
    
    // Schedule second operation with hash1 as predecessor
    await instance.connect(owner).schedule(timelockAddress, 0, callData2, hash1, salt2, minDelay);
    
    // Wait for delay to pass
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute second operation - this should succeed in original but fail in mutant
    // because mutant requires (predecessor == bytes32(0) && isOperationDone(predecessor))
    // which is impossible when predecessor is non-zero
    await instance.connect(owner).execute(timelockAddress, 0, callData2, hash1, salt2, { value: 0 });
    
    // If we reach here, the operation was executed successfully
    // In the mutant, this would revert with "TimelockController: missing dependency"
    expect(await instance.getMinDelay()).to.equal(30);
  });
});