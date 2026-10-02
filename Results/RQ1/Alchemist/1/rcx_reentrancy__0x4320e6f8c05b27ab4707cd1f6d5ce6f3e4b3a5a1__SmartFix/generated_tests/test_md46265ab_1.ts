import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant kill test", function () {
  it("should revert when user with insufficient balance tries to Collect", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor arguments needed)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy ACCURAL_DEPOSIT (no constructor arguments)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set the LogFile address (required for Deposit/Collect to work)
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    
    // Initialize the contract (set intitalized to true, so SetMinSum can't be called again)
    await instance.connect(owner).Initialized();
    
    // Set MinSum to 1 ether (default value)
    // No need to call SetMinSum since MinSum is already 1 ether
    
    // User deposits less than MinSum (e.g., 0.5 ether)
    const depositAmount = ethers.parseEther("0.5");
    await instance.connect(user).Deposit({ value: depositAmount });
    
    // Verify user balance is less than MinSum and less than withdrawal amount
    const userBalance = await instance.balances(user.address);
    expect(userBalance).to.equal(depositAmount);
    
    // Try to Collect more than balance and less than MinSum - should revert in original
    const withdrawAmount = ethers.parseEther("0.6");
    await expect(
      instance.connect(user).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});