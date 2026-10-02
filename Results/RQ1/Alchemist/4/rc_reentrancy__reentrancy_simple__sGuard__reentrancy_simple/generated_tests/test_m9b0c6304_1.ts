import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m9b0c6304 - reentrancy guard removal in addToBalance", function () {
  it("should detect reentrancy when addToBalance is called during withdrawBalance", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy the attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await instance.getAddress());
    await attackerContract.waitForDeployment();
    
    // Fund the attacker contract with 1 ether
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Attacker contract deposits 0.5 ether into Reentrance
    const depositAmount = ethers.parseEther("0.5");
    await attackerContract.connect(attacker).deposit({ value: depositAmount });
    
    // Verify initial balance
    expect(await instance.getBalance(await attackerContract.getAddress())).to.equal(depositAmount);
    
    // Now call attack - this should trigger reentrancy on the mutant
    // On the original (with guard), it would revert
    // On the mutant (without guard), it might succeed and drain funds
    const attackTx = attackerContract.connect(attacker).attack();
    
    // If the original guard were present, this would revert
    // The mutant allows the reentrancy, so the balance should be manipulated
    await expect(attackTx).to.changeEtherBalance(
      attackerContract,
      depositAmount * 2n, // attacker should get original deposit + reentered amount
      { includeTransaction: true }
    );
  });
});

// Attacker contract for reentrancy test
contract ReentrancyAttacker {
  Reentrance public target;
  uint256 public depositAmount;
  
  constructor(address _target) {
    target = Reentrance(_target);
  }
  
  function deposit() external payable {
    depositAmount = msg.value;
    target.addToBalance{value: msg.value}();
  }
  
  function attack() external {
    target.withdrawBalance();
  }
  
  receive() external payable {
    if (address(target).balance >= depositAmount) {
      target.addToBalance{value: depositAmount}();
    }
  }
}