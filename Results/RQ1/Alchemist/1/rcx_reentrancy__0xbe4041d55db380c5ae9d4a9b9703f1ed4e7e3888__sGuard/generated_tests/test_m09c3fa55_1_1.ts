import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m09c3fa55 test", function () {
  it("should detect the mutant that changed >= to > in Collect condition", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments needed)
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();

    // Deploy Log contract (required for MONEY_BOX to function)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Set MinSum and LogFile, then initialize
    await moneyBox.connect(owner).SetMinSum(ethers.parseEther("1"));
    await moneyBox.connect(owner).SetLogFile(await log.getAddress());
    await moneyBox.connect(owner).Initialized();

    // addr1 deposits exactly 1 ETH with lockTime 0 (immediately available)
    await moneyBox.connect(addr1).Put(0, { value: ethers.parseEther("1") });

    // addr1 tries to collect exactly 1 ETH (balance == _am)
    // Original: acc.balance >= _am (1 >= 1) => true => success
    // Mutant:   acc.balance > _am  (1 > 1) => false => revert
    await expect(
      moneyBox.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // Verify that the balance was NOT decreased (mutant prevented the withdrawal)
    const holder = await moneyBox.Acc(await addr1.getAddress());
    expect(holder.balance).to.equal(ethers.parseEther("1"));
  });
});