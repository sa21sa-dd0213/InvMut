import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m260de8c9", function () {
  it("should detect mutant by attempting to withdraw less than balance", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Set MinSum to 1 ether (default)
    const minSum = ethers.parseEther("1");

    // addr1 deposits 2 ether with unlock time in the past
    const depositAmount = ethers.parseEther("2");
    const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    await bank.connect(addr1).Put(pastTime, { value: depositAmount });

    // Verify balance is 2 ether
    const holder = await bank.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // addr1 attempts to withdraw 1 ether (less than their 2 ether balance)
    const withdrawAmount = ethers.parseEther("1");

    // On original: balance(2) >= withdraw(1) => true, withdrawal succeeds
    // On mutant: balance(2) <= withdraw(1) => false, withdrawal fails
    await expect(
      bank.connect(addr1).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});