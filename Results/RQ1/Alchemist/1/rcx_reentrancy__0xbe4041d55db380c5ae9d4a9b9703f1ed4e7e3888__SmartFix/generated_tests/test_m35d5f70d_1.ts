import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MONEY_BOX mutant detection test", function () {
  it("should detect mutant m35d5f70d where Collect condition is replaced with false", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by MONEY_BOX)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MONEY_BOX with Log address
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();
    
    // Setup: Set MinSum, set LogFile, initialize
    await (await moneyBox.SetMinSum(ethers.parseEther("0.1"))).wait();
    await (await moneyBox.SetLogFile(log.target)).wait();
    await (await moneyBox.Initialized()).wait();
    
    // User deposits 1 ETH with 1 second lock time
    const depositAmount = ethers.parseEther("1");
    await (await moneyBox.connect(user).Put(1, { value: depositAmount })).wait();
    
    // Wait for lock time to expire
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect 0.5 ETH (valid: balance >= MinSum && balance >= _am && time > unlockTime)
    const collectAmount = ethers.parseEther("0.5");
    
    // On original: should succeed; on mutant: will revert due to false condition
    await expect(
      moneyBox.connect(user).Collect(collectAmount)
    ).to.be.reverted;
    
    // Verify balance unchanged (mutant prevents withdrawal)
    const holder = await moneyBox.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
  });
});