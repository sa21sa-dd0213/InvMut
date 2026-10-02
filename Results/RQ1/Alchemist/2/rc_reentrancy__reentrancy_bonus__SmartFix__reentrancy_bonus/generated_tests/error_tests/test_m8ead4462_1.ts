import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Reentrancy_bonus mutant test - m8ead4462", function () {
  it("should detect reentrancy vulnerability when _nonReentrant modifier is removed", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrancy_bonus contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious contract that will perform reentrancy attack
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReentrancy");
    const malicious = await MaliciousFactory.deploy(instance.target);
    await malicious.waitForDeployment();
    
    // First, give the malicious contract some reward to withdraw
    // Call getFirstWithdrawalBonus to set reward for malicious contract
    await instance.connect(owner).getFirstWithdrawalBonus(malicious.target);
    
    // Get initial balance of the contract
    const initialContractBalance = await ethers.provider.getBalance(instance.target);
    
    // The malicious contract will call withdrawReward, which in the mutant
    // lacks reentrancy protection, allowing it to re-enter and drain funds
    await expect(malicious.connect(attacker).attack()).to.be.reverted;
    
    // In the original contract with _nonReentrant, the reentrancy would be prevented
    // In the mutant without the modifier, the attack would succeed
    // The test expects a revert, which would fail on the mutant (indicating it's killed)
  });
});

// Helper contract to simulate reentrancy attack
contract MaliciousReentrancy {
  address private target;
  
  constructor(address _target) {
    target = _target;
  }
  
  function attack() external {
    // Call withdrawReward on the target - in the mutant this can be re-entered
    (bool success, ) = target.call(abi.encodeWithSignature("withdrawReward(address)", address(this)));
    require(success, "Initial call failed");
  }
  
  // Fallback function to perform reentrancy
  receive() external payable {
    if (address(target).balance > 0) {
      // Attempt to re-enter withdrawReward - should fail in original, succeed in mutant
      (bool success, ) = target.call(abi.encodeWithSignature("withdrawReward(address)", address(this)));
      // In the mutant this will succeed, draining the contract
      require(success, "Reentrancy call failed");
    }
  }
}