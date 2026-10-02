import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mafba7e62 test", function () {
  it("should revert when Collect is called exactly at unlock time (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contracts
    const PENNY_BY_PENNYFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    const instance = await PENNY_BY_PENNYFactory.deploy();
    await instance.waitForDeployment();
    
    // Setup: set MinSum and Log, initialize
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // Deposit funds with lock time
    const depositAmount = ethers.parseEther("1");
    const lockTime = 100; // seconds
    
    const tx = await instance.connect(addr1).Put(lockTime, { value: depositAmount });
    await tx.wait();
    
    // Get the unlock time
    const acc = await instance.Acc(addr1.address);
    const unlockTime = acc.unlockTime;
    
    // Fast forward to exactly the unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(unlockTime)]);
    
    // Try to collect exactly at unlock time - should revert in original, pass in mutant
    const collectAmount = ethers.parseEther("0.5");
    
    // This will revert in original (block.timestamp > unlockTime is false)
    // but succeed in mutant (block.timestamp >= unlockTime is true)
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});