import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - ma8f379a1", function () {
  it("should kill mutant by verifying balance deduction after successful Collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Fund user with ether for deposit
    const depositAmount = ethers.parseEther("2");

    // User deposits 2 ether with unlock time in the past (block.timestamp)
    const currentBlock = await ethers.provider.getBlock("latest");
    const pastTime = currentBlock!.timestamp - 100;
    await bank.connect(user).Put(pastTime, { value: depositAmount });

    // Verify initial balance
    let userAccount = await bank.Acc(user.address);
    expect(userAccount.balance).to.equal(depositAmount);

    // Set MinSum to 1 ether (default) - user has enough
    const collectAmount = ethers.parseEther("1");

    // User calls Collect - should succeed and deduct balance
    const tx = await bank.connect(user).Collect(collectAmount);
    const receipt = await tx.wait();

    // Check that balance was deducted (mutant would keep balance unchanged)
    userAccount = await bank.Acc(user.address);
    const expectedBalance = depositAmount - collectAmount;
    expect(userAccount.balance).to.equal(expectedBalance);

    // Additional check: verify log was created (mutant would not add log)
    const logHistory = await log.History(0);
    expect(logHistory.Sender).to.equal(user.address);
    expect(logHistory.Val).to.equal(collectAmount);
  });
});