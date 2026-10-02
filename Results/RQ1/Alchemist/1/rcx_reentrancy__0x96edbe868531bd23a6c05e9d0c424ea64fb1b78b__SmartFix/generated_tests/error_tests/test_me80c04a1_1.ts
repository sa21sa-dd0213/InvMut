import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant test - me80c04a1", function () {
  it("should detect reversed comparison operator in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).Initialized();
    
    // First deposit: short lock time (100 seconds)
    const shortLockTime = 100;
    const deposit1 = ethers.parseEther("1");
    await instance.connect(addr1).Put(shortLockTime, { value: deposit1 });
    
    // Get the unlock time after first deposit
    let holderInfo = await instance.Acc(addr1.address);
    const unlockTimeAfterFirstDeposit = holderInfo.unlockTime;
    
    // Second deposit: longer lock time (200 seconds) - should extend unlock time
    const longLockTime = 200;
    const deposit2 = ethers.parseEther("1");
    await instance.connect(addr1).Put(longLockTime, { value: deposit2 });
    
    // Get the unlock time after second deposit
    holderInfo = await instance.Acc(addr1.address);
    const unlockTimeAfterSecondDeposit = holderInfo.unlockTime;
    
    // In the original contract, the unlock time should be extended
    // In the mutant, the unlock time would NOT be extended (stays at first deposit's unlock time)
    const expectedUnlockTime = BigInt(await ethers.provider.getBlock("latest").then(b => b!.timestamp)) + BigInt(longLockTime);
    
    // If mutant is active, unlock time would be shorter (from first deposit only)
    // Wait until after first unlock time but before second unlock time
    const shortUnlockTime = BigInt(await ethers.provider.getBlock("latest").then(b => b!.timestamp)) + BigInt(shortLockTime);
    
    // Mine blocks to advance time past the short lock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(shortUnlockTime) + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect - should succeed in mutant (unlock time not extended)
    // Should fail in original (unlock time was extended)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
    
    // Now advance time past the long lock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(expectedUnlockTime) + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Now collection should succeed in both versions
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.not.be.reverted;
  });
});