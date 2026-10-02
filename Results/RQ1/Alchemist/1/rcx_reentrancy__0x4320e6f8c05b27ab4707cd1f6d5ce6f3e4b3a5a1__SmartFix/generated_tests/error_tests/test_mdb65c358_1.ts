import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant detection - mdb65c358", function () {
  it("should detect the mutant by verifying LogFile records correct deposit amount", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy ACCURAL_DEPOSIT with LogFile address
    const AccuralFactory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const accural = await AccuralFactory.deploy();
    await accural.waitForDeployment();
    
    // Set the LogFile address in ACCURAL_DEPOSIT
    await accural.SetLogFile(await logFile.getAddress());
    
    // Initialize the contract (lock settings)
    await accural.Initialized();
    
    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1");
    const tx = await accural.connect(depositor).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Get the last message from LogFile history
    const historyLength = await logFile.History.length;
    const lastMessage = await logFile.History(historyLength - 1n);
    
    // The logged value should equal the deposit amount (1 ether)
    // Mutant logs msg.value-1, so it would log 1 ether - 1 wei
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});