import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - m427c3738", function () {
  it("should revert when balance conditions are met but unlock time has not passed (original requires all conditions)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();
    const minSum = await bank.MinSum();

    // Fund the user with exactly MinSum (balance condition met)
    const depositAmount = minSum;
    const unlockTime = (await ethers.provider.getBlock("latest")).timestamp + 1000; // Future unlock time

    // User deposits funds with a future unlock time
    await bank.connect(user).Put(unlockTime, { value: depositAmount });

    // Verify balance is set correctly
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);

    // Now try to collect - balance condition is met (>= MinSum and >= _am) but unlock time is still in the future
    // Original: requires all three conditions with && → should revert
    // Mutant: uses || → would incorrectly allow withdrawal
    await expect(
      bank.connect(user).Collect(depositAmount)
    ).to.be.reverted;
  });
});