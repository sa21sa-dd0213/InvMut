import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - m12591652", function () {
  it("should kill the mutant by performing a reentrancy attack that succeeds on mutant but fails on original", async function () {
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy attacker contract that can re-enter
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attacker = await AttackerFactory.deploy(await instance.getAddress());
    await attacker.waitForDeployment();

    // Fund the attacker contract with some ETH for deposit
    const [owner] = await ethers.getSigners();
    const depositAmount = ethers.parseEther("1.0");

    // Attacker deposits ETH into the DAO
    await owner.sendTransaction({
      to: await attacker.getAddress(),
      value: depositAmount
    });

    // Attacker calls deposit via the contract
    await attacker.connect(owner).deposit({ value: depositAmount });

    // Now attacker calls withdrawAll - on the mutant this will succeed and drain more than deposited
    // On the original with reentrancy lock, it will revert
    const tx = attacker.connect(owner).attack();

    // Expect the transaction to succeed on the mutant (multiple withdrawals possible)
    // On the original with the lock modifier, this would revert
    await expect(tx).to.not.be.reverted;

    // Verify that the attacker managed to withdraw more than deposited (reentrancy success)
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.be.lt(depositAmount);
  });
});

// Helper attacker contract for reentrancy testing
contract ReentrancyAttacker {
    ReentrancyDAO public target;

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
        if (address(target).balance >= msg.value) {
            target.withdrawAll();
        }
    }
}