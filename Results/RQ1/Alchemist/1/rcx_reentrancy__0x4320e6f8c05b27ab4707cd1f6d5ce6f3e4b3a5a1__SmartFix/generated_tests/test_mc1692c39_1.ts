import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT - kill mutant mc1692c39", function () {
  it("should detect the mutant where deposit credits msg.value-1 instead of msg.value", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy LogFile first (required by ACCURAL_DEPOSIT constructor)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy ACCURAL_DEPOSIT with the LogFile address
    const AccuralFactory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const accural = await AccuralFactory.deploy(logFile.target);
    await accural.waitForDeployment();
    
    // Initialize the contract (required before deposits work properly with SetMinSum etc.)
    await accural.connect(owner).Initialized();
    
    // Set MinSum to 0 so we can collect any amount
    await accural.connect(owner).SetMinSum(0);
    
    // Deposit exactly 1 wei
    const depositAmount = 1n;
    const tx = await accural.connect(depositor).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Check balance - original would be 1, mutant would be 0 (msg.value - 1)
    const balance = await accural.balances(depositor.address);
    
    // The mutant will have balance = 0, so this assertion kills it
    expect(balance).to.equal(depositAmount);
    
    // Additional check: try to collect the deposited amount
    // In original this succeeds, in mutant it fails because balance is 0
    const collectTx = accural.connect(depositor).Collect(depositAmount);
    await expect(collectTx).to.not.be.reverted;
  });
});