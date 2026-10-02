import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m09c3fa55 test", function () {
  it("should revert when balance equals withdrawal amount (mutant uses > instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy MONEY_BOX - no constructor arguments needed
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy Log contract (required for Put to work)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Set up the contract
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).Initialized();
    
    // Deposit exactly 1 ether with a short lock time
    const depositAmount = ethers.parseEther("1");
    const lockTime = 1; // 1 second lock
    await instance.connect(addr1).Put(lockTime, { value: depositAmount });
    
    // Wait for lock time to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect exactly the deposited amount
    // The original contract allows this (balance >= _am), but mutant requires balance > _am
    const collectTx = instance.connect(addr1).Collect(depositAmount);
    
    // In the mutant, this should revert because balance (1 ether) is not > _am (1 ether)
    // In the original, this would succeed
    await expect(collectTx).to.be.reverted;
  });
});