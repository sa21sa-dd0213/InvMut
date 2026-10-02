import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank - mutant m0c4adb02 test", function () {
  it("should succeed in withdrawing funds when balance is sufficient (kills mutant that replaces condition with false)", async function () {
    const [owner, depositor] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deposit 2 ether (above MinDeposit of 1 ether)
    const depositAmount = ethers.parseEther("2");
    await bank.connect(depositor).Deposit({ value: depositAmount });

    // Verify balance is 2 ether
    expect(await bank.balances(depositor.address)).to.equal(depositAmount);

    // Attempt to withdraw 1 ether (should succeed in original, fail in mutant)
    const withdrawAmount = ethers.parseEther("1");
    await expect(bank.connect(depositor).CashOut(withdrawAmount)).to.not.be.reverted;

    // Verify balance decreased by 1 ether
    expect(await bank.balances(depositor.address)).to.equal(depositAmount - withdrawAmount);
  });
});