import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant detection - Deposit threshold", function () {
  it("should detect mutant by depositing exactly MinDeposit + 1 wei", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy Private_Bank with Log address
    const Factory = await ethers.getContractFactory("Private_Bank");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Get MinDeposit value
    const minDeposit = await instance.MinDeposit();
    
    // Calculate deposit amount = MinDeposit + 1 wei
    const depositAmount = minDeposit + 1n;
    
    // Get initial balance of addr1
    const initialBalance = await instance.balances(addr1.address);
    
    // Attempt deposit - should succeed on original but fail on mutant
    // because mutant requires msg.value - 1 > MinDeposit (i.e., msg.value > MinDeposit + 1)
    await expect(
      instance.connect(addr1).Deposit({ value: depositAmount })
    ).to.be.reverted;
    
    // Verify balance was NOT updated (confirming revert)
    const finalBalance = await instance.balances(addr1.address);
    expect(finalBalance).to.equal(initialBalance);
  });
});