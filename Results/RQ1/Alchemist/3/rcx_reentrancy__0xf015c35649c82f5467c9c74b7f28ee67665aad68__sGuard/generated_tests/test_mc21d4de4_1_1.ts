import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mc21d4de4 test", function () {
  it("should kill mutant by depositing more than MinSum and then collecting", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (needed for MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const bankAddress = await bank.getAddress();
    const MinSum = ethers.parseEther("1");

    // Deposit 2 ether (more than MinSum) from addr1
    const depositAmount = ethers.parseEther("2");
    await bank.connect(addr1).Put(0, { value: depositAmount });

    // Verify balance is 2 ether (greater than MinSum)
    const holder = await bank.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);

    // Try to collect 1 ether - should succeed on original but fail on mutant
    // because mutant requires balance == MinSum instead of balance >= MinSum
    await expect(
      bank.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});