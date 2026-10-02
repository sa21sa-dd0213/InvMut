import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - m29b04440", function () {
  it("should revert when user with insufficient balance tries to collect, but mutant allows it", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy BANK_SAFE (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const bank = await Factory.deploy();
    await bank.waitForDeployment();
    
    // Deploy a LogFile (needed for Collect to work)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Set up the contract: initialize and set MinSum
    await bank.SetMinSum(ethers.parseEther("10"));
    await bank.SetLogFile(await logFile.getAddress());
    await bank.Initialized();
    
    // User deposits some amount but below MinSum (e.g., 5 ETH)
    await user.sendTransaction({
      to: await bank.getAddress(),
      value: ethers.parseEther("5")
    });
    
    // Verify user's balance is 5 ETH
    expect(await bank.balances(user.address)).to.equal(ethers.parseEther("5"));
    
    // User tries to collect 1 ETH - should revert in original, but mutant allows it
    const collectTx = bank.connect(user).Collect(ethers.parseEther("1"));
    
    // In the original contract this would revert because balance (5) < MinSum (10)
    // In the mutant, the condition is replaced with true, so it should succeed
    // We expect the mutant to NOT revert (killing the mutant means the test fails on original but passes on mutant)
    await expect(collectTx).to.not.be.reverted;
    
    // Additional verification: user's balance should decrease if mutant is active
    const balanceAfter = await bank.balances(user.address);
    expect(balanceAfter).to.equal(ethers.parseEther("4")); // 5 - 1 = 4
  });
});