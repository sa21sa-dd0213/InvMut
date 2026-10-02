import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant kill test - m5037c91b", function () {
  it("should allow CashOut of exact full balance in original but fail in mutant (where <= changed to <)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by Private_Bank constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deposit exactly 1 ether (MinDeposit is 1 ether, so msg.value > MinDeposit must be true)
    // Actually MinDeposit = 1 ether, so we need > 1 ether to pass the deposit condition
    // Let's deposit 2 ether to have a balance to withdraw
    const depositAmount = ethers.parseEther("2");
    await bank.connect(user).Deposit({ value: depositAmount });

    // Check balance is 2 ether
    expect(await bank.balances(user.address)).to.equal(depositAmount);

    // Attempt to withdraw the EXACT full balance (2 ether)
    // Original allows this (<=), mutant will revert (<)
    const tx = bank.connect(user).CashOut(depositAmount);

    // This transaction should succeed on original but fail on mutant
    // We expect it to revert because the mutant uses < instead of <=
    await expect(tx).to.be.reverted;
  });
});