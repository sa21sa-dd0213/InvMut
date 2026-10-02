import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m23e7a17d test", function () {
  it("should kill mutant by proving timestamp logic inversion", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor arg for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const depositAmount = ethers.parseEther("2");
    const minSum = await bank.MinSum();

    // Set unlock time 1 hour in the future
    const currentTime = await ethers.provider.getBlock("latest").then(b => b!.timestamp);
    const futureUnlockTime = currentTime + 3600;

    // Deposit funds
    await bank.connect(user).Put(futureUnlockTime, { value: depositAmount });

    // Verify balance was recorded
    let holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);

    // Advance time past unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureUnlockTime + 1]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect - should succeed on original, fail on mutant
    // because mutant requires block.timestamp < unlockTime instead of >
    const collectAmount = depositAmount;
    const tx = bank.connect(user).Collect(collectAmount);

    // Original would succeed, mutant should revert because condition is inverted
    await expect(tx).to.be.reverted;
  });
});