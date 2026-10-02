import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Private_Bank - Kill mutant m9f98cc6b", function () {
  it("should detect mutant that changed > to < in Deposit condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by Private_Bank constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    // Deploy Private_Bank with Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const privateBank = await PrivateBankFactory.deploy(logContract.target);
    await privateBank.waitForDeployment();
    
    // Send a deposit greater than MinDeposit (1 ether)
    const depositAmount = ethers.parseEther("2");
    
    // Record initial balance
    const initialBalance = await privateBank.balances(addr1.address);
    
    // Execute deposit from addr1
    const tx = await privateBank.connect(addr1).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Check that balance increased (original contract would accept deposit)
    const finalBalance = await privateBank.balances(addr1.address);
    
    // This assertion will fail on the mutant because the deposit was not processed
    // (mutant requires msg.value < MinDeposit, which is false for 2 ether)
    expect(finalBalance).to.equal(initialBalance + depositAmount);
  });
});