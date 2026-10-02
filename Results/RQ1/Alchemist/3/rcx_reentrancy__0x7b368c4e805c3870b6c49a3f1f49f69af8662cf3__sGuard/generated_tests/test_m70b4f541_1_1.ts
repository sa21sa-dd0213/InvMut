import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - reentrancy attack", function () {
  it("should detect missing nonReentrant modifier by performing a reentrancy attack on Collect", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with the Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Deploy attacker contract that will perform reentrancy
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await instance.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the attacker contract with ETH
    await attacker.sendTransaction({
      to: await attackerContract.getAddress(),
      value: ethers.parseEther("2")
    });

    // Attacker calls Put to deposit funds and set unlockTime
    await instance.connect(attacker).Put(0, { value: ethers.parseEther("1") });

    // Wait for block.timestamp to pass the unlockTime
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine");

    // Trigger the reentrancy attack
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("1"))
    ).to.be.reverted;

    // Verify that attacker didn't drain more than deposited
    const balance = await ethers.provider.getBalance(await instance.getAddress());
    expect(balance).to.be.gte(ethers.parseEther("1"));
  });
});

// Attacker contract for reentrancy
contract ReentrancyAttacker {
  W_WALLET public target;

  constructor(address _target) {
    target = W_WALLET(_target);
  }

  function attack(uint _amount) external payable {
    target.Collect(_amount);
  }

  receive() external payable {
    if (address(target).balance >= msg.value) {
      target.Collect(msg.value);
    }
  }
}