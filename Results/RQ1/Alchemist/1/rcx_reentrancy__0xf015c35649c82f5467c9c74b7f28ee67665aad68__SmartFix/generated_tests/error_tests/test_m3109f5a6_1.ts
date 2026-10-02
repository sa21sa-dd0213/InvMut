import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m3109f5a6 test", function () {
  it("should revert when trying to collect before unlock time with balance >= MinSum (original) but succeed in mutant due to || operator", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    const bankAddress = await bankInstance.getAddress();
    
    // addr1 deposits exactly 1 ether (MinSum) with a future unlock time
    const futureUnlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in the future
    await bankInstance.connect(addr1).Put(futureUnlockTime, { value: ethers.parseEther("1") });
    
    // Attempt to collect 0.5 ether before the unlock time has passed
    // In the original: should revert because block.timestamp > acc.unlockTime is false
    // In the mutant: should succeed because acc.balance >= MinSum (1 ether) is true (first condition of ||)
    await expect(
      bankInstance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted; // This will pass on original, fail on mutant (killing it)
  });
});