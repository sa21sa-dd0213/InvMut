import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ACCURAL_DEPOSIT mutant kill test", function () {
  it("should kill mutant md8d6a65e by verifying balance decreases on Collect", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (required by ACCURAL_DEPOSIT)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy ACCURAL_DEPOSIT with LogFile address
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set LogFile address and initialize
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // Set MinSum to 0 for easy testing
    await instance.connect(owner).SetMinSum(0);
    
    // Deposit 2 ether from user
    const depositAmount = ethers.parseEther("2");
    await instance.connect(user).Deposit({ value: depositAmount });
    
    // Check balance after deposit
    let balance = await instance.balances(user.address);
    expect(balance).to.equal(depositAmount);
    
    // Collect 1 ether
    const collectAmount = ethers.parseEther("1");
    const tx = await instance.connect(user).Collect(collectAmount, { gasLimit: 1000000 });
    await tx.wait();
    
    // In the original contract, balance should be 1 ether (2 - 1)
    // In the mutant, balance would be 3 ether (2 + 1) - this will kill the mutant
    balance = await instance.balances(user.address);
    expect(balance).to.equal(ethers.parseEther("1"));
  });
});