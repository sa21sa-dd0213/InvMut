import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test mcb4fd229", function () {
  it("should kill mutant by withdrawing amount less than full balance", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const depositAmount = ethers.parseEther("10");
    const withdrawAmount = ethers.parseEther("5");

    // User deposits 10 ether
    await bank.connect(user).Put(0, { value: depositAmount });

    // Verify balance is 10 ether
    const holder = await bank.Acc(await user.getAddress());
    expect(holder.balance).to.equal(depositAmount);

    // Attempt to withdraw 5 ether (less than full balance)
    // On original: should succeed
    // On mutant: should fail because mutant requires acc.balance == _am (5 == 10 is false)
    await expect(
      bank.connect(user).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});