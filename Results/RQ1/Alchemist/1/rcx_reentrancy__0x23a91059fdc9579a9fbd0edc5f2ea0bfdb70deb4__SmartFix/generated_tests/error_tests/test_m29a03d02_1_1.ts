import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant m29a03d02 - CashOut balance check", function () {
  it("should revert when user tries to withdraw more than their balance (kills mutant that removes check)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy PrivateBank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // User has no balance initially
    const withdrawalAmount = ethers.parseEther("1");

    // Attempt to withdraw without any deposit - should revert
    await expect(
      bank.connect(user).CashOut(withdrawalAmount)
    ).to.be.reverted;
  });

  it("should revert when user tries to withdraw more than deposited balance", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy contracts
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deposit exactly 1 ether (minimum deposit)
    const depositAmount = ethers.parseEther("1");
    await bank.connect(user).Deposit({ value: depositAmount });

    // Try to withdraw 2 ether (more than deposited)
    const excessiveWithdrawal = ethers.parseEther("2");

    // This should revert on original contract, but succeed on mutant (killing it)
    await expect(
      bank.connect(user).CashOut(excessiveWithdrawal)
    ).to.be.reverted;
  });
});