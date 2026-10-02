import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimelockController mutant detection - m1c7f4f66", function () {
  it("should kill mutant by calling updateDelay from timelock itself and expecting success", async function () {
    const [owner, proposer, executor] = await ethers.getSigners();
    
    const minDelay = 3600; // 1 hour
    const proposers = [proposer.address];
    const executors = [executor.address];
    
    const Factory = await ethers.getContractFactory("TimelockController");
    const instance = await Factory.deploy(minDelay, proposers, executors);
    await instance.waitForDeployment();
    
    const timelockAddress = await instance.getAddress();
    
    // Schedule an operation that calls updateDelay from the timelock itself
    const newDelay = 7200;
    const data = instance.interface.encodeFunctionData("updateDelay", [newDelay]);
    
    // Schedule the operation
    const salt = ethers.randomBytes(32);
    const predecessor = ethers.ZeroHash;
    
    const scheduleTx = await instance.connect(proposer).schedule(
      timelockAddress, 
      0, 
      data, 
      predecessor, 
      salt, 
      minDelay
    );
    await scheduleTx.wait();
    
    // Fast forward time past the delay
    await ethers.provider.send("evm_increaseTime", [minDelay + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Execute the operation - this will call updateDelay from the timelock itself
    const executeTx = await instance.connect(executor).execute(
      timelockAddress, 
      0, 
      data, 
      predecessor, 
      salt, 
      { gasLimit: 3000000 }
    );
    await executeTx.wait();
    
    // Verify the delay was actually updated (should succeed in original, fail in mutant)
    const actualDelay = await instance.getMinDelay();
    expect(actualDelay).to.equal(newDelay);
  });
});