import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - m0d972d67", function () {
  it("should detect mutant that always sets _veri_ok to false by verifying LogFile history after successful Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy BANK_SAFE with constructor args: LogFile address
    const BankSafeFactory = await ethers.getContractFactory("BANK_SAFE");
    const bankSafe = await BankSafeFactory.deploy();
    await bankSafe.waitForDeployment();
    
    // Initialize the contract and set required parameters
    await bankSafe.SetMinSum(ethers.parseEther("1"));
    await bankSafe.SetLogFile(await logFile.getAddress());
    await bankSafe.Initialized();
    
    // Fund addr1 with sufficient balance
    await owner.sendTransaction({
      to: await bankSafe.getAddress(),
      value: ethers.parseEther("5")
    });
    
    // Transfer balance to addr1 via Deposit
    await bankSafe.connect(addr1).Deposit({ value: ethers.parseEther("3") });
    
    // Verify addr1 has sufficient balance
    expect(await bankSafe.balances(addr1.address)).to.equal(ethers.parseEther("3"));
    
    // Collect funds - this should succeed as balance >= MinSum (1 ETH) and amount (2 ETH)
    const collectAmount = ethers.parseEther("2");
    await bankSafe.connect(addr1).Collect(collectAmount);
    
    // Check that the LogFile's History array has the "Collect" message
    // In original, the push would happen; in mutant, it won't
    const historyLength = await logFile.History.length();
    
    // If mutant is active, history length will be 0 (no "Collect" message added)
    // If original, history length will be >= 1
    expect(historyLength).to.be.at.least(1);
    
    // Verify the last message in history is the Collect message
    const lastMessage = await logFile.History(historyLength - 1n);
    expect(lastMessage.Sender).to.equal(addr1.address);
    expect(lastMessage.Val).to.equal(collectAmount);
    expect(lastMessage.Data).to.equal("Collect");
  });
});