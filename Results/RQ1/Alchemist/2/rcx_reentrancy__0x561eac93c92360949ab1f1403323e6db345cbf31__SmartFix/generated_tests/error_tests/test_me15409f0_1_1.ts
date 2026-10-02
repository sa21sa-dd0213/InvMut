import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test", function () {
  it("should kill mutant by attempting partial withdrawal (mutant requires exact balance match)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy BANK_SAFE (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const bank = await Factory.deploy();
    await bank.waitForDeployment();

    // Deploy LogFile (needed for Deposit and Collect)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Set MinSum to 0 so any balance meets the minimum
    await bank.SetMinSum(0);

    // Set the LogFile address
    await bank.SetLogFile(await logFile.getAddress());

    // Initialize the contract (required before deposits/withdrawals)
    await bank.Initialized();

    // User deposits 100 wei
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    await bank.connect(user).Deposit({ value: depositAmount });

    // Verify balance is 100 wei
    expect(await bank.balances(user.address)).to.equal(depositAmount);

    // Attempt partial withdrawal of 50 wei (should succeed on original, fail on mutant)
    const partialWithdraw = ethers.parseEther("0.00000000000000005"); // 50 wei
    await expect(
      bank.connect(user).Collect(partialWithdraw)
    ).to.be.reverted;
  });
});