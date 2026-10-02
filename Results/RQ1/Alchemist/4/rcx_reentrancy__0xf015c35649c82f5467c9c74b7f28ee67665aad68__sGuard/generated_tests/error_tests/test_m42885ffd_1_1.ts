import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m42885ffd - reentrancy guard removal", function () {
  it("should detect reentrancy vulnerability when nonReentrant modifier is removed from Collect", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await bank.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the attacker contract so it can call Put
    await owner.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("10")
    });

    // Set MinSum to a small amount for testing
    // Note: MinSum is 1 ether by default, we need to deposit enough

    // Attacker deposits 2 ether into bank via Put (with unlock time in past)
    const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    await attackerContract.connect(attacker).deposit(pastTime, { value: ethers.parseEther("2") });

    // Verify balance
    const balance = await bank.Acc(await attackerContract.getAddress());
    expect(balance.balance).to.equal(ethers.parseEther("2"));

    // Trigger the attack - Collect should revert in original but might succeed in mutant
    // The attacker contract's receive function will try to call Collect again
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("1"))
    ).to.be.reverted; // This will pass on original (reentrancy blocked) and fail on mutant (reentrancy succeeds)
  });
});

// Attacker contract to be deployed alongside test contract
contract ReentrancyAttacker {
    MY_BANK public target;
    bool public attackInProgress;

    constructor(address _target) {
        target = MY_BANK(_target);
    }

    function deposit(uint unlockTime) external payable {
        target.Put{value: msg.value}(unlockTime);
    }

    function attack(uint amount) external {
        attackInProgress = true;
        target.Collect(amount);
        attackInProgress = false;
    }

    receive() external payable {
        if (attackInProgress) {
            // Try to re-enter Collect - this should be blocked by nonReentrant modifier
            // In mutant, this will succeed and drain the contract
            target.Collect(msg.value);
        }
    }
}