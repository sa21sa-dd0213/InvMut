import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test - m08f13442", function () {
  it("should revert when user balance is below MinSum but above _am and unlockTime passed (original behavior)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy contracts
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Set MinSum, Log, and initialize
    await instance.connect(owner).SetMinSum(ethers.parseEther("10"));
    await instance.connect(owner).SetLogFile(await log.getAddress());
    await instance.connect(owner).Initialized();
    
    // User deposits 5 ether (below MinSum of 10)
    const depositAmount = ethers.parseEther("5");
    await instance.connect(user).Put(0, { value: depositAmount });
    
    // Fast forward past unlock time (unlockTime = 0 + block.timestamp, so just advance)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect 5 ether - should revert in original because balance (5) < MinSum (10)
    // Mutant would incorrectly allow this because || makes balance>=MinSum optional
    await expect(
      instance.connect(user).Collect(ethers.parseEther("5"))
    ).to.be.reverted;
  });
});