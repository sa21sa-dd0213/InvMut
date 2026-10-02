import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant mfb5bda29 test", function () {
  it("should detect the mutant by failing when withdrawing less than full balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy DEP_BANK (no constructor arguments)
    const BankFactory = await ethers.getContractFactory("DEP_BANK");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Set up the bank contract
    await bank.SetLogFile(await logFile.getAddress());
    await bank.SetMinSum(0);
    await bank.Initialized();
    
    // Deposit 100 wei from addr1
    const depositAmount = ethers.parseEther("100");
    await bank.connect(addr1).Deposit({ value: depositAmount });
    
    // Verify balance is 100 wei
    expect(await bank.balances(addr1.address)).to.equal(depositAmount);
    
    // Attempt to collect only 50 wei (less than full balance)
    const withdrawAmount = ethers.parseEther("50");
    
    // This should succeed on original but fail on mutant (which requires exact balance match)
    await expect(
      bank.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});