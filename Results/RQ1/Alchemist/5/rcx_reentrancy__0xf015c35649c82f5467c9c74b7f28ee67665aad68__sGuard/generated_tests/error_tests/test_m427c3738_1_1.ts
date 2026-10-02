import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m427c3738 test", function () {
  it("should revert when Collect is called before unlock time with sufficient balance (kills mutant that changed && to ||)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Fund addr1 with enough ether to put and have sufficient balance
    // First, put some ether into the bank for addr1
    const putAmount = ethers.parseEther("2.0");
    const unlockTime = Math.floor(Date.now() / 1000) + 10000; // Far in the future

    await bank.connect(addr1).Put(unlockTime, { value: putAmount });

    // Now try to collect 1 ether before unlock time (should fail in original)
    const collectAmount = ethers.parseEther("1.0");

    // In original: condition requires (balance>=MinSum && balance>=_am && time>unlockTime)
    // All true except time condition => should revert
    // In mutant: (balance>=MinSum && balance>=_am || time>unlockTime)
    // First two are true, so OR with false time => still true => would succeed
    // So test expects revert to kill the mutant
    await expect(
      bank.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});