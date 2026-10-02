import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant ma8f379a1 test", function () {
  it("should detect mutant by verifying balance deduction after successful Collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // User puts 2 ether with unlock time in the past (to allow immediate withdrawal)
    const putAmount = ethers.parseEther("2");
    const pastTime = Math.floor(Date.now() / 1000) - 1000;
    await bank.connect(user).Put(pastTime, { value: putAmount });

    // Verify balance is 2 ether
    const balanceBefore = (await bank.Acc(user.getAddress())).balance;
    expect(balanceBefore).to.equal(putAmount);

    // User calls Collect with 1 ether
    const collectAmount = ethers.parseEther("1");
    await bank.connect(user).Collect(collectAmount);

    // Check balance - in original it should be 1 ether, in mutant it stays 2 ether
    const balanceAfter = (await bank.Acc(user.getAddress())).balance;
    expect(balanceAfter).to.equal(putAmount - collectAmount);
  });
});