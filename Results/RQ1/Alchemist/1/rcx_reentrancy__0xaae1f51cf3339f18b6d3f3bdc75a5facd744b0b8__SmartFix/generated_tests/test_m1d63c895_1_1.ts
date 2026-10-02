import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant m1d63c895 test", function () {
  it("should kill the mutant by having balance > MinSum and calling Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DEP_BANK (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy LogFile (needed for DEP_BANK to function)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Setup: Set MinSum and LogFile, then initialize
    await instance.connect(owner).SetMinSum(100);
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // Deposit 200 wei from addr1 (balance > MinSum)
    const depositAmount = ethers.parseEther("0.000000000000000200"); // 200 wei
    await instance.connect(addr1).Deposit({ value: depositAmount });
    
    // Verify balance is 200
    expect(await instance.balances(addr1.address)).to.equal(depositAmount);
    
    // Try to collect 150 wei - should succeed on original (200 >= 100 && 200 >= 150)
    // but fail on mutant (200 == 100 is false)
    const collectAmount = ethers.parseEther("0.000000000000000150"); // 150 wei
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});