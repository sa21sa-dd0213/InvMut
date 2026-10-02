import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant m8bd36bb3 - CashOut revert removed", function () {
  it("should revert CashOut when external call fails (mutant silently continues)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();

    // Deploy PrivateBank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await logContract.getAddress());
    await bank.waitForDeployment();

    // Deploy a contract that cannot receive Ether (no receive/fallback)
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the attacker account with enough Ether
    const depositAmount = ethers.parseEther("2");
    await owner.sendTransaction({
      to: attacker.address,
      value: depositAmount
    });

    // Attacker deposits 2 Ether into the bank
    await bank.connect(attacker).Deposit({ value: depositAmount });

    // Verify initial balance
    expect(await bank.balances(attacker.address)).to.equal(depositAmount);

    // Attempt to cash out to the rejector contract (which will fail silently)
    const cashOutAmount = ethers.parseEther("1");

    // In the mutant, this call will NOT revert even though the transfer fails
    const tx = bank.connect(attacker).CashOut(cashOutAmount);

    // The original contract would revert; the mutant silently continues
    // So we check that the balance was NOT deducted (mutant bug)
    await expect(tx).to.not.be.reverted;

    // Verify the balance is still the same - mutant incorrectly subtracted
    // but the transfer failed, so balance should remain unchanged
    const balanceAfter = await bank.balances(attacker.address);
    expect(balanceAfter).to.equal(depositAmount);

    // Also verify the rejector didn't receive any Ether
    const rejectorBalance = await ethers.provider.getBalance(await rejector.getAddress());
    expect(rejectorBalance).to.equal(0);
  });
});