import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant test - block.timestamp replaced with block.prevrandao", function () {
  it("should kill mutant by showing Collect succeeds with timestamp but fails with prevrandao", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract: set MinSum, LogFile, and finalize initialization
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.01"));
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // User deposits 1 ether with a lock time of 60 seconds from now
    const depositAmount = ethers.parseEther("1");
    const lockTime = 60; // 60 seconds
    
    await instance.connect(user).Put(lockTime, { value: depositAmount });
    
    // Get the user's unlock time from the contract
    const userAccount = await instance.Acc(user.address);
    const unlockTime = userAccount.unlockTime;
    
    // Advance time to after the unlock time
    const currentBlock = await ethers.provider.getBlock("latest");
    const timeAdvance = Number(unlockTime - currentBlock!.timestamp) + 10; // 10 seconds after unlock
    await ethers.provider.send("evm_increaseTime", [timeAdvance]);
    await ethers.provider.send("evm_mine", []);
    
    // Now try to collect 0.5 ether (which satisfies all conditions)
    const collectAmount = ethers.parseEther("0.5");
    
    // This should succeed on original (block.timestamp > unlockTime) 
    // but fail on mutant (block.prevrandao is a random number, not > unlockTime)
    await expect(
      instance.connect(user).Collect(collectAmount, { value: 0 })
    ).to.be.reverted; // Mutant will revert because prevrandao won't satisfy the time condition
  });
});