import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant detection - mf5c2240b", function () {
  it("should detect the mutant that subtracts 1 wei from deposit amount", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy DEP_BANK (no constructor arguments)
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy LogFile for logging
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Setup: set MinSum to 0 and initialize
    await instance.SetMinSum(0);
    await instance.SetLogFile(await logInstance.getAddress());
    await instance.Initialized();
    
    // Deposit exactly 1 wei
    const depositAmount = 1n; // 1 wei
    await instance.connect(user).Deposit({ value: depositAmount });
    
    // Try to collect the exact same amount (1 wei)
    // In the original: balance = 1, withdraw 1 succeeds
    // In the mutant: balance = 0 (1 - 1), withdraw 1 should fail
    const collectTx = instance.connect(user).Collect(depositAmount);
    
    // The mutant should revert because balance (0) < amount to collect (1)
    await expect(collectTx).to.be.reverted;
  });
});