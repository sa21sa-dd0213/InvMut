import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mc53a08e2 test", function () {
  it("should detect that unlockTime is not updated when Put is called with a longer lockTime", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor args)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set up the contract
    await instance.SetLogFile(await logFile.getAddress());
    await instance.SetMinSum(ethers.parseEther("0.1"));
    await instance.Initialized();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore!.timestamp;
    
    // First Put with lockTime of 100 seconds
    const lockTime1 = 100;
    await instance.connect(addr1).Put(lockTime1, { value: ethers.parseEther("1.0") });
    
    // Check unlockTime after first Put - should be currentTime + 100
    let holder = await instance.Acc(addr1.address);
    expect(holder.unlockTime).to.equal(currentTime + lockTime1);
    
    // Second Put with lockTime of 200 seconds (longer)
    const lockTime2 = 200;
    // Need to wait a bit to get a new block timestamp
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    await instance.connect(addr1).Put(lockTime2, { value: ethers.parseEther("0.5") });
    
    // Get updated timestamp
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const timeAfterPut2 = blockAfter!.timestamp;
    
    // Check unlockTime - in original it should be timeAfterPut2 + 200 (the longer lock)
    // In mutant it would still be currentTime + 100 (unchanged)
    holder = await instance.Acc(addr1.address);
    
    // The mutant would keep unlockTime at currentTime + 100
    // The original would update it to timeAfterPut2 + 200
    // We verify it's the longer time, which the mutant would fail
    expect(holder.unlockTime).to.equal(timeAfterPut2 + lockTime2);
    
    // Now try to Collect before the longer lock expires but after the shorter lock
    // This should revert in original (still locked) but succeed in mutant (unlocked prematurely)
    await ethers.provider.send("evm_increaseTime", [lockTime1 + 10]); // Just past first lock
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect - should revert because unlockTime was properly extended
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
    
    // Now fast forward past the longer lock time
    await ethers.provider.send("evm_increaseTime", [lockTime2 - lockTime1 - 5]);
    await ethers.provider.send("evm_mine", []);
    
    // This should now succeed in both original and mutant
    await instance.connect(addr1).Collect(ethers.parseEther("0.5"));
  });
});