import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant kill test - m77da2060", function () {
  it("should kill mutant that replaces subtraction with division in Collect", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor args needed based on contract code)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy ACCURAL_DEPOSIT (no constructor args, but needs Log address set)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set the LogFile address (callable before initialization)
    await instance.SetLogFile(await logFile.getAddress());
    
    // Initialize the contract
    await instance.Initialized();
    
    // Set MinSum to a low value so Collect can be called
    await instance.SetMinSum(ethers.parseEther("0.1"));
    
    // User deposits 10 ether
    const depositAmount = ethers.parseEther("10");
    await instance.connect(user).Deposit({ value: depositAmount });
    
    // Verify initial balance
    expect(await instance.balances(user.address)).to.equal(depositAmount);
    
    // User calls Collect with their full balance (10 ether)
    // In original: balance becomes 0 (10 - 10 = 0)
    // In mutant: balance becomes 1 (10 / 10 = 1) - this should fail the test
    await instance.connect(user).Collect(depositAmount);
    
    // Assert that the balance is ZERO after collecting full amount
    // This will pass on original but fail on mutant (mutant leaves 1 wei due to division)
    expect(await instance.balances(user.address)).to.equal(0);
  });
});