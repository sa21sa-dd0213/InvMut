import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant detection - m8bd2fe50", function () {
  it("should revert Collect when ether transfer fails and not log the event", async function () {
    const [owner, user, attacker] = await ethers.getSigners();
    
    // Deploy BANK_SAFE
    const BankSafeFactory = await ethers.getContractFactory("BANK_SAFE");
    const bankSafe = await BankSafeFactory.deploy();
    await bankSafe.waitForDeployment();
    
    // Deploy LogFile
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Initialize the contract
    await bankSafe.connect(owner).SetMinSum(ethers.parseEther("1"));
    await bankSafe.connect(owner).SetLogFile(await logFile.getAddress());
    await bankSafe.connect(owner).Initialized();
    
    // Fund the user with sufficient balance
    await bankSafe.connect(user).Deposit({ value: ethers.parseEther("10") });
    
    // Deploy a contract that rejects ether
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Try to collect to the rejecting contract
    const collectAmount = ethers.parseEther("5");
    const tx = bankSafe.connect(user).Collect(collectAmount, { 
      value: 0,
      to: await rejector.getAddress()
    });
    
    // The transaction should revert because the ether transfer fails
    await expect(tx).to.be.reverted;
    
    // Verify user balance was NOT deducted (original contract behavior)
    expect(await bankSafe.balances(user.address)).to.equal(ethers.parseEther("10"));
    
    // Verify no Collect message was logged
    const historyLength = await logFile.History.length;
    expect(historyLength).to.equal(0);
  });
});

// Helper contract to reject ether
contract Rejector {
  receive() external payable {
    revert("I reject ether");
  }
}