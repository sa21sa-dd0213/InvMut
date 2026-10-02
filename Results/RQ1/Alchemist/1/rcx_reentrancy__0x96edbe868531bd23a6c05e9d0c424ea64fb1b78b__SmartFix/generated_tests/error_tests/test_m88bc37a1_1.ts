import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PENNY_BY_PENNY mutant m88bc37a1", function () {
  it("should kill mutant by proving block.prevrandao cannot replace block.timestamp for time-based unlock", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy PENNY_BY_PENNY (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy LogFile (required for Log.AddMessage calls)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize contract: set MinSum to 0, set LogFile, and call Initialized
    await (await instance.SetMinSum(0)).wait();
    await (await instance.SetLogFile(await logInstance.getAddress())).wait();
    await (await instance.Initialized()).wait();
    
    // Set lock time to 1 hour (3600 seconds) in the future
    const lockTime = 3600;
    const depositAmount = ethers.parseEther("1");
    
    // addr1 deposits 1 ETH with lock time
    await (await instance.connect(addr1).Put(lockTime, { value: depositAmount })).wait();
    
    // Fast forward time by 2 hours (7200 seconds) to ensure unlock time has passed
    await ethers.provider.send("evm_increaseTime", [7200]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect - on original this would succeed because block.timestamp > unlockTime
    // On mutant this will likely revert because block.prevrandao is not time-based
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted; // Mutant fails because prevrandao isn't guaranteed > unlockTime
    
    // Verify balance unchanged (collection failed)
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
  });
});