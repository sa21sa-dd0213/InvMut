import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test - ma8f379a1", function () {
  it("should detect mutant that replaces success check with false in Collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // User puts 2 ether with unlock time 0 (immediately available)
    const putAmount = ethers.parseEther("2");
    await bank.connect(user).Put(0, { value: putAmount });

    // Verify initial balance
    let holder = await bank.Acc(await user.getAddress());
    expect(holder.balance).to.equal(putAmount);

    // User calls Collect with 1 ether (valid amount, unlock time already passed)
    const collectAmount = ethers.parseEther("1");
    const tx = await bank.connect(user).Collect(collectAmount);
    await tx.wait();

    // Check balance AFTER Collect - in original it should decrease, in mutant it stays same
    holder = await bank.Acc(await user.getAddress());

    // The mutant fails because balance is NOT deducted (condition always false)
    // In original, balance would be putAmount - collectAmount = 1 ether
    // In mutant, balance remains putAmount = 2 ether
    expect(holder.balance).to.equal(putAmount - collectAmount);

    // Also verify the Log entry was created (original adds entry, mutant doesn't)
    const historyLength = await log.History.length();
    expect(historyLength).to.be.gt(0);

    const lastEntry = await log.History(historyLength - 1n);
    expect(lastEntry.Sender).to.equal(await user.getAddress());
    expect(lastEntry.Val).to.equal(collectAmount);
    expect(lastEntry.Data).to.equal("Collect");
  });
});