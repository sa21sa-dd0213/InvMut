import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant m955ece2d detection", function () {
  it("should detect the mutant that subtracts 1 from msg.value in Deposit", async function () {
    const [owner, depositor] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();

    // Deploy PrivateBank with Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await logContract.getAddress());
    await privateBank.waitForDeployment();

    const minDeposit = await privateBank.MinDeposit();
    const depositAmount = minDeposit; // Exactly 1 ether

    // Deposit exactly the minimum amount
    await expect(
      privateBank.connect(depositor).Deposit({ value: depositAmount })
    ).to.not.be.reverted;

    // Try to cash out the full deposit amount
    // In original: balance = depositAmount → should succeed
    // In mutant: balance = depositAmount - 1 → should revert due to insufficient balance
    await expect(
      privateBank.connect(depositor).CashOut(depositAmount)
    ).to.be.reverted;
  });
});