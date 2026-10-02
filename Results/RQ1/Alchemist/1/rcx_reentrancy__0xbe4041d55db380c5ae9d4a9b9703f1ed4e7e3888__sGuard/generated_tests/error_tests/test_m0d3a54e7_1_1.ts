import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m0d3a54e7 - reentrancy test", function () {
  it("should detect removal of nonReentrant_ modifier from Collect function via reentrancy attack", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments)
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();

    // Deploy Log contract (needed by MONEY_BOX)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Initialize the contract
    await (await moneyBox.SetLogFile(await log.getAddress())).wait();
    await (await moneyBox.Initialized()).wait();

    // Set MinSum to 0 so anyone can collect
    await (await moneyBox.SetMinSum(0)).wait();

    // Deploy attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await moneyBox.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the moneyBox with some ether first (owner puts in funds)
    await (await moneyBox.connect(owner).Put(0, { value: ethers.parseEther("10") })).wait();

    // Attacker puts in 1 ether to have balance
    await (await moneyBox.connect(attacker).Put(0, { value: ethers.parseEther("1") })).wait();

    // Now attacker contract initiates the attack
    // It should revert on original (due to nonReentrant_) but succeed on mutant
    await expect(
      attackerContract.connect(attacker).attack(ethers.parseEther("1"))
    ).to.be.reverted;

    // Verify no extra ether was drained (attack failed on original, would succeed on mutant)
    const attackerBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
    expect(attackerBalance).to.equal(0);
  });
});