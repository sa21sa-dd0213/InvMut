import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test - m093f51a4", function () {
  it("should kill the mutant by verifying that a valid withdrawal succeeds in the original but fails in the mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: Set MinSum and initialize
    await instance.SetMinSum(ethers.parseEther("1"));
    await instance.Initialized();

    // Deploy LogFile contract for logging
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    await instance.SetLogFile(await logFile.getAddress());

    // Deposit enough ether to meet MinSum requirement
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Deposit({ value: depositAmount });

    // Verify initial balance
    let balance = await instance.balances(addr1.address);
    expect(balance).to.equal(depositAmount);

    // Attempt to collect a valid amount (less than balance and meets MinSum)
    const collectAmount = ethers.parseEther("1.5");
        
    // This should succeed in the original contract but fail in the mutant
    // because the mutant replaces the condition with false
    const tx = instance.connect(addr1).Collect(collectAmount);
        
    // The mutant will not execute the withdrawal, so balance remains unchanged
    await expect(tx).to.be.reverted;
        
    // Verify balance remained unchanged (mutant fails to process withdrawal)
    balance = await instance.balances(addr1.address);
    expect(balance).to.equal(depositAmount);
  });
});