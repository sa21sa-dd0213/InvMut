import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - m210f4487", function () {
  it("should kill mutant that changed > to < in Collect function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 to allow any withdrawal
    await instance.connect(owner).SetMinSum(0);
    
    // Initialize the contract
    await instance.connect(owner).Initialized();
    
    // Set LogFile to a valid address (use the contract itself as a simple log)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    
    // Put 1 ether with a lock time of 1 hour (3600 seconds)
    const lockTime = 3600;
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(lockTime, { value: depositAmount });
    
    // Wait for lock time to expire
    await ethers.provider.send("evm_increaseTime", [lockTime + 1]);
    await ethers.provider.send("evm_mine");
    
    // Try to collect - this should succeed in original (time > unlockTime)
    // but fail in mutant (time < unlockTime is false)
    const collectAmount = ethers.parseEther("1");
    
    // In the original contract, this should succeed
    // In the mutant, this should revert/fail because block.timestamp < acc.unlockTime is false
    const tx = instance.connect(addr1).Collect(collectAmount);
    
    // The mutant changes the condition so that collection is only allowed
    // when block.timestamp < acc.unlockTime, which is false after waiting
    await expect(tx).to.be.reverted;
  });
});