import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m5deadd9c test", function () {
  it("should detect the mutant by sending 1 wei and checking balance", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Send exactly 1 wei via Put function
    const tx = await bank.connect(user).Put(0, { value: 1 });
    await tx.wait();

    // Check the user's balance - should be 1 wei in original, 0 wei in mutant
    const holder = await bank.Acc(await user.getAddress());
    expect(holder.balance).to.equal(1);
  });
});