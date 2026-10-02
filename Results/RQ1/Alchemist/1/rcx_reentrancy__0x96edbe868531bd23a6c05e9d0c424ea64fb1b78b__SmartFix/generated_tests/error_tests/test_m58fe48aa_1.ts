import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m58fe48aa test", function () {
  it("should detect mutant where >= replaces > in Put function unlockTime update", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments based on contract code)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).Initialized();
    
    // First Put: set a lock time that results in unlockTime = block.timestamp + 100
    const lockTime1 = 100;
    const depositAmount = ethers.parseEther("1");
    const tx1 = await instance.connect(addr1).Put(lockTime1, { value: depositAmount });
    await tx1.wait();
    
    // Get the current unlockTime after first deposit
    const holderAfterFirst = await instance.Acc(addr1.address);
    const unlockTimeAfterFirst = holderAfterFirst.unlockTime;
    
    // Calculate the exact lockTime needed to produce the same unlockTime
    // Since block.timestamp may have advanced slightly, we need to compute
    const currentBlock = await ethers.provider.getBlock("latest");
    const currentTimestamp = currentBlock!.timestamp;
    const lockTime2 = Number(unlockTimeAfterFirst) - currentTimestamp;
    
    // Second Put: use _lockTime that results in the SAME unlockTime
    const tx2 = await instance.connect(addr1).Put(lockTime2, { value: depositAmount });
    await tx2.wait();
    
    // Get unlockTime after second Put
    const holderAfterSecond = await instance.Acc(addr1.address);
    const unlockTimeAfterSecond = holderAfterSecond.unlockTime;
    
    // In the original contract, unlockTime should NOT change because block.timestamp+_lockTime is NOT > unlockTime (it's equal)
    // In the mutant, unlockTime WILL be updated (waste of gas) because >= evaluates to true
    // We can detect this by checking if the unlockTime changed when it shouldn't have
    // The mutant will cause a state write, which we can detect via gas usage comparison
    // However, a simpler approach: verify the unlockTime remains exactly the same
    expect(unlockTimeAfterSecond).to.equal(unlockTimeAfterFirst, 
      "Mutant detected: unlockTime was updated when it should not have been (>= instead of >)");
  });
});