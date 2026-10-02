import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test - m6c94bbbf", function () {
  it("should kill mutant by showing Collect succeeds before unlockTime when balance is sufficient (OR vs AND bug)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contracts - PENNY_BY_PENNY has no constructor arguments
    const PennyFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const penny = await PennyFactory.deploy();
    await penny.waitForDeployment();

    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Initialize the contract
    await penny.connect(owner).SetLogFile(await log.getAddress());
    await penny.connect(owner).SetMinSum(ethers.parseEther("1"));
    await penny.connect(owner).Initialized();

    // addr1 puts 2 ETH with lock time of 1000 seconds
    const putAmount = ethers.parseEther("2");
    const lockTime = 1000;
    await penny.connect(addr1).Put(lockTime, { value: putAmount });

    // Try to collect 1 ETH BEFORE unlockTime - should revert in original
    // but succeed in mutant due to OR operator (balance conditions are met)
    const collectAmount = ethers.parseEther("1");

    // Current timestamp is far less than unlockTime
    await expect(
      penny.connect(addr1).Collect(collectAmount)
    ).to.not.be.reverted; // In mutant this succeeds, killing it

    // Verify balance was deducted in mutant (proving the bug)
    const acc = await penny.Acc(addr1.address);
    expect(acc.balance).to.equal(ethers.parseEther("1"));
  });
});