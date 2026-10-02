import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - kill mutant mc81ba198", function () {
  it("should revert when calling Collect with amount greater than balance or before unlock time, but mutant allows it", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // User deposits 1 ether
    const depositAmount = ethers.parseEther("1");
    await bank.connect(user).Put(0, { value: depositAmount });

    // Verify user's balance
    const userAccount = await bank.Acc(user.address);
    expect(userAccount.balance).to.equal(depositAmount);

    // Try to collect more than balance (should revert in original, succeed in mutant)
    const collectAmount = ethers.parseEther("2");

    // In original: reverts because balance (1 ether) < MinSum (1 ether) for _am > balance
    // In mutant: succeeds because condition is always true
    await expect(
      bank.connect(user).Collect(collectAmount)
    ).to.be.reverted;

    // Verify that after the failed call, balance remains unchanged
    const balanceAfter = await bank.Acc(user.address);
    expect(balanceAfter.balance).to.equal(depositAmount);
  });
});