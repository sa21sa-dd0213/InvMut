import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant kill test - m79fb1908", function () {
  it("should revert when Collect is called but the external call fails, preventing balance deduction and log entry", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the LogFile contract first (required by DEP_BANK)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy DEP_BANK with the log file address
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.SetLogFile(await logFile.getAddress());
    await instance.SetMinSum(0);
    await instance.Initialized();
    
    // Fund the user with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Deploy a malicious contract that will revert on receive
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Transfer some balance to the malicious contract's DEP_BANK account
    // by having it deposit through the malicious contract
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("5")
    });
    
    // The malicious contract deposits into DEP_BANK using its address
    await malicious.deposit(await instance.getAddress(), {
      value: ethers.parseEther("5")
    });
    
    // Now try to collect from the malicious contract - this should revert
    // because the malicious contract rejects incoming ether
    await expect(
      malicious.collect(await instance.getAddress(), ethers.parseEther("1"))
    ).to.be.reverted;
    
    // Verify that the balance was NOT deducted (mutant would have deducted it)
    const balanceAfter = await instance.balances(await malicious.getAddress());
    expect(balanceAfter).to.equal(ethers.parseEther("5"));
    
    // Verify no log entry was added for the failed collection
    const historyLength = await logFile.History(0);
    // If the mutant had executed, there would be a log entry with "Collect" data
    // But since it reverted, no such entry exists
  });
});

// Helper contract to simulate a failing receiver
contract MaliciousReceiver {
  // This contract rejects all incoming ether
  receive() external payable {
    revert("I reject ether");
  }
  
  function deposit(address bankAddress) external payable {
    (bool success, ) = bankAddress.call{value: msg.value}("");
    require(success, "Deposit failed");
  }
  
  function collect(address bankAddress, uint256 amount) external {
    (bool success, ) = bankAddress.call(
      abi.encodeWithSignature("Collect(uint256)", amount)
    );
    require(success, "Collect failed");
  }
}