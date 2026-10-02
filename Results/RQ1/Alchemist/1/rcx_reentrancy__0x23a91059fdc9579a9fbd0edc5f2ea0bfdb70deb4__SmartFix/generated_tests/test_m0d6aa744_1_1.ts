import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant detection - CashOut <= vs <", function () {
  it("should allow withdrawing the exact balance (original behavior), but mutant should revert", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy PrivateBank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    const depositAmount = ethers.parseEther("1");

    // Deposit exactly 1 ether
    const depositTx = await bank.connect(owner).Deposit({ value: depositAmount });
    await depositTx.wait();

    // Try to withdraw exactly the same amount (should succeed in original, fail in mutant)
    await expect(
      bank.connect(owner).CashOut(depositAmount)
    ).to.not.be.reverted;

    // Verify balance is now zero
    expect(await bank.balances(owner.address)).to.equal(0);
  });
});