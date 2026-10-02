import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant m16a8f199 detection test", function () {
  it("should detect the off-by-one error in Log.AddMessage for Deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile contract first (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy DEP_BANK (no constructor arguments)
    const DEP_BANKFactory = await ethers.getContractFactory("DEP_BANK");
    const depBank = await DEP_BANKFactory.deploy();
    await depBank.waitForDeployment();
    
    // Set the log file address in DEP_BANK
    await depBank.connect(owner).SetLogFile(await logFile.getAddress());
    
    // Initialize the contract
    await depBank.connect(owner).Initialized();
    
    // Deposit exactly 1 ether from addr1
    const depositAmount = ethers.parseEther("1");
    await depBank.connect(addr1).Deposit({ value: depositAmount });
    
    // Check the recorded value in the LogFile's History
    const historyLength = await logFile.History.length;
    expect(historyLength).to.equal(1);
    
    const lastMessage = await logFile.History(0);
    
    // In the original contract, this would equal depositAmount
    // In the mutant, this would be depositAmount - 1, causing the assertion to fail
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});