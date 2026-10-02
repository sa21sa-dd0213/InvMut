import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m9b0c6304 - reentrancy guard removed from addToBalance", function () {
  it("should revert on reentrancy attack when nonReentrant modifier is present, but fail (not revert) when modifier is removed", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the attacker with some ETH for the attack
    const attackValue = ethers.parseEther("1.0");
    
    // Deploy a malicious contract that will perform the reentrancy attack
    const MaliciousFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await MaliciousFactory.deploy(contractAddress);
    await attackerContract.waitForDeployment();

    // First, fund the attacker contract on the Reentrance contract
    const fundTx = await attackerContract.connect(attacker).fund({ value: attackValue });
    await fundTx.wait();

    // Verify initial balance
    const initialBalance = await instance.getBalance(await attackerContract.getAddress());
    expect(initialBalance).to.equal(attackValue);

    // Now perform the reentrancy attack
    // The withdrawBalance function will call msg.sender.call, which triggers the fallback
    // In the fallback, the attacker contract tries to call addToBalance again
    // With the original nonReentrant modifier, this would revert
    // With the mutant (modifier removed), it should succeed, allowing double withdrawal
    
    const attackTx = attackerContract.connect(attacker).attack({ gasLimit: 3000000 });
    
    // The mutant allows the reentrancy, so the transaction should NOT revert
    // (unlike the original which would revert)
    await expect(attackTx).to.not.be.reverted;

    // After successful reentrancy, the attacker's balance in Reentrance should be manipulated
    const finalBalance = await instance.getBalance(await attackerContract.getAddress());
    
    // With the mutant, the attacker was able to call addToBalance during withdrawal
    // This means the balance was set to 0 but then increased again by the reentrant addToBalance call
    // The actual value depends on the attack logic, but it should NOT be 0 as expected
    expect(finalBalance).to.not.equal(0);
  });
});

// Helper contract to perform the reentrancy attack
contract ReentrancyAttacker {
    Reentrance public target;
    uint256 public attackValue;
    
    constructor(address _target) {
        target = Reentrance(_target);
    }
    
    function fund() external payable {
        target.addToBalance{value: msg.value}();
    }
    
    function attack() external {
        attackValue = target.getBalance(address(this));
        target.withdrawBalance();
    }
    
    fallback() external payable {
        if (address(target).balance >= attackValue) {
            // Re-enter by calling addToBalance - this should revert with the modifier
            // but succeed without it
            target.addToBalance{value: 0}();
            // Try to withdraw again
            target.withdrawBalance();
        }
    }
}