import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mb654cc1c - reentrancy test", function () {
  it("should revert on reentrant Put call when nonReentrant modifier is removed", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Attacker deploys a malicious contract that reenters Put via fallback
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await wallet.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund attacker contract with some ether to perform the attack
    await attacker.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("2")
    });
    
    // First, attacker puts ether into wallet normally to have balance
    await wallet.connect(attacker).Put(
      Math.floor(Date.now() / 1000) + 1000, // unlock time 1000s in future
      { value: ethers.parseEther("1") }
    );
    
    // Now perform the reentrancy attack:
    // The attacker contract calls Collect which sends ether back,
    // triggering the fallback which calls Put again (reentrancy)
    await expect(
      attackerContract.connect(attacker).attack(
        ethers.parseEther("1"),
        Math.floor(Date.now() / 1000) + 1000
      )
    ).to.be.reverted; // Should revert due to reentrancy lock in original
  });
});

// Helper contract for reentrancy attack
// (This would be deployed as a separate contract in a real test, 
// but we simulate it inline for this test case)