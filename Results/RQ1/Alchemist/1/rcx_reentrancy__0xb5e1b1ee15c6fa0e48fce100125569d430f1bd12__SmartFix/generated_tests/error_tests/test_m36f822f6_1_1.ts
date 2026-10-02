import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant m36f822f6 - CashOut with false", function () {
  it("should kill the mutant by expecting successful CashOut to revert", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy Private_Bank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deposit exactly MinDeposit (1 ether) to satisfy the > MinDeposit check
    const depositAmount = ethers.parseEther("1.1");
    await bank.connect(user).Deposit({ value: depositAmount });

    // Verify balance was credited
    expect(await bank.balances(user.address)).to.equal(depositAmount);

    // Attempt to cash out the full amount - should succeed on original, but fail on mutant
    // because the mutant changes if(_veri_ok) to if(false), causing revert
    await expect(
      bank.connect(user).CashOut(depositAmount)
    ).to.be.reverted;

    // Verify balance unchanged (mutant reverts before updating balance)
    expect(await bank.balances(user.address)).to.equal(depositAmount);
  });
});