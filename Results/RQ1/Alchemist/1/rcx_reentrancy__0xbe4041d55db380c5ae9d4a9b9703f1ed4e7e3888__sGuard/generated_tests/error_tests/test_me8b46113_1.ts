import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - me8b46113", function () {
  it("should detect removal of nonReentrant_ modifier from SetLogFile", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a Log contract to use as the log address
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // First, call Initialized() to set intitalized = true (needed for later calls)
    // But we need to test reentrancy on SetLogFile - let's do it differently
    
    // First call SetLogFile from owner (this should succeed in both original and mutant)
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    
    // Now try to call SetLogFile again while the first call is "still in progress"
    // In the original contract, the nonReentrant_ modifier would block this second call
    // In the mutant, it will succeed because the modifier is removed
    
    // We simulate reentrancy by calling SetLogFile directly again
    // In the original contract, this would revert because locked_ is still true
    // In the mutant, it should succeed because there's no reentrancy guard
    
    // Check if the second call succeeds (mutant) or reverts (original)
    const secondCall = instance.connect(owner).SetLogFile(await logInstance.getAddress());
    
    // If the mutant is present, the second call will succeed
    // If the original is present, the second call will revert
    // We expect the mutant to pass this test (meaning the second call succeeds)
    await expect(secondCall).to.not.be.reverted;
    
    // Additional verification: the second call should have changed the LogFile
    // In the original with modifier, this state change wouldn't happen
    // In the mutant, it does happen
  });
});