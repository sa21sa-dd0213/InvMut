import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE - Kill mutant mb77b746b (>= changed to > in Collect)", function () {
  it("should revert when withdrawing exact balance amount on mutant but succeed on original", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy BANK_SAFE (no constructor args)
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: Set MinSum to 0, set LogFile, and initialize
    await instance.SetMinSum(0);
    await instance.SetLogFile(await logFile.getAddress());
    await instance.Initialized();
    
    // Deposit exactly 1 ether from user
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(user).Deposit({ value: depositAmount });
    
    // Verify balance is exactly 1 ether
    expect(await instance.balances(user.address)).to.equal(depositAmount);
    
    // Attempt to withdraw exactly the balance amount (1 ether)
    // Original: should succeed because balances[user] >= _am (1 >= 1)
    // Mutant: should revert because balances[user] > _am is false (1 > 1 is false)
    await expect(
      instance.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});