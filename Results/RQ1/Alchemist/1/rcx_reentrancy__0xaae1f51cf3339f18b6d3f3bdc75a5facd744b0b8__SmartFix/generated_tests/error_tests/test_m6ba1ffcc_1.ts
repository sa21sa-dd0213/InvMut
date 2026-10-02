import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant test - m6ba1ffcc", function () {
  it("should revert when balance >= MinSum but balance < _am in original (&&), but mutant with || would allow it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (required by DEP_BANK)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy DEP_BANK with log file address as constructor argument
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy(logFile.target);
    await instance.waitForDeployment();
    
    // Set MinSum to 1 ether
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    
    // Initialize the contract
    await instance.connect(owner).Initialized();
    
    // addr1 deposits exactly 1 ether (meets MinSum but not more)
    await instance.connect(addr1).Deposit({ value: ethers.parseEther("1") });
    
    // addr1 tries to collect 2 ether (balance = 1, MinSum = 1, _am = 2)
    // Original: balance >= MinSum (1>=1 true) && balance >= _am (1>=2 false) => false => revert
    // Mutant: balance >= MinSum (1>=1 true) || balance >= _am (1>=2 false) => true => would NOT revert (BUG)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("2"))
    ).to.be.reverted;
  });
});