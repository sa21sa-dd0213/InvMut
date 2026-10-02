import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant detection", function () {
  it("should kill mutant m98237659 by verifying logged value matches actual deposit amount", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy the LogFile contract first (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy ACCURAL_DEPOSIT - no constructor arguments
    const AccuralFactory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const accural = await AccuralFactory.deploy();
    await accural.waitForDeployment();
    
    // Set the LogFile address
    await accural.connect(owner).SetLogFile(await logFile.getAddress());
    
    // Initialize the contract (set intitalized = true)
    await accural.connect(owner).Initialized();
    
    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1");
    await accural.connect(depositor).Deposit({ value: depositAmount });
    
    // Get the last log entry from History array (index 0)
    const lastLog = await logFile.History(0);
    
    // The logged Val should equal the deposit amount (1 ether)
    // Mutant logs msg.value+1, so it would be 1 ether + 1 wei
    expect(lastLog.Val).to.equal(depositAmount);
  });
});