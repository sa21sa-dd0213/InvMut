import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mf1157a47 test", function () {
  it("should succeed on original but revert on mutant when calling Put with non-zero _lockTime", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set up the contract: initialize LogFile and MinSum
    await instance.setLogFile(await logFile.getAddress());
    await instance.setMinSum(ethers.parseEther("0.1"));
    await instance.initialized();
    
    // Call Put with a non-zero _lockTime and some ether
    // This should succeed on original (block.timestamp + _lockTime >= block.timestamp always true)
    // But should revert on mutant because block.timestamp + _lockTime >= block.prevrandao will likely fail
    const lockTime = 100; // non-zero lock time
    const value = ethers.parseEther("1.0");
    
    // The call should revert on the mutant due to the changed require statement
    await expect(
      instance.connect(addr1).put(lockTime, { value: value })
    ).to.be.reverted;
  });
});