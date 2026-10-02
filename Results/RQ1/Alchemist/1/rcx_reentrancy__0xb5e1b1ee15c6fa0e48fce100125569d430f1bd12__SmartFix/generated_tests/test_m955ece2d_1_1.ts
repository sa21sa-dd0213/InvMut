import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant detection - Deposit off-by-one", function () {
  it("should detect the mutant where Deposit credits msg.value-1 instead of msg.value", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const depositAmount = ethers.parseEther("2"); // More than MinDeposit of 1 ether

    // User deposits 2 ether
    await bank.connect(user).Deposit({ value: depositAmount });

    // Try to withdraw exactly the deposited amount
    // In original: balance should be exactly 2 ether -> withdrawal succeeds
    // In mutant: balance is 2 ether - 1 wei -> withdrawal should revert
    await expect(
      bank.connect(user).CashOut(depositAmount)
    ).to.be.reverted;
  });
});