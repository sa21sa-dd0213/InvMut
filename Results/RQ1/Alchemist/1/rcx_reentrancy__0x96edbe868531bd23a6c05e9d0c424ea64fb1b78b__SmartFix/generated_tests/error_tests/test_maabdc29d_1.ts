import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant maabdc29d test", function () {
  it("should kill mutant by testing block.timestamp == acc.unlockTime with revert on original", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set up: configure LogFile and MinSum, then initialize
    await instance.SetLogFile(await logFile.getAddress());
    await instance.SetMinSum(ethers.parseEther("0.1"));
    await instance.Initialized();
    
    // User deposits 1 ether with a lock time of 100 seconds
    const lockTime = 100;
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).Put(lockTime, { value: depositAmount });
    
    // Get the unlock time from the user's account
    const acc = await instance.Acc(user.address);
    const unlockTime = acc.unlockTime;
    
    // Mine blocks to reach exactly unlockTime (not after)
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(unlockTime)]);
    await ethers.provider.send("evm_mine");
    
    // Verify current block timestamp equals unlockTime
    const currentBlock = await ethers.provider.getBlock("latest");
    expect(currentBlock!.timestamp).to.equal(Number(unlockTime));
    
    // Attempt to collect exactly when block.timestamp == unlockTime
    // Original contract should revert (requires >), mutant should succeed (uses >=)
    await expect(
      instance.connect(user).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});