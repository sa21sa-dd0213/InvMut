import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant detection - m530578fb", function () {
  it("should detect mutant that removes overflow require statement in Deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first since ACCURAL_DEPOSIT references it
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy ACCURAL_DEPOSIT with LogFile address as constructor argument
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy(logFile.target);
    await instance.waitForDeployment();
    
    // Initialize the contract (required before deposits can work properly)
    const initTx = await instance.connect(owner).Initialized();
    await initTx.wait();
    
    // First deposit a small amount to addr1's balance
    const smallDeposit = ethers.parseEther("1");
    const depositTx = await instance.connect(addr1).Deposit({ value: smallDeposit });
    await depositTx.wait();
    
    // Get the current balance of addr1
    const currentBalance = await instance.balances(addr1.address);
    
    // Calculate a value that would cause overflow when added to currentBalance
    // We want: currentBalance + msg.value to overflow uint256
    // So: msg.value = type(uint256).max - currentBalance + 1
    const maxUint256 = ethers.MaxUint256;
    const overflowValue = maxUint256 - currentBalance + BigInt(1);
    
    // Try to deposit the overflowValue - this should revert in the original
    // due to the require statement, but might succeed in the mutant
    await expect(
      instance.connect(addr1).Deposit({ value: overflowValue })
    ).to.be.reverted;
    
    // Additional check: the balance should NOT have changed (revert protected the state)
    const balanceAfter = await instance.balances(addr1.address);
    expect(balanceAfter).to.equal(currentBalance);
  });
});