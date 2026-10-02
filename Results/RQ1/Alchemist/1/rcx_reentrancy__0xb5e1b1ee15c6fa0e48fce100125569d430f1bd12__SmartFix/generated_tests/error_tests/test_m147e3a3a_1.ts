import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant m147e3a3a test", function () {
  it("should revert when depositing with non-zero value due to arithmetic mutation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy Private_Bank with Log contract address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const MinDeposit = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    
    // Attempt to deposit from addr1 with amount > MinDeposit
    // In the mutant, the require condition (balance - msg.value >= balance) will fail for any positive msg.value
    await expect(
      bank.connect(addr1).Deposit({ value: depositAmount })
    ).to.be.reverted;
  });
});