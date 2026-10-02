import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MONEY_BOX mutant m0d3a54e7 - reentrancy test", function () {
  it("should detect missing nonReentrant_ modifier on Collect", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the MONEY_BOX contract
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();
    
    // Deploy the Log contract (required for MONEY_BOX to function)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Initialize the MONEY_BOX
    await moneyBox.SetLogFile(await log.getAddress());
    await moneyBox.SetMinSum(ethers.parseEther("1"));
    await moneyBox.Initialized();
    
    // Deploy a malicious reentrancy contract
    const ReentrancyAttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await ReentrancyAttackerFactory.deploy(await moneyBox.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund the attacker contract with enough ETH
    await attacker.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("5")
    });
    
    // Attacker contract puts money into MONEY_BOX via Put
    await attackerContract.connect(attacker).attackPut(1, { value: ethers.parseEther("2") });
    
    // Set unlock time to 0 so Collect can be called immediately
    // (In a real attack, attacker would wait, but for test we manipulate time)
    await ethers.provider.send("evm_increaseTime", [3600]); // Add 1 hour
    await ethers.provider.send("evm_mine");
    
    // Attacker attempts to collect with reentrancy
    // This should revert on original (with guard) but succeed on mutant (without guard)
    const tx = attackerContract.connect(attacker).attackCollect(ethers.parseEther("1"));
    
    // For the mutant, this transaction will NOT revert (reentrancy succeeds)
    // For the original, it would revert. Since we are testing the mutant,
    // we expect the transaction to succeed (no revert)
    await expect(tx).to.not.be.reverted;
    
    // Additional assertion: attacker should have drained more than allowed
    const attackerBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    expect(attackerBalance).to.be.gt(ethers.parseEther("4")); // Started with 5, should have drained extra
  });
});

// Reentrancy attacker contract to be deployed
// Note: This contract must be compiled and deployed in the test
// It's defined here as a Solidity contract that will be compiled by Hardhat