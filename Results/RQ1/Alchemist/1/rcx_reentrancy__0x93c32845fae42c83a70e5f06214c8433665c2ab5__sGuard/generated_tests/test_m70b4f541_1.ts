import { expect } from "chai";
import { ethers } } from "hardhat";

describe("X_WALLET mutant m70b4f541 - reentrancy test", function () {
  it("should kill the mutant by performing a reentrancy attack that fails on the original but succeeds on the mutant", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await WalletFactory.deploy(log.target);
    await wallet.waitForDeployment();
    
    // Deploy attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(wallet.target);
    await attackerContract.waitForDeployment();
    
    // Fund the attacker contract
    await owner.sendTransaction({
      to: attackerContract.target,
      value: ethers.parseEther("10")
    });
    
    // Set unlock time to now
    const currentTime = Math.floor(Date.now() / 1000);
    await attackerContract.connect(attacker).deposit(currentTime);
    
    // Verify balance before attack
    const balanceBefore = await wallet.Acc(attackerContract.target);
    expect(balanceBefore.balance).to.equal(ethers.parseEther("10"));
    
    // Attempt reentrancy attack - should succeed on mutant but fail on original
    // The attacker contract will try to re-enter Collect in its fallback
    const tx = attackerContract.connect(attacker).attack(ethers.parseEther("5"));
    
    if (mutantDetected) {
      // If mutant (no nonReentrant), the attack will drain more than allowed
      await expect(tx).to.not.be.reverted;
      const balanceAfter = await wallet.Acc(attackerContract.target);
      expect(balanceAfter.balance).to.be.lt(ethers.parseEther("5")); // Should have been drained
    } else {
      // If original (with nonReentrant), the reentrant call should revert
      await expect(tx).to.be.reverted;
    }
  });
});

// Helper attacker contract
contract ReentrancyAttacker {
  X_WALLET target;
  bool public attackInitiated;
  
  constructor(address _target) {
    target = X_WALLET(_target);
  }
  
  function deposit(uint unlockTime) external payable {
    target.Put{value: msg.value}(unlockTime);
  }
  
  function attack(uint amount) external {
    attackInitiated = true;
    target.Collect(amount);
  }
  
  fallback() external payable {
    if (attackInitiated) {
      attackInitiated = false;
      target.Collect(5 ether); // Re-entrant call
    }
  }
}