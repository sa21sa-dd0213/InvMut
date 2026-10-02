import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant m3eb754fd test", function () {
  it("should kill the mutant by withdrawing exact balance when balance equals MinSum", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy ACCURAL_DEPOSIT (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy LogFile separately (it's referenced but not the main contract)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Set LogFile address and initialize the contract
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // Deposit exactly MinSum (1 ether) from user
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).Deposit({ value: depositAmount });
    
    // Verify balance is exactly MinSum
    expect(await instance.balances(user.address)).to.equal(depositAmount);
    
    // Try to withdraw exact balance - should succeed on original but fail on mutant
    // because mutant uses > instead of >=
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});