import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant mf634ec97 - CashOut always true", function () {
  it("should revert when CashOut is called by a contract that rejects ETH, but mutant incorrectly succeeds", async function () {
    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy PrivateBank with the Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Deploy a malicious contract that will reject incoming ETH
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the rejector contract so it can deposit
    await ethers.provider.send("hardhat_setBalance", [
      await rejector.getAddress(),
      ethers.parseEther("10").toString()
    ]);

    // Deposit 1 ether from the rejector contract (min deposit is 1 ether)
    await bank.connect(rejector).Deposit({ value: ethers.parseEther("1") });

    // Check balance after deposit
    const balanceAfterDeposit = await bank.balances(await rejector.getAddress());
    expect(balanceAfterDeposit).to.equal(ethers.parseEther("1"));

    // Attempt to cash out - original would revert, mutant might not
    const tx = bank.connect(rejector).CashOut(ethers.parseEther("1"));

    // The mutant will NOT revert (because it uses true instead of _veri_ok)
    // But we expect the original to revert. The test should detect the mutant
    // by checking that the balance was incorrectly deducted despite transfer failure.
    await expect(tx).to.be.reverted;
  });
});