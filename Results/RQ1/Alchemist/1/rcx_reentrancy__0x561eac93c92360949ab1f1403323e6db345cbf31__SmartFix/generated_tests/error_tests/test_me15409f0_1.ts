import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test", function () {
  it("should allow collecting a partial amount (less than full balance) on original but revert on mutant", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy contracts
    const BankFactory = await ethers.getContractFactory("BANK_SAFE");
    const LogFactory = await ethers.getContractFactory("LogFile");
    
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    const bankInstance = await BankFactory.deploy();
    await bankInstance.waitForDeployment();
    
    // Setup: Set MinSum and Log, then initialize
    await bankInstance.connect(owner).SetMinSum(0);
    await bankInstance.connect(owner).SetLogFile(await logInstance.getAddress());
    await bankInstance.connect(owner).Initialized();
    
    // Deposit 1 ether
    const depositAmount = ethers.parseEther("1.0");
    await bankInstance.connect(user).Deposit({ value: depositAmount });
    
    // Try to collect only 0.5 ether (partial amount)
    const collectAmount = ethers.parseEther("0.5");
    
    // This should revert on the mutant because balances[user] == 1 ether != 0.5 ether
    // On the original it would succeed because 1 ether >= 0.5 ether
    await expect(
      bankInstance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
    
    // Verify that the balance was NOT changed (mutant would revert, so balance stays)
    expect(await bankInstance.balances(user.getAddress())).to.equal(depositAmount);
  });
});