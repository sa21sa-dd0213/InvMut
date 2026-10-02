import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant detection - CashOut always reverts", function () {
  it("should successfully withdraw after deposit on original, but revert on mutant that replaces _veri_ok with false", async function () {
    const [owner] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const depositAmount = ethers.parseEther("2");
    const withdrawAmount = ethers.parseEther("1");

    // Deposit
    const txDeposit = await bank.connect(owner).Deposit({ value: depositAmount });
    await txDeposit.wait();

    // Check balance after deposit
    expect(await bank.balances(owner.address)).to.equal(depositAmount);

    // Withdraw - should succeed on original, will revert on mutant
    const txWithdraw = bank.connect(owner).CashOut(withdrawAmount);
    await expect(txWithdraw).to.not.be.reverted;

    // Verify balance decreased
    expect(await bank.balances(owner.address)).to.equal(depositAmount - withdrawAmount);
  });
});