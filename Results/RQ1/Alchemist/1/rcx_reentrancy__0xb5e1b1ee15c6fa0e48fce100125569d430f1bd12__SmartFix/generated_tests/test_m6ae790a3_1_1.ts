import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant test - m6ae790a3", function () {
  it("should kill the mutant by withdrawing partial amount when full balance is available", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy Private_Bank with the Log contract address
    const Factory = await ethers.getContractFactory("Private_Bank");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Deposit 2 ether (above MinDeposit of 1 ether)
    const depositAmount = ethers.parseEther("2");
    await instance.connect(addr1).Deposit({ value: depositAmount });
    
    // Attempt to withdraw only 1 ether (partial withdrawal)
    const withdrawAmount = ethers.parseEther("1");
    
    // In the mutant, this should revert because _am (1 ether) != balances[addr1] (2 ether)
    // In the original, this would succeed
    await expect(
      instance.connect(addr1).CashOut(withdrawAmount)
    ).to.be.reverted;
  });
});