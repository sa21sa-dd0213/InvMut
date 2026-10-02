import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant detection - m320e110a", function () {
  it("should kill mutant by depositing amount greater than MinDeposit and verifying balance", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy PrivateBank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bankInstance = await PrivateBankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Get the MinDeposit value (1 ether)
    const minDeposit = await bankInstance.MinDeposit();
    
    // Create a deposit amount that is greater than MinDeposit (e.g., 2 ether)
    const depositAmount = ethers.parseEther("2");
    
    // Deposit from depositor address
    await bankInstance.connect(depositor).Deposit({ value: depositAmount });
    
    // Check the balance - original contract should accept > MinDeposit
    // Mutant rejects because msg.value == MinDeposit is false for 2 ether
    const balance = await bankInstance.balances(depositor.address);
    expect(balance).to.equal(depositAmount);
  });
});